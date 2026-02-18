package api

import (
	"encoding/json"
	"encoding/xml"
	"estoque/internal/events"
	"estoque/internal/models"
	"estoque/internal/services"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

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

	// 1. Métricas básicas (Contagens)
	h.DB.Model(&models.Stock{}).Select("COALESCE(SUM(quantity), 0)").Scan(&stats.TotalItems)
	h.DB.Model(&models.Product{}).Where("active = ?", true).Count(&stats.TotalSKUs)

	h.DB.Raw(`
		SELECT COUNT(*) FROM movements 
		WHERE type = 'ENTRADA' 
		AND DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
	`).Scan(&stats.EntriesThisMonth)

	h.DB.Table("stock").
		Joins("JOIN products ON stock.product_code = products.code").
		Where("stock.quantity < products.min_stock AND products.active = ?", true).
		Count(&stats.LowStockCount)

	// 2. Riqueza do Estoque (Valor Total)
	h.DB.Table("stock").
		Joins("JOIN products ON stock.product_code = products.code").
		Select("COALESCE(SUM(stock.quantity * products.cost_price), 0)").
		Scan(&stats.StockWealth)

	h.DB.Table("stock").
		Joins("JOIN products ON stock.product_code = products.code").
		Select("COALESCE(SUM(stock.quantity * products.sale_price), 0)").
		Scan(&stats.StockWealthSale)

	// 3. Custo Médio Global
	h.DB.Table("products").
		Where("active = ?", true).
		Select("COALESCE(AVG(cost_price), 0)").
		Scan(&stats.AverageCost)

	// 4. Produtos Parados (> 30 dias sem movimento)
	h.DB.Raw(`
		SELECT COUNT(*) FROM products p
		WHERE p.active = 1
		AND p.code NOT IN (
			SELECT DISTINCT product_code FROM movements 
			WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
		)
	`).Scan(&stats.IdleStockCount)

	// 5. Última Movimentação
	var lastMov models.Movement
	if err := h.DB.Order("created_at DESC").First(&lastMov).Error; err == nil {
		stats.LastMovementAt = &lastMov.CreatedAt
	}

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
			DATE_FORMAT(created_at, '%Y-%m-%d') as date,
			SUM(CASE WHEN type = 'ENTRADA' THEN quantity ELSE 0 END) as entries,
			SUM(CASE WHEN type = 'SAIDA' THEN quantity ELSE 0 END) as exits
		FROM movements
		WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
		GROUP BY date
		ORDER BY date
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
	user, ok := GetUserFromContext(r, h.DB)
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
	search := r.URL.Query().Get("search")
	categoryID := r.URL.Query().Get("category_id")
	offset := (params.Page - 1) * params.Limit

	// Caching apenas para listagem padrão
	cacheKey := fmt.Sprintf("products:list:%s:%s:%d:%d", search, categoryID, params.Page, params.Limit)
	if search == "" && categoryID == "" {
		if cachedData, ok := GetAdvancedCache().Get(cacheKey); ok {
			RespondWithJSON(w, http.StatusOK, cachedData)
			return
		}
	}

	db := h.DB.Model(&models.Product{}).Where("active = ?", true)

	if search != "" {
		db = db.Where("code LIKE ? OR name LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if categoryID != "" {
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

	if search == "" && categoryID == "" {
		GetAdvancedCache().Set(cacheKey, response, 10*time.Minute, TagStock)
	}

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
		user, _ := GetUserFromContext(r, h.DB)
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
		user, _ := GetUserFromContext(r, h.DB)
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
		user, _ := GetUserFromContext(r, h.DB)
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

func (h *Handler) GetNfeDetailHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Extrair accessKey da URL (ex: /api/nfes/{accessKey})
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 3 {
		RespondWithError(w, http.StatusBadRequest, "Chave de acesso inválida")
		return
	}
	accessKey := parts[len(parts)-1]

	var nfe models.ProcessedNFe
	if err := h.DB.First(&nfe, "access_key = ?", accessKey).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			HandleError(w, ErrNfeNotFound, "Nota fiscal não encontrada")
			return
		}
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao buscar nota", err), "Erro ao buscar nota")
		return
	}

	// Decodificar XML armazenado
	var proc models.NfeProc
	if err := xml.Unmarshal(nfe.XMLData, &proc); err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao decodificar XML", err), "Erro ao processar detalhes da nota")
		return
	}

	// Extrair itens
	items := make([]models.Prod, 0, len(proc.NFe.InfNFe.Det))
	for _, det := range proc.NFe.InfNFe.Det {
		items = append(items, det.Prod)
	}

	response := models.NfeDetailResponse{
		AccessKey:    nfe.AccessKey,
		Number:       proc.NFe.InfNFe.Ide.NNF,
		SupplierName: proc.NFe.InfNFe.Emit.XNome,
		TotalValue:   proc.NFe.InfNFe.Total.ICMSTot.VNF,
		Items:        items,
	}

	RespondWithJSON(w, http.StatusOK, response)
}

func (h *Handler) ProcessNfeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		RespondWithError(w, http.StatusMethodNotAllowed, "Método não permitido")
		return
	}

	// Extrair access_key da URL (ex: /api/nfes/{access_key}/process)
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		RespondWithError(w, http.StatusBadRequest, "Chave de acesso inválida")
		return
	}
	accessKey := parts[3]

	// Processar via Service
	totalItems, err := h.NfeService.ProcessNfe(accessKey)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			HandleError(w, ErrNfeNotFound, "Nota fiscal não encontrada")
			return
		}
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao processar nota", err), "Erro ao processar nota")
		return
	}

	slog.Info("NF-e aprovada manualmente", "access_key", accessKey, "items", totalItems)

	// Invalidar cache do dashboard e estoque para refletir as mudanças imediatamente
	InvalidateCacheByTags(TagDashboard, TagStock, TagEvolution)

	RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Nota fiscal processada com sucesso e estoque atualizado",
		"items":   totalItems,
	})
}

func (h *Handler) StreamNotificationsHandler(w http.ResponseWriter, r *http.Request) {
	// Configurar headers para SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	// Criar canal para este cliente
	clientChan := make(chan events.NotificationEvent, 10)
	hub := events.GetHub()
	hub.Register <- clientChan

	defer func() {
		hub.Unregister <- clientChan
	}()

	// Flush inicial para confirmar conexão
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}
	fmt.Fprintf(w, "event: connected\ndata: {\"message\": \"SSE connected\"}\n\n")
	flusher.Flush()

	// Ticker para Heartbeat (evita desconexão por inatividade)
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	// Loop de streaming
	for {
		select {
		case event := <-clientChan:
			jsonData, err := json.Marshal(event)
			if err != nil {
				continue
			}
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event.Type, jsonData)
			flusher.Flush()
		case <-ticker.C:
			// Enviar comentário SSE para manter a conexão viva
			fmt.Fprintf(w, ": heartbeat\n\n")
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
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
