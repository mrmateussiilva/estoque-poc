package api

import (
	"estoque/internal/models"
	"net/http"
)

// ListAuditLogsHandler retorna a lista de logs de auditoria com paginação
func (h *Handler) ListAuditLogsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Método não permitido")
		return
	}

	params := ParsePaginationParams(r)
	offset := (params.Page - 1) * params.Limit

	db := h.DB.Model(&models.AuditLog{}).Order("created_at DESC")

	// Preload User para mostrar quem fez o quê
	db = db.Preload("User")

	// Contar total para paginação
	var total int64
	if err := db.Count(&total).Error; err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao buscar logs", err), "Erro ao buscar logs")
		return
	}

	// Buscar dados
	var logs []models.AuditLog
	if err := db.Offset(offset).Limit(params.Limit).Find(&logs).Error; err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao buscar logs", err), "Erro ao buscar logs")
		return
	}

	response := NewPaginatedResponse(logs, total, params)
	RespondWithJSON(w, http.StatusOK, response)
}
