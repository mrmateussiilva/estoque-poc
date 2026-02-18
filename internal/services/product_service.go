package services

import (
	"estoque/internal/models"

	"gorm.io/gorm"
)

type ProductService struct {
	DB *gorm.DB
}

func NewProductService(db *gorm.DB) *ProductService {
	return &ProductService{DB: db}
}

// GetStockList retorna a listagem de saldos de produtos com filtros e paginação
// Otimizado para evitar queries N+1 usando JOIN ao invés de múltiplos Preloads
func (s *ProductService) GetStockList(search string, categoryID string, page int, limit int) ([]models.StockItem, int64, error) {
	// Query base otimizada com JOIN
	query := s.DB.Table("products").
		Select(`
			products.code,
			products.name,
			products.unit,
			products.min_stock,
			products.max_stock,
			products.sale_price,
			products.description,
			products.category_id,
			products.barcode,
			products.cost_price,
			products.location,
			products.supplier_id,
			COALESCE(stock.quantity, 0) as quantity,
			COALESCE(categories.name, 'Sem Categoria') as category_name
		`).
		Joins("LEFT JOIN stock ON products.code = stock.product_code").
		Joins("LEFT JOIN categories ON products.category_id = categories.id").
		Where("products.active = ?", true)

	if search != "" {
		query = query.Where("products.code LIKE ? OR products.name LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if categoryID != "" {
		query = query.Where("products.category_id = ?", categoryID)
	}

	// Contar total antes de paginar
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Aplicar paginação
	offset := (page - 1) * limit
	var results []struct {
		Code         string   `gorm:"column:code"`
		Name         string   `gorm:"column:name"`
		Quantity     float64  `gorm:"column:quantity"`
		Unit         string   `gorm:"column:unit"`
		MinStock     float64  `gorm:"column:min_stock"`
		MaxStock     *float64 `gorm:"column:max_stock"`
		CategoryName string   `gorm:"column:category_name"`
		SalePrice    float64  `gorm:"column:sale_price"`
		Description  *string  `gorm:"column:description"`
		CategoryID   *int32   `gorm:"column:category_id"`
		Barcode      *string  `gorm:"column:barcode"`
		CostPrice    float64  `gorm:"column:cost_price"`
		Location     *string  `gorm:"column:location"`
		SupplierID   *int32   `gorm:"column:supplier_id"`
	}

	if err := query.Order("products.name ASC").
		Offset(offset).
		Limit(limit).
		Scan(&results).Error; err != nil {
		return nil, 0, err
	}

	// Converter para StockItem
	list := make([]models.StockItem, 0, len(results))
	for _, r := range results {
		list = append(list, models.StockItem{
			Code:         r.Code,
			Name:         r.Name,
			Quantity:     r.Quantity,
			Unit:         r.Unit,
			MinStock:     r.MinStock,
			MaxStock:     r.MaxStock,
			CategoryName: r.CategoryName,
			SalePrice:    r.SalePrice,
			Description:  r.Description,
			CategoryID:   r.CategoryID,
			Barcode:      r.Barcode,
			CostPrice:    r.CostPrice,
			Location:     r.Location,
			SupplierID:   r.SupplierID,
		})
	}

	return list, total, nil
}

// CreateMovement registra uma nova movimentação de estoque
func (s *ProductService) CreateMovement(req models.CreateMovementRequest, userID int32) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		// Verificar se o produto existe
		var product models.Product
		if err := tx.First(&product, "code = ? AND active = ?", req.ProductCode, true).Error; err != nil {
			return err // Se não encontrar, retorna gorm.ErrRecordNotFound
		}

		// Se for saída, verificar estoque disponível
		if req.Type == "SAIDA" {
			var stock models.Stock
			if err := tx.First(&stock, "product_code = ?", req.ProductCode).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					return gorm.ErrInvalidData
				}
				return err
			}
			if stock.Quantity < req.Quantity {
				return gorm.ErrInvalidData
			}
		}

		// Criar movimentação
		movement := models.Movement{
			ProductCode: req.ProductCode,
			Type:        req.Type,
			Quantity:    req.Quantity,
			Origin:      &req.Origin,
			Reference:   &req.Reference,
			Notes:       &req.Notes,
			UserID:      &userID,
		}
		if err := tx.Create(&movement).Error; err != nil {
			return err
		}

		// Atualizar estoque
		var stock models.Stock
		err := tx.First(&stock, "product_code = ?", req.ProductCode).Error
		if err == gorm.ErrRecordNotFound {
			if req.Type == "SAIDA" {
				return gorm.ErrInvalidData
			}
			stock = models.Stock{ProductCode: req.ProductCode, Quantity: req.Quantity}
			return tx.Create(&stock).Error
		} else if err != nil {
			return err
		}

		if req.Type == "ENTRADA" {
			stock.Quantity += req.Quantity
		} else {
			stock.Quantity -= req.Quantity
		}
		return tx.Save(&stock).Error
	})
}
