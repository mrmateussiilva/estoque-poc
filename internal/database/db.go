package database

import (
	"estoque/internal/models"
	"log/slog"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn), // Alterado de Info para Warn (mostra apenas avisos e erros)
	})
	if err != nil {
		return nil, err
	}

	DB = db

	// AutoMigrate irá criar as tabelas baseadas nas structs se elas não existirem
	err = db.AutoMigrate(
		&models.Category{},
		&models.Supplier{},
		&models.Product{},
		&models.Stock{},
		&models.User{},
		&models.Movement{},
		&models.ProcessedNFe{},
	)
	if err != nil {
		slog.Error("Failed to auto-migrate database", "error", err)
		return nil, err
	}

	seedUser(db)
	seedCategories(db)

	return db, nil
}

func seedUser(db *gorm.DB) {
	var count int64
	db.Model(&models.User{}).Count(&count)

	if count == 0 {
		hashed, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err != nil {
			slog.Error("Failed to hash default password", "error", err)
			return
		}
		
		admin := models.User{
			Name:     stringPtr("Administrador"),
			Email:    "admin@sge.com",
			Password: string(hashed),
			Role:     "ADMIN",
			Active:   true,
		}
		db.Create(&admin)
		slog.Info("Default user created", "email", "admin@sge.com")
	}
}

func seedCategories(db *gorm.DB) {
	var count int64
	db.Model(&models.Category{}).Count(&count)

	if count == 0 {
		categories := []models.Category{
			{Name: "Eletrônicos"},
			{Name: "Informática"},
			{Name: "Escritório"},
			{Name: "Ferramentas"},
			{Name: "Outros"},
		}
		db.Create(&categories)
		slog.Info("Default categories created", "count", len(categories))
	}
}

func stringPtr(s string) *string {
	return &s
}
