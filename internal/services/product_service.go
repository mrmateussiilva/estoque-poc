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

// GetStockList retorna a listagem de saldos de produtos com filtros
func (s *ProductService) GetStockList(search string, categoryID string) ([]models.StockItem, error) {
	db := s.DB.Model(&models.Product{}).
		Preload("Stock").
		Preload("Category").
		Where("active = ?", true)

	if search != "" {
		db = db.Where("code LIKE ? OR name LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if categoryID != "" {
		db = db.Where("category_id = ?", categoryID)
	}

	var products []models.Product
	if err := db.Order("name ASC").Find(&products).Error; err != nil {
		return nil, err
	}

	var list []models.StockItem
	for _, p := range products {
		qty := 0.0
		if p.Stock != nil {
			qty = p.Stock.Quantity
		}
		catName := "Sem Categoria"
		if p.Category != nil {
			catName = p.Category.Name
		}

		item := models.StockItem{
			Code:         p.Code,
			Name:         p.Name,
			Quantity:     qty,
			Unit:         p.Unit,
			MinStock:     p.MinStock,
			MaxStock:     p.MaxStock,
			CategoryName: catName,
			SalePrice:    p.SalePrice,
			Description:  p.Description,
			CategoryID:   p.CategoryID,
			Barcode:      p.Barcode,
			CostPrice:    p.CostPrice,
			Location:     p.Location,
			SupplierID:   p.SupplierID,
		}
		list = append(list, item)
	}

	if list == nil {
		list = []models.StockItem{}
	}

	return list, nil
}

// CreateMovement registra uma nova movimentação de estoque
func (s *ProductService) CreateMovement(req models.CreateMovementRequest, userID int32) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
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
