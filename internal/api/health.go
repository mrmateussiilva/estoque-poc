package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"
)

// HealthResponse representa a resposta detalhada do health check
type HealthResponse struct {
	Status    string    `json:"status"`
	Version   string    `json:"version"`
	Timestamp time.Time `json:"timestamp"`
	Database  string    `json:"database"`
	Uptime    string    `json:"uptime"`
}

var startTime = time.Now()

// FullHealthHandler verifica a saúde do sistema de ponta a ponta
func (h *Handler) FullHealthHandler(w http.ResponseWriter, r *http.Request) {
	status := "ok"
	dbStatus := "connected"

	// 1. Verificar conexão com o banco
	sqlDB, err := h.DB.DB()
	if err != nil {
		slog.Error("Health check: failed to get sql.DB", "error", err)
		status = "error"
		dbStatus = "disconnected"
	} else if err := sqlDB.Ping(); err != nil {
		slog.Error("Health check: database ping failed", "error", err)
		status = "error"
		dbStatus = "disconnected"
	}

	response := HealthResponse{
		Status:    status,
		Version:   "1.1.5", // Versão atualizada
		Timestamp: time.Now(),
		Database:  dbStatus,
		Uptime:    time.Since(startTime).String(),
	}

	w.Header().Set("Content-Type", "application/json")
	if status != "ok" {
		w.WriteHeader(http.StatusServiceUnavailable)
	} else {
		w.WriteHeader(http.StatusOK)
	}

	json.NewEncoder(w).Encode(response)
}
