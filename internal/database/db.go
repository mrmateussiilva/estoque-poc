package database

import (
	"estoque/internal/models"
	"fmt"
	"log/slog"
	"os"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger:      logger.Default.LogMode(logger.Warn),
		PrepareStmt: true, // Cache prepared statements for better performance
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err == nil {
		// Configuração do Pool de Conexões para Estabilidade
		sqlDB.SetMaxOpenConns(25)
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetConnMaxLifetime(5 * time.Minute)
		sqlDB.SetConnMaxIdleTime(2 * time.Minute)
	}

	DB = db

	// Só rodar migrations e seeds se RUN_MIGRATIONS for "true" ou se estivermos em ambiente de desenvolvimento
	runMigrations := os.Getenv("RUN_MIGRATIONS") == "true"
	env := os.Getenv("ENV")

	if runMigrations || env != "production" {
		slog.Info("Running database migrations and seeds...")
		// AutoMigrate irá criar as tabelas baseadas nas structs se elas não existirem
		err = db.AutoMigrate(
			&models.Category{},
			&models.Supplier{},
			&models.Product{},
			&models.Stock{},
			&models.User{},
			&models.Movement{},
			&models.ProcessedNFe{},
			&models.AuditLog{},
			&models.EmailConfig{},
		)
		if err != nil {
			slog.Error("Failed to auto-migrate database", "error", err)
			return nil, err
		}

		// Criar índices para melhorar performance
		createIndexes(db)

		seedUser(db)
		seedCategories(db)
	} else {
		slog.Info("Database migrations skipped (production mode without RUN_MIGRATIONS=true)")
	}

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

// createIndexes cria índices para melhorar performance das queries
// MySQL 5.6 não suporta "IF NOT EXISTS", então verificamos se o índice existe antes de criar
func createIndexes(db *gorm.DB) {
	indexes := []struct {
		name    string
		table   string
		columns string
		unique  bool
	}{
		{"idx_movements_product_code", "movements", "product_code", false},
		{"idx_movements_created_at", "movements", "created_at", false},
		{"idx_movements_type", "movements", "type", false},
		{"idx_movements_user_id", "movements", "user_id", false},
		{"idx_products_category_id", "products", "category_id", false},
		{"idx_products_active", "products", "active", false},
		{"idx_products_name", "products", "name", false},
		{"idx_products_active_name", "products", "active, name", false},
	}

	for _, idx := range indexes {
		// Verificar se o índice já existe
		var count int64
		db.Raw(`
			SELECT COUNT(*) FROM information_schema.statistics 
			WHERE table_schema = DATABASE() 
			AND table_name = ? 
			AND index_name = ?
		`, idx.table, idx.name).Scan(&count)

		if count > 0 {
			// Índice já existe, pular
			continue
		}

		// Criar índice (MySQL 5.6 não suporta IF NOT EXISTS)
		uniqueClause := ""
		if idx.unique {
			uniqueClause = "UNIQUE "
		}

		sql := fmt.Sprintf("CREATE %sINDEX %s ON %s(%s)", uniqueClause, idx.name, idx.table, idx.columns)
		if err := db.Exec(sql).Error; err != nil {
			slog.Warn("Failed to create index", "index", idx.name, "error", err)
		} else {
			slog.Debug("Index created", "index", idx.name)
		}
	}

	slog.Info("Database indexes created successfully")
}

func GetMovementsReportData(db *gorm.DB, startDate, endDate time.Time) (models.FullReportResponse, error) {
	var report models.FullReportResponse

	// 1. Fetch Detailed Movements (for the list)
	if err := db.Where("movements.created_at BETWEEN ? AND ?", startDate, endDate).
		Preload("Product").
		Preload("User").
		Order("movements.created_at ASC").
		Find(&report.DetailedMovements).Error; err != nil {
		return report, err
	}

	// 2. Calculate Summary using SQL Aggregation
	// This is much faster than iterating over a large slice in Go
	err := db.Raw(`
		SELECT 
			COALESCE(SUM(CASE WHEN m.type = 'ENTRADA' THEN m.quantity ELSE 0 END), 0) as total_entries_quantity,
			COALESCE(SUM(CASE WHEN m.type = 'ENTRADA' THEN m.quantity * p.cost_price ELSE 0 END), 0) as total_entries_value,
			COALESCE(SUM(CASE WHEN m.type = 'SAIDA' THEN m.quantity ELSE 0 END), 0) as total_exits_quantity,
			COALESCE(SUM(CASE WHEN m.type = 'SAIDA' THEN m.quantity * p.sale_price ELSE 0 END), 0) as total_exits_value,
			COUNT(*) as total_movements,
			COUNT(DISTINCT m.product_code) as unique_products
		FROM movements m
		JOIN products p ON m.product_code = p.code
		WHERE m.created_at BETWEEN ? AND ?
	`, startDate, endDate).Scan(&report.Summary).Error
	if err != nil {
		return report, err
	}

	report.Summary.NetQuantity = report.Summary.TotalEntriesQuantity - report.Summary.TotalExitsQuantity
	report.Summary.NetValue = report.Summary.TotalEntriesValue - report.Summary.TotalExitsValue

	// 3. Calculate Timeline using SQL Group By
	// Note: GORM/SQL scanning into struct with custom names requires manual field mapping or raw scanning
	type timelineRow struct {
		Date         time.Time
		Entries      float64
		Exits        float64
		EntriesValue float64
		ExitsValue   float64
	}
	var rows []timelineRow
	err = db.Raw(`
		SELECT 
			DATE(m.created_at) as date,
			COALESCE(SUM(CASE WHEN m.type = 'ENTRADA' THEN m.quantity ELSE 0 END), 0) as entries,
			COALESCE(SUM(CASE WHEN m.type = 'SAIDA' THEN m.quantity ELSE 0 END), 0) as exits,
			COALESCE(SUM(CASE WHEN m.type = 'ENTRADA' THEN m.quantity * p.cost_price ELSE 0 END), 0) as entries_value,
			COALESCE(SUM(CASE WHEN m.type = 'SAIDA' THEN m.quantity * p.sale_price ELSE 0 END), 0) as exits_value
		FROM movements m
		JOIN products p ON m.product_code = p.code
		WHERE m.created_at BETWEEN ? AND ?
		GROUP BY DATE(m.created_at)
		ORDER BY date ASC
	`, startDate, endDate).Scan(&rows).Error
	if err != nil {
		return report, err
	}

	// Convert raw rows to Timeline items
	for _, r := range rows {
		report.Timeline = append(report.Timeline, models.ReportTimelineItem{
			Date:         r.Date,
			Entries:      r.Entries,
			Exits:        r.Exits,
			EntriesValue: r.EntriesValue,
			ExitsValue:   r.ExitsValue,
		})
	}

	return report, nil
}
