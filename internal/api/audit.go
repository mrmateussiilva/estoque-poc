package api

import (
	"encoding/json"
	"estoque/internal/models"
	"log/slog"
	"net/http"
	"strings"

	"gorm.io/gorm"
)

// LogAuditAction registra uma ação no audit log
func LogAuditAction(db *gorm.DB, r *http.Request, userID *int32, action, entityType, entityID, description string, oldValues, newValues interface{}) {
	// Extrair IP e User Agent
	ipAddress := r.RemoteAddr
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		ipAddress = strings.Split(forwarded, ",")[0]
	}
	userAgent := r.Header.Get("User-Agent")

	// Converter valores para JSON
	var oldValuesJSON, newValuesJSON *string
	if oldValues != nil {
		if data, err := json.Marshal(oldValues); err == nil {
			s := string(data)
			oldValuesJSON = &s
		}
	}
	if newValues != nil {
		if data, err := json.Marshal(newValues); err == nil {
			s := string(data)
			newValuesJSON = &s
		}
	}

	// Criar log de auditoria
	log := models.AuditLog{
		UserID:      userID,
		Action:      action,
		EntityType:  entityType,
		EntityID:    entityID,
		Description: description,
		OldValues:   oldValuesJSON,
		NewValues:   newValuesJSON,
		IPAddress:   &ipAddress,
		UserAgent:   &userAgent,
	}

	if err := db.Create(&log).Error; err != nil {
		slog.Warn("Erro ao registrar audit log", "error", err, "action", action)
	}
}
