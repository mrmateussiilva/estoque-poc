package main

import (
	"context"
	"encoding/json"
	"estoque/internal/api"
	"estoque/internal/database"
	"estoque/internal/services/nfe_consumer"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"github.com/joho/godotenv"
)

func main() {
	// Carregar variáveis de ambiente (opcional em produção/docker)
	_ = godotenv.Load()

	// 1. Configuração do Logger Estruturado
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug})
	slog.SetDefault(slog.New(handler))

	// 2. Inicialização do JWT Secret
	if err := api.InitJwtSecret(); err != nil {
		slog.Error("Failed to initialize JWT secret", "error", err)
		os.Exit(1)
	}

	// 3. Inicialização do Banco de Dados (GORM)
	dsn := getDSN()
	
	// Garantir que a pasta static existe (mesmo vazia) para evitar erros de stat
	_ = os.MkdirAll("./static", 0755)

	db, err := database.InitDB(dsn)
	if err != nil {
		slog.Error("Failed to initialize database", "error", err)
		os.Exit(1)
	}

	// 4. Inicialização dos Handlers e Serviços
	h := api.NewHandler(db)

	// Iniciar Consumidor de e-mails de NF-e em background
	nfeConsumer := nfe_consumer.NewConsumer(db)
	go nfeConsumer.Start(context.Background())

	// 6. Setup de Rotas com Chi
	r := chi.NewRouter()

	// Middlewares Globais
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// CORS Configuration
	// IMPORTANTE: CORS deve estar ANTES de qualquer middleware que possa bloquear OPTIONS
	corsMiddleware := cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://sge.finderbit.com.br", "http://localhost:5173", "http://localhost:3000", "http://localhost:8003"}, // Origens permitidas
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Requested-With"},
		ExposedHeaders:   []string{"Link", "Content-Disposition"},
		AllowCredentials: true,
		MaxAge:           300,
		// Permitir todas as origens em desenvolvimento (não usar em produção)
		// Debug: true,
	})
	r.Use(corsMiddleware)

	// API Routes
	r.Route("/api", func(r chi.Router) {
		// Public Routes
		// Rate limiting no login: 5 tentativas por minuto por IP
		r.With(httprate.LimitByIP(5, 1*time.Minute)).Post("/login", h.LoginHandler)
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]string{"status": "ok", "version": "1.1.0"})
		})

		// Protected Routes
		r.Group(func(r chi.Router) {
			r.Use(api.AuthMiddleware(db))
			// Rate limiting geral: 100 requisições por minuto por IP
			r.Use(httprate.LimitByIP(100, 1*time.Minute))

			// NF-e
			r.Post("/nfe/upload", h.UploadHandler)
			r.Get("/nfes", h.ListNFesHandler)

			// Products & Stock
			r.Get("/products", h.ListProductsHandler)
			r.Put("/products/{code}", h.UpdateProductHandler)
			r.Get("/stock", h.StockHandler)

			// Movements
			r.Post("/movements", h.CreateMovementHandler)
			r.Get("/movements/list", h.ListMovementsHandler)
			r.Get("/reports/movements", h.GetMovementsReport)
			r.Get("/export/movements", h.ExportMovementsHandler)

			// Export
			r.Get("/export/stock", h.ExportStockHandler)

			// Dashboard
			r.Get("/dashboard/stats", h.DashboardStatsHandler)
			r.Get("/dashboard/evolution", h.StockEvolutionHandler)

			// Categories
			r.Get("/categories", h.CategoriesHandler)
			r.Post("/categories", h.CategoriesHandler)
			r.Put("/categories/{id}", h.CategoriesHandler)
			r.Delete("/categories/{id}", h.CategoriesHandler)

			// Users (Admin Only)
			r.Group(func(r chi.Router) {
				r.Use(api.RoleMiddleware("ADMIN"))
				r.Get("/users", h.ListUsersHandler)
				r.Post("/users", h.CreateUserHandler)
				r.Put("/users/{id}", h.UpdateUserHandler)
				r.Delete("/users/{id}", h.DeleteUserHandler)
			})
		})
	})

	// Servir frontend estático com fallback para SPA (index.html)
	staticDir := "./static"
	fileServer := http.FileServer(http.Dir(staticDir))
	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		// Se não existe o arquivo físico, serve index.html (rota do React)
		if _, err := os.Stat(staticDir + path); os.IsNotExist(err) {
			http.ServeFile(w, r, staticDir+"/index.html")
			return
		}
		fileServer.ServeHTTP(w, r)
	})

	// 7. Configuração e Inicialização do Servidor
	port := os.Getenv("PORT")
	if port == "" {
		port = "8003"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	slog.Info("S.G.E. Backend Modernized is running", "port", port, "version", "1.1.3")

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("Server critical failure", "error", err)
		os.Exit(1)
	}
}

func getDSN() string {
	dbUser := os.Getenv("DB_USER")
	dbPass := os.Getenv("DB_PASS")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" && dbUser != "" {
		if dbPort == "" {
			dbPort = "3306"
		}
		dsn = fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", dbUser, dbPass, dbHost, dbPort, dbName)
	}

	if dsn == "" {
		dsn = "root:root@tcp(localhost:3306)/estoque?parseTime=true"
	}
	return dsn
}
