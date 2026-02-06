package api

import (
	"encoding/json"
	"estoque/internal/models"
	"net/http"
	"strconv"

	"gorm.io/gorm"
)

// ===== Dashboard Handlers =====

func (h *Handler) DashboardStatsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var stats models.DashboardStats

	// Total de itens em estoque
	h.DB.Model(&models.Stock{}).Select("COALESCE(SUM(quantity), 0)").Scan(&stats.TotalItems)

	// Total de SKUs ativos
	h.DB.Model(&models.Product{}).Where("active = ?", true).Count(&stats.TotalSKUs)

	// Entradas no mês atual (Usando Raw por causa do DATE_FORMAT específico do MySQL)
	h.DB.Raw(`
		SELECT COUNT(*) FROM movements 
		WHERE type = 'ENTRADA' 
		AND DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
	`).Scan(&stats.EntriesThisMonth)

	// Produtos com estoque baixo
	h.DB.Table("stock").
		Joins("JOIN products ON stock.product_code = products.code").
		Where("stock.quantity < products.min_stock AND products.active = ?", true).
		Count(&stats.LowStockCount)

	RespondWithJSON(w, http.StatusOK, stats)
}

func (h *Handler) StockEvolutionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var evolution []models.StockEvolution
	h.DB.Raw(`
		SELECT 
			DATE_FORMAT(created_at, '%Y-%m') as month,
			SUM(CASE WHEN type = 'ENTRADA' THEN quantity ELSE -quantity END) as items
		FROM movements
		WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
		GROUP BY month
		ORDER BY month
	`).Scan(&evolution)

	RespondWithJSON(w, http.StatusOK, evolution)
}

// ===== Movement Handlers =====

func (h *Handler) CreateMovementHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req models.CreateMovementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validações
	if req.ProductCode == "" {
		RespondWithError(w, http.StatusBadRequest, "Product code is required")
		return
	}
	if req.Type != "ENTRADA" && req.Type != "SAIDA" {
		RespondWithError(w, http.StatusBadRequest, "Type must be ENTRADA or SAIDA")
		return
	}
	if req.Quantity <= 0 {
		RespondWithError(w, http.StatusBadRequest, "Quantity must be positive")
		return
	}

	// Verificar se produto existe
	var product models.Product
	if err := h.DB.First(&product, "code = ? AND active = ?", req.ProductCode, true).Error; err != nil {
		RespondWithError(w, http.StatusNotFound, "Product not found or inactive")
		return
	}

	// Iniciar Transação
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		// Se for saída, verificar estoque disponível
		if req.Type == "SAIDA" {
			var stock models.Stock
			tx.First(&stock, "product_code = ?", req.ProductCode)
			if stock.Quantity < req.Quantity {
				return gorm.ErrInvalidData // Simular erro de regra de negócio
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

	if err != nil {
		if err == gorm.ErrInvalidData {
			RespondWithError(w, http.StatusBadRequest, "Insufficient stock")
			return
		}
		RespondWithError(w, http.StatusInternalServerError, "Error processing movement: "+err.Error())
		return
	}

	RespondWithJSON(w, http.StatusCreated, map[string]interface{}{
		"message": "Movement created successfully",
	})
}

func (h *Handler) ListMovementsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	db := h.DB.Order("created_at DESC").Limit(100)

	if productCode := r.URL.Query().Get("product_code"); productCode != "" {
		db = db.Where("product_code = ?", productCode)
	}
	if movType := r.URL.Query().Get("type"); movType != "" {
		db = db.Where("type = ?", movType)
	}

	var movements []models.Movement
	if err := db.Find(&movements).Error; err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}

	RespondWithJSON(w, http.StatusOK, movements)
}

// ===== Product Handlers =====

func (h *Handler) ListProductsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	db := h.DB.Where("active = ?", true)

	if search := r.URL.Query().Get("search"); search != "" {
		db = db.Where("code LIKE ? OR name LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if categoryID := r.URL.Query().Get("category_id"); categoryID != "" {
		db = db.Where("category_id = ?", categoryID)
	}

	var products []models.Product
	if err := db.Order("name ASC").Find(&products).Error; err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}

	RespondWithJSON(w, http.StatusOK, products)
}

// ===== Category Handlers =====

func (h *Handler) CategoriesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		var categories []models.Category
		if err := h.DB.Order("name ASC").Find(&categories).Error; err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Database error")
			return
		}
		RespondWithJSON(w, http.StatusOK, categories)
		return
	}

	if r.Method == http.MethodPost {
		var req struct {
			Name     string `json:"name"`
			ParentID *int32 `json:"parent_id"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			RespondWithError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		category := models.Category{Name: req.Name, ParentID: req.ParentID}
		if err := h.DB.Create(&category).Error; err != nil {
			if err == gorm.ErrDuplicatedKey {
				RespondWithError(w, http.StatusConflict, "Uma categoria com este nome já existe")
				return
			}
			RespondWithError(w, http.StatusInternalServerError, "Error creating category")
			return
		}

		RespondWithJSON(w, http.StatusCreated, category)
		return
	}

	RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
}

// ===== NFe Handlers =====

func (h *Handler) ListNFesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	limit := 50
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	var nfes []models.ProcessedNFe
	if err := h.DB.Order("processed_at DESC").Limit(limit).Find(&nfes).Error; err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}

	RespondWithJSON(w, http.StatusOK, nfes)
}

func (h *Handler) UpdateProductHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	code := r.URL.Path[len("/api/products/"):]
	if code == "" {
		RespondWithError(w, http.StatusBadRequest, "Product code is required")
		return
	}

	var req models.Product
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	var product models.Product
	if err := h.DB.First(&product, "code = ?", code).Error; err != nil {
		RespondWithError(w, http.StatusNotFound, "Product not found")
		return
	}

	// Atualizar campos (pode ser feito com h.DB.Model(&product).Updates(req))
	if err := h.DB.Model(&product).Updates(req).Error; err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error updating product")
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Product updated successfully"})
}
