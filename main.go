package main

import (
	"context"
	"encoding/json"
	"estoque/internal/api"
	"estoque/internal/database"
	"estoque/internal/services/nfe_consumer"
	"estoque/internal/services/worker_pools"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
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

	// 4. Inicialização dos Worker Pools
	nfeWorkers := 5 // Configurável via env
	if nfeWorkersStr := os.Getenv("NFE_WORKERS"); nfeWorkersStr != "" {
		if n, err := strconv.Atoi(nfeWorkersStr); err == nil && n > 0 {
			nfeWorkers = n
		}
	}

	exportWorkers := 3 // Configurável via env
	if exportWorkersStr := os.Getenv("EXPORT_WORKERS"); exportWorkersStr != "" {
		if n, err := strconv.Atoi(exportWorkersStr); err == nil && n > 0 {
			exportWorkers = n
		}
	}

	exportDir := os.Getenv("EXPORT_DIR")
	if exportDir == "" {
		exportDir = "./exports"
	}

	// Criar worker pools
	nfePool := worker_pools.NewNFeWorkerPool(nfeWorkers, db)
	exportPool := worker_pools.NewExportWorkerPool(exportWorkers, db, exportDir)

	// Iniciar worker pools
	nfePool.Start()
	exportPool.Start()

	// 5. Inicialização dos Handlers e Serviços
	h := api.NewHandler(db, nfePool, exportPool)

	// Iniciar Consumidor de e-mails de NF-e em background
	nfeConsumer := nfe_consumer.NewConsumer(db, nfePool)
	go nfeConsumer.Start(context.Background())

	// 6. Setup de Rotas com Chi
	r := chi.NewRouter()

	// Middlewares Globais
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(api.LoggerMiddleware)
	r.Use(middleware.Recoverer)
	// r.Use(middleware.Timeout(60 * time.Second)) // Removido globalmente para não derrubar SSE

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

	// Handler global para OPTIONS (CORS Preflight) - DEVE estar ANTES de qualquer rota
	// Isso garante que requisições OPTIONS sejam tratadas antes de qualquer middleware
	r.Options("/*", func(w http.ResponseWriter, r *http.Request) {
		// O middleware CORS já adiciona os headers necessários
		// Este handler apenas garante que a requisição seja processada
		w.WriteHeader(http.StatusNoContent)
	})

	// API Routes
	r.Route("/api", func(r chi.Router) {
		// Public Routes
		// Health check (sem autenticação)
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]string{"status": "ok", "version": "1.1.0"})
		})

		// Handler explícito para OPTIONS dentro de /api também
		r.Options("/*", func(w http.ResponseWriter, r *http.Request) {
			// O middleware CORS já adiciona os headers necessários
			// Este handler apenas garante que a requisição seja processada
			w.WriteHeader(http.StatusNoContent)
		})

		// Rate limiting no login: 5 tentativas por minuto por IP
		r.With(httprate.LimitByIP(5, 1*time.Minute)).Post("/login", h.LoginHandler)

		// Protected Routes
		r.Group(func(r chi.Router) {
			r.Use(api.AuthMiddleware(db))
			// Aplicar timeout apenas para rotas que NÃO são de streaming
			r.Use(middleware.Timeout(60 * time.Second))
			// Rate limiting geral: 100 requisições por minuto por IP
			r.Use(httprate.LimitByIP(100, 1*time.Minute))

			// NF-e
			r.Post("/nfe/upload", h.UploadHandler)
			r.Get("/nfes", h.ListNFesHandler)
			r.Post("/nfes/{accessKey}/process", h.ProcessNfeHandler)

			// Rotas de Streaming (Sem o middleware de timeout acima)
			r.Group(func(r chi.Router) {
				r.Use(api.AuthMiddleware(db))
				r.Get("/notifications/stream", h.StreamNotificationsHandler)
			})

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

				// Configurações de Sistema
				r.Get("/config/email", h.GetEmailConfigHandler)
				r.Put("/config/email", h.UpdateEmailConfigHandler)
				r.Post("/config/email/test", h.TestEmailConnectionHandler)
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
		WriteTimeout: 0, // 0 significa sem timeout (necessário para SSE)
		IdleTimeout:  60 * time.Second,
	}

	slog.Info("S.G.E. Backend Modernized is running",
		"port", port,
		"version", "1.1.3",
		"nfe_workers", nfeWorkers,
		"export_workers", exportWorkers,
	)

	// Canal para sinais do sistema (graceful shutdown)
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	// Servidor em goroutine
	serverErr := make(chan error, 1)
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			serverErr <- err
		}
	}()

	// Aguardar sinal de shutdown ou erro do servidor
	select {
	case err := <-serverErr:
		slog.Error("Server critical failure", "error", err)
		os.Exit(1)
	case sig := <-sigChan:
		slog.Info("Received shutdown signal", "signal", sig.String())
		slog.Info("Shutting down gracefully...")

		// Context com timeout para shutdown (30 segundos)
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		// Parar worker pools
		slog.Info("Stopping worker pools...")
		nfePool.Stop()
		exportPool.Stop()

		// Parar consumidor de e-mails (se tiver método Stop)
		// nfeConsumer.Stop(shutdownCtx)

		// Shutdown do servidor HTTP
		if err := srv.Shutdown(shutdownCtx); err != nil {
			slog.Error("Server shutdown error", "error", err)
		} else {
			slog.Info("Server stopped gracefully")
		}
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
		dsn = fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&loc=Local&interpolateParams=true&timeout=5s&readTimeout=10s&writeTimeout=10s", dbUser, dbPass, dbHost, dbPort, dbName)
	}

	if dsn == "" {
		dsn = "root:root@tcp(localhost:3306)/estoque?parseTime=true&loc=Local&timeout=5s"
	}
	return dsn
}
