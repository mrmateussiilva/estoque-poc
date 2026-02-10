package database

import (
	"estoque/internal/models"
	"fmt"
	"log/slog"
	"sort"
	"time"

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
		&models.AuditLog{},
	)
	if err != nil {
		slog.Error("Failed to auto-migrate database", "error", err)
		return nil, err
	}

	// Criar índices para melhorar performance
	createIndexes(db)

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

// createIndexes cria índices para melhorar performance das queries
// MySQL 5.6 não suporta "IF NOT EXISTS", então verificamos se o índice existe antes de criar
func createIndexes(db *gorm.DB) {
	indexes := []struct {
		name      string
		table     string
		columns   string
		unique    bool
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
	var movements []models.Movement

	// 1. Fetch Detailed Movements
	// Preload Product to get cost_price and sale_price for calculations
	if err := db.Where("movements.created_at BETWEEN ? AND ?", startDate, endDate).
		Preload("Product"). // Ensure Product is loaded for price access
		Order("movements.created_at ASC").
		Find(&movements).Error; err != nil {
		return report, err
	}
	report.DetailedMovements = movements

	// 2. Calculate Report Summary and Timeline
	summary := models.ReportSummary{}
	timelineMap := make(map[string]models.ReportTimelineItem) // Key: YYYY-MM-DD

	uniqueProducts := make(map[string]struct{})
	for _, m := range movements {
		dateStr := m.CreatedAt.Format("2006-01-02")
		item, exists := timelineMap[dateStr]
		if !exists {
			// Ensure date is UTC and without time components for consistent grouping
			item.Date = time.Date(m.CreatedAt.Year(), m.CreatedAt.Month(), m.CreatedAt.Day(), 0, 0, 0, 0, time.UTC)
		}

		productPrice := 0.0
		if m.Product != nil { 
			if m.Type == "ENTRADA" {
				productPrice = m.Product.CostPrice
			} else if m.Type == "SAIDA" {
				productPrice = m.Product.SalePrice
			}
		}

		if m.Type == "ENTRADA" {
			summary.TotalEntriesQuantity += m.Quantity
			summary.TotalEntriesValue += m.Quantity * productPrice
			item.Entries += m.Quantity
			item.EntriesValue += m.Quantity * productPrice
		} else if m.Type == "SAIDA" {
			summary.TotalExitsQuantity += m.Quantity
			summary.TotalExitsValue += m.Quantity * productPrice
			item.Exits += m.Quantity
			item.ExitsValue += m.Quantity * productPrice
		}
		summary.TotalMovements++
		uniqueProducts[m.ProductCode] = struct{}{} 
		timelineMap[dateStr] = item
	}

	summary.NetQuantity = summary.TotalEntriesQuantity - summary.TotalExitsQuantity
	summary.NetValue = summary.TotalEntriesValue - summary.TotalExitsValue
	summary.UniqueProducts = int64(len(uniqueProducts))

	report.Summary = summary

	// Convert timeline map to sorted slice
	for _, item := range timelineMap {
		report.Timeline = append(report.Timeline, item)
	}
	sort.Slice(report.Timeline, func(i, j int) bool {
		return report.Timeline[i].Date.Before(report.Timeline[j].Date)
	})

	return report, nil
}