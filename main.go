package main

import (
	"estoque/internal/api"
	"estoque/internal/database"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
)

func main() {
	// Carregar variáveis de ambiente do arquivo .env
	godotenv.Load()

	// 1. Configuração do Logger Estruturado (JSON para produção)
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug})
	slog.SetDefault(slog.New(handler))

	// 2. Inicialização do Banco de Dados e Migrações
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
		// Fallback para desenvolvimento ou se preferir DSN direto
		dsn = "root:root@tcp(localhost:3306)/estoque?parseTime=true"
	}

	db, err := database.InitDB(dsn)
	if err != nil {
		slog.Error("Failed to initialize database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	// 3. Inicialização dos Handlers com Injeção de Dependência
	h := api.NewHandler(db)

	// 4. Setup de Rotas e Middleware (net/http nativo)
	mux := http.NewServeMux()

	// Servir frontend estático
	mux.Handle("/", http.FileServer(http.Dir("./static")))

	// ===== Rotas Públicas =====
	mux.HandleFunc("/login", api.LoggingMiddleware(api.CorsMiddleware(h.LoginHandler)))

	// ===== Rotas Protegidas - NF-e =====
	mux.HandleFunc("/nfe/upload", api.LoggingMiddleware(api.CorsMiddleware(api.AuthMiddleware(h.UploadHandler))))
	mux.HandleFunc("/api/nfes", api.LoggingMiddleware(api.CorsMiddleware(api.AuthMiddleware(h.ListNFesHandler))))

	// ===== Rotas Protegidas - Estoque =====
	mux.HandleFunc("/stock", api.LoggingMiddleware(api.CorsMiddleware(api.AuthMiddleware(h.StockHandler))))
	mux.HandleFunc("/api/products", api.LoggingMiddleware(api.CorsMiddleware(api.AuthMiddleware(h.ListProductsHandler))))
	mux.HandleFunc("/api/products/", api.LoggingMiddleware(api.CorsMiddleware(api.AuthMiddleware(h.UpdateProductHandler))))

	// ===== Rotas Protegidas - Movimentações =====
	mux.HandleFunc("/api/movements", api.LoggingMiddleware(api.CorsMiddleware(api.AuthMiddleware(h.CreateMovementHandler))))
	mux.HandleFunc("/api/movements/list", api.LoggingMiddleware(api.CorsMiddleware(api.AuthMiddleware(h.ListMovementsHandler))))

	// ===== Rotas Protegidas - Dashboard =====
	mux.HandleFunc("/api/dashboard/stats", api.LoggingMiddleware(api.CorsMiddleware(api.AuthMiddleware(h.DashboardStatsHandler))))
	mux.HandleFunc("/api/dashboard/evolution", api.LoggingMiddleware(api.CorsMiddleware(api.AuthMiddleware(h.StockEvolutionHandler))))

	// ===== Rotas Protegidas - Categorias =====
	mux.HandleFunc("/api/categories", api.LoggingMiddleware(api.CorsMiddleware(api.AuthMiddleware(h.ListCategoriesHandler))))

	// 5. Configuração e Inicialização do Servidor
	port := os.Getenv("PORT")
	if port == "" {
		port = "8003"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  30 * time.Second,
	}

	slog.Info("S.G.E. Backend is running", "port", port, "mode", "production")

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("Server critical failure", "error", err)
		os.Exit(1)
	}
}
