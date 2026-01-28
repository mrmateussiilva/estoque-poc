package main

import (
	"estoque/internal/api"
	"estoque/internal/database"
	"log/slog"
	"net/http"
	"os"
	"time"
)

func main() {
	// 1. Configuração do Logger Estruturado (JSON para produção)
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug})
	slog.SetDefault(slog.New(handler))

	// 2. Inicialização do Banco de Dados e Migrações
	db, err := database.InitDB("./estoque.db")
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

	// Endpoints da API com encadeamento de middlewares
	mux.HandleFunc("/login", api.LoggingMiddleware(api.CorsMiddleware(h.LoginHandler)))
	mux.HandleFunc("/nfe/upload", api.LoggingMiddleware(api.CorsMiddleware(api.AuthMiddleware(h.UploadHandler))))
	mux.HandleFunc("/stock", api.LoggingMiddleware(api.CorsMiddleware(api.AuthMiddleware(h.StockHandler))))

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
