package api

import (
	"encoding/json"
	"estoque/internal/models"
	"estoque/internal/services"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"gorm.io/gorm"
)

// ===== Dashboard Handlers =====

func (h *Handler) DashboardStatsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Tentar buscar do cache primeiro
	if cachedStats, ok := GetCachedDashboardStats(); ok {
		RespondWithJSON(w, http.StatusOK, cachedStats)
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

	// Armazenar no cache
	SetCachedDashboardStats(&stats)

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

	// Obter usuário do contexto
	user, ok := GetUserFromContext(r)
	if !ok {
		HandleError(w, ErrUnauthorized, "Usuário não autenticado")
		return
	}

	// Validar dados usando service
	if err := services.ValidateMovementRequest(req.ProductCode, req.Type, req.Quantity); err != nil {
		HandleError(w, NewAppError(http.StatusBadRequest, err.Error(), err), "Erro de validação")
		return
	}

	// Executar via Service
	if err := h.ProductService.CreateMovement(req, user.ID); err != nil {
		if err == gorm.ErrInvalidData {
			HandleError(w, ErrInsufficientStock, "Erro ao processar movimentação")
			return
		}
		if err == gorm.ErrRecordNotFound {
			HandleError(w, ErrProductNotFound, "Erro ao processar movimentação")
			return
		}
		HandleError(w, NewAppErrorWithContext(
			http.StatusInternalServerError,
			"Erro ao processar movimentação",
			err,
			map[string]interface{}{
				"product_code": req.ProductCode,
				"type":         req.Type,
				"user_id":      user.ID,
			},
		), "Erro ao processar movimentação")
		return
	}

	// Log estruturado da ação
	slog.Info("Movimentação criada",
		"product_code", req.ProductCode,
		"type", req.Type,
		"quantity", req.Quantity,
		"user_id", user.ID,
		"user_email", user.Email,
	)

	// Registrar no audit log
	LogAuditAction(h.DB, r, &user.ID, "CREATE", "movement", req.ProductCode,
		"Movimentação de estoque criada",
		nil,
		map[string]interface{}{
			"product_code": req.ProductCode,
			"type":         req.Type,
			"quantity":     req.Quantity,
			"origin":       req.Origin,
		},
	)

	// Invalidar cache do dashboard usando tag (mais eficiente)
	InvalidateCacheByTag(TagDashboard)

	RespondWithJSON(w, http.StatusCreated, map[string]interface{}{
		"message": "Movimentação criada com sucesso",
	})
}

func (h *Handler) ListMovementsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Método não permitido")
		return
	}

	params := ParsePaginationParams(r)
	offset := (params.Page - 1) * params.Limit

	db := h.DB.Model(&models.Movement{}).Order("created_at DESC").Preload("Product").Preload("User")

	if productCode := r.URL.Query().Get("product_code"); productCode != "" {
		db = db.Where("product_code = ?", productCode)
	}
	if movType := r.URL.Query().Get("type"); movType != "" {
		db = db.Where("type = ?", movType)
	}

	// Contar total
	var total int64
	if err := db.Count(&total).Error; err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao buscar movimentações", err), "Erro ao buscar movimentações")
		return
	}

	// Buscar com paginação
	var movements []models.Movement
	if err := db.Offset(offset).Limit(params.Limit).Find(&movements).Error; err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao buscar movimentações", err), "Erro ao buscar movimentações")
		return
	}

	response := NewPaginatedResponse(movements, total, params)
	RespondWithJSON(w, http.StatusOK, response)
}

// ===== Product Handlers =====

func (h *Handler) ListProductsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	params := ParsePaginationParams(r)
	offset := (params.Page - 1) * params.Limit

	db := h.DB.Model(&models.Product{}).Where("active = ?", true)

	if search := r.URL.Query().Get("search"); search != "" {
		db = db.Where("code LIKE ? OR name LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if categoryID := r.URL.Query().Get("category_id"); categoryID != "" {
		db = db.Where("category_id = ?", categoryID)
	}

	// Contar total
	var total int64
	if err := db.Count(&total).Error; err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao buscar produtos", err), "Erro ao buscar produtos")
		return
	}

	// Buscar com paginação
	var products []models.Product
	if err := db.Order("name ASC").Offset(offset).Limit(params.Limit).Find(&products).Error; err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao buscar produtos", err), "Erro ao buscar produtos")
		return
	}

	response := NewPaginatedResponse(products, total, params)
	RespondWithJSON(w, http.StatusOK, response)
}

// ===== Category Handlers =====

func (h *Handler) CategoriesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		// Tentar buscar do cache primeiro
		if cachedCategories, ok := GetCachedCategories(); ok {
			RespondWithJSON(w, http.StatusOK, cachedCategories)
			return
		}

		var categories []models.Category
		if err := h.DB.Order("name ASC").Find(&categories).Error; err != nil {
			HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao buscar categorias", err), "Erro ao buscar categorias")
			return
		}

		// Armazenar no cache
		SetCachedCategories(categories)

		RespondWithJSON(w, http.StatusOK, categories)
		return
	}

	if r.Method == http.MethodPost {
		var req struct {
			Name     string `json:"name"`
			ParentID *int32 `json:"parent_id"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			RespondWithError(w, http.StatusBadRequest, "Corpo da requisição inválido")
			return
		}

		// Validar dados usando service
		if err := services.ValidateCategoryRequest(req.Name); err != nil {
			HandleError(w, NewAppError(http.StatusBadRequest, err.Error(), err), "Erro de validação")
			return
		}

		category := models.Category{Name: req.Name, ParentID: req.ParentID}
		if err := h.DB.Create(&category).Error; err != nil {
			if strings.Contains(err.Error(), "Duplicate entry") {
				RespondWithError(w, http.StatusConflict, "Uma categoria com este nome já existe")
				return
			}
			RespondWithError(w, http.StatusInternalServerError, "Error creating category")
			return
		}

		// Log estruturado
		slog.Info("Categoria criada",
			"category_id", category.ID,
			"category_name", category.Name,
		)

		// Registrar no audit log
		user, _ := GetUserFromContext(r)
		var userID *int32
		if user != nil {
			userID = &user.ID
		}
		categoryIDStr := strconv.FormatInt(int64(category.ID), 10)
		LogAuditAction(h.DB, r, userID, "CREATE", "category", categoryIDStr,
			"Categoria criada",
			nil,
			map[string]interface{}{"name": category.Name},
		)

		// Invalidar cache de categorias usando tag
		InvalidateCacheByTag(TagCategories)

		RespondWithJSON(w, http.StatusCreated, category)
		return
	}

	if r.Method == http.MethodPut {
		idStr := strings.TrimPrefix(r.URL.Path, "/api/categories/")
		if idStr == "" {
			RespondWithError(w, http.StatusBadRequest, "Category ID is required")
			return
		}

		var req models.Category
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			RespondWithError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		if err := h.DB.Model(&models.Category{}).Where("id = ?", idStr).Updates(req).Error; err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Error updating category")
			return
		}

		// Registrar no audit log
		user, _ := GetUserFromContext(r)
		var userID *int32
		if user != nil {
			userID = &user.ID
		}
		LogAuditAction(h.DB, r, userID, "UPDATE", "category", idStr,
			"Categoria atualizada",
			nil,
			req,
		)

		// Invalidar cache de categorias usando tag
		InvalidateCacheByTag(TagCategories)

		RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Categoria atualizada com sucesso"})
		return
	}

	if r.Method == http.MethodDelete {
		idStr := strings.TrimPrefix(r.URL.Path, "/api/categories/")
		if idStr == "" {
			RespondWithError(w, http.StatusBadRequest, "Category ID is required")
			return
		}

		// Verificar se existem produtos vinculados
		var count int64
		h.DB.Model(&models.Product{}).Where("category_id = ?", idStr).Count(&count)
		if count > 0 {
			RespondWithError(w, http.StatusConflict, "Não é possível excluir uma categoria que possui produtos vinculados")
			return
		}

		if err := h.DB.Delete(&models.Category{}, idStr).Error; err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Error deleting category")
			return
		}

		// Registrar no audit log
		user, _ := GetUserFromContext(r)
		var userID *int32
		if user != nil {
			userID = &user.ID
		}
		LogAuditAction(h.DB, r, userID, "DELETE", "category", idStr,
			"Categoria excluída",
			nil,
			nil,
		)

		// Invalidar cache de categorias usando tag
		InvalidateCacheByTag(TagCategories)

		w.WriteHeader(http.StatusNoContent)
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

	params := ParsePaginationParams(r)
	offset := (params.Page - 1) * params.Limit

	db := h.DB.Model(&models.ProcessedNFe{})

	// Contar total
	var total int64
	if err := db.Count(&total).Error; err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao buscar NF-es", err), "Erro ao buscar NF-es")
		return
	}

	// Buscar com paginação
	var nfes []models.ProcessedNFe
	if err := db.Order("processed_at DESC").Offset(offset).Limit(params.Limit).Find(&nfes).Error; err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao buscar NF-es", err), "Erro ao buscar NF-es")
		return
	}

	response := NewPaginatedResponse(nfes, total, params)
	RespondWithJSON(w, http.StatusOK, response)
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

	// Invalidar cache do produto específico e estoque
	InvalidateProductCache(code)
	InvalidateCacheByTag(TagStock)
	
	RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Product updated successfully"})
}
