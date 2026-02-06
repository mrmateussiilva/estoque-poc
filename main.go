package main

import (
	"estoque/internal/api"
	"estoque/internal/database"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
)

func main() {
	// Carregar variáveis de ambiente (opcional em produção/docker)
	_ = godotenv.Load()

	// 1. Configuração do Logger Estruturado
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug})
	slog.SetDefault(slog.New(handler))

	// 2. Inicialização do Banco de Dados (GORM)
	dsn := getDSN()
	db, err := database.InitDB(dsn)
	if err != nil {
		slog.Error("Failed to initialize database", "error", err)
		os.Exit(1)
	}

	// 3. Inicialização dos Handlers
	h := api.NewHandler(db)

	// 4. Setup de Rotas com Chi
	r := chi.NewRouter()

	// Middlewares Globais
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// CORS Configuration
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// API Routes
	r.Route("/api", func(r chi.Router) {
		// Public Routes
		r.Post("/login", h.LoginHandler)

		// Protected Routes
		r.Group(func(r chi.Router) {
			r.Use(api.AuthMiddleware)

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

			// Dashboard
			r.Get("/dashboard/stats", h.DashboardStatsHandler)
			r.Get("/dashboard/evolution", h.StockEvolutionHandler)

			// Categories
			r.Get("/categories", h.CategoriesHandler)
			r.Post("/categories", h.CategoriesHandler)
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

	// 5. Configuração e Inicialização do Servidor
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

	slog.Info("S.G.E. Backend Modernized is running", "port", port)

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
