package models

import (
	"time"

	"gorm.io/gorm"
)

// AuditLog registra todas as alterações importantes no sistema
type AuditLog struct {
	ID          int32     `gorm:"primaryKey;type:int" json:"id"`
	UserID      *int32    `gorm:"type:int" json:"user_id,omitempty"`
	User        *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Action      string    `gorm:"size:50;not null" json:"action"` // CREATE, UPDATE, DELETE, LOGIN, etc.
	EntityType  string    `gorm:"size:50;not null" json:"entity_type"` // product, movement, user, category, etc.
	EntityID    string    `gorm:"size:255" json:"entity_id"` // ID do registro alterado
	Description string    `gorm:"type:text" json:"description"` // Descrição da ação
	OldValues   *string   `gorm:"type:text" json:"old_values,omitempty"` // Valores antigos (JSON armazenado como TEXT)
	NewValues   *string   `gorm:"type:text" json:"new_values,omitempty"` // Valores novos (JSON armazenado como TEXT)
	IPAddress   *string   `gorm:"size:45" json:"ip_address,omitempty"` // IP do cliente
	UserAgent   *string   `gorm:"type:text" json:"user_agent,omitempty"` // User agent do navegador
	CreatedAt   time.Time `json:"created_at"`
}

func (AuditLog) TableName() string {
	return "audit_logs"
}

// LogAction registra uma ação no audit log
func LogAction(db *gorm.DB, userID *int32, action, entityType, entityID, description string, oldValues, newValues *string) error {
	log := AuditLog{
		UserID:      userID,
		Action:      action,
		EntityType:  entityType,
		EntityID:    entityID,
		Description: description,
		OldValues:   oldValues,
		NewValues:   newValues,
	}
	return db.Create(&log).Error
}
