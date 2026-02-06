package api

import (
	"encoding/json"
	"estoque/internal/models"
	"log/slog"
	"net/http"
	"strconv"
)

// ===== Dashboard Handlers =====

func (h *Handler) DashboardStatsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var stats models.DashboardStats

	// Total de itens em estoque
	err := h.DB.QueryRow("SELECT COALESCE(SUM(quantity), 0) FROM stock").Scan(&stats.TotalItems)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error calculating total items")
		return
	}

	// Total de SKUs ativos
	err = h.DB.QueryRow("SELECT COUNT(*) FROM products WHERE active = 1").Scan(&stats.TotalSKUs)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error counting SKUs")
		return
	}

	// Entradas no mês atual
	err = h.DB.QueryRow(`
		SELECT COUNT(*) FROM movements 
		WHERE type = 'ENTRADA' 
		AND DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
	`).Scan(&stats.EntriesThisMonth)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error counting entries")
		return
	}

	// Produtos com estoque baixo
	err = h.DB.QueryRow(`
		SELECT COUNT(*) FROM stock s
		JOIN products p ON s.product_code = p.code
		WHERE s.quantity < p.min_stock AND p.active = 1
	`).Scan(&stats.LowStockCount)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error counting low stock")
		return
	}

	RespondWithJSON(w, http.StatusOK, stats)
}

func (h *Handler) StockEvolutionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	rows, err := h.DB.Query(`
		SELECT 
			DATE_FORMAT(created_at, '%Y-%m') as month,
			SUM(CASE WHEN type = 'ENTRADA' THEN quantity ELSE -quantity END) as items
		FROM movements
		WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
		GROUP BY month
		ORDER BY month
	`)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error fetching evolution data")
		return
	}
	defer rows.Close()

	var evolution []models.StockEvolution
	for rows.Next() {
		var item models.StockEvolution
		if err := rows.Scan(&item.Month, &item.Items); err != nil {
			slog.Warn("Scan error", "error", err)
			continue
		}
		evolution = append(evolution, item)
	}

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
	var exists bool
	err := h.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM products WHERE code = ? AND active = 1)", req.ProductCode).Scan(&exists)
	if err != nil || !exists {
		RespondWithError(w, http.StatusNotFound, "Product not found or inactive")
		return
	}

	// Se for saída, verificar estoque disponível
	if req.Type == "SAIDA" {
		var currentStock float64
		err := h.DB.QueryRow("SELECT COALESCE(quantity, 0) FROM stock WHERE product_code = ?", req.ProductCode).Scan(&currentStock)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Error checking stock")
			return
		}
		if currentStock < req.Quantity {
			RespondWithError(w, http.StatusBadRequest, "Insufficient stock")
			return
		}
	}

	tx, err := h.DB.Begin()
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer tx.Rollback()

	// Criar movimentação
	result, err := tx.Exec(`
		INSERT INTO movements (product_code, type, quantity, origin, reference, notes)
		VALUES (?, ?, ?, ?, ?, ?)
	`, req.ProductCode, req.Type, req.Quantity, req.Origin, req.Reference, req.Notes)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error creating movement")
		return
	}

	// Atualizar estoque
	var stockUpdate string
	if req.Type == "ENTRADA" {
		stockUpdate = `
			INSERT INTO stock (product_code, quantity) VALUES (?, ?)
			ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
		`
	} else {
		stockUpdate = `
			UPDATE stock SET quantity = quantity - ? WHERE product_code = ?
		`
	}

	if req.Type == "ENTRADA" {
		_, err = tx.Exec(stockUpdate, req.ProductCode, req.Quantity)
	} else {
		_, err = tx.Exec(stockUpdate, req.Quantity, req.ProductCode)
	}
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error updating stock")
		return
	}

	if err := tx.Commit(); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Commit error")
		return
	}

	movementID, _ := result.LastInsertId()
	RespondWithJSON(w, http.StatusCreated, map[string]interface{}{
		"id":      movementID,
		"message": "Movement created successfully",
	})
}

func (h *Handler) ListMovementsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	query := `
		SELECT m.id, m.product_code, m.type, m.quantity, m.origin, m.reference, m.notes, m.created_at
		FROM movements m
		WHERE 1=1
	`
	args := []interface{}{}

	// Filtros opcionais
	if productCode := r.URL.Query().Get("product_code"); productCode != "" {
		query += " AND m.product_code = ?"
		args = append(args, productCode)
	}
	if movType := r.URL.Query().Get("type"); movType != "" {
		query += " AND m.type = ?"
		args = append(args, movType)
	}

	query += " ORDER BY m.created_at DESC LIMIT 100"

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer rows.Close()

	var movements []models.Movement
	for rows.Next() {
		var m models.Movement
		err := rows.Scan(&m.ID, &m.ProductCode, &m.Type, &m.Quantity, &m.Origin, &m.Reference, &m.Notes, &m.CreatedAt)
		if err != nil {
			slog.Warn("Scan error", "error", err)
			continue
		}
		movements = append(movements, m)
	}

	if movements == nil {
		movements = []models.Movement{}
	}

	RespondWithJSON(w, http.StatusOK, movements)
}

// ===== Product Handlers =====

func (h *Handler) ListProductsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	query := `
		SELECT p.code, p.name, p.description, p.category_id, p.unit, p.barcode,
		       p.cost_price, p.sale_price, p.min_stock, p.max_stock, p.location,
		       p.supplier_id, p.active, p.created_at, p.updated_at
		FROM products p
		WHERE p.active = 1
	`
	args := []interface{}{}

	// Busca
	if search := r.URL.Query().Get("search"); search != "" {
		query += " AND (p.code LIKE ? OR p.name LIKE ?)"
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern, searchPattern)
	}

	// Filtro por categoria
	if categoryID := r.URL.Query().Get("category_id"); categoryID != "" {
		query += " AND p.category_id = ?"
		args = append(args, categoryID)
	}

	query += " ORDER BY p.name"

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		err := rows.Scan(&p.Code, &p.Name, &p.Description, &p.CategoryID, &p.Unit, &p.Barcode,
			&p.CostPrice, &p.SalePrice, &p.MinStock, &p.MaxStock, &p.Location,
			&p.SupplierID, &p.Active, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			slog.Warn("Scan error", "error", err)
			continue
		}
		products = append(products, p)
	}

	if products == nil {
		products = []models.Product{}
	}

	RespondWithJSON(w, http.StatusOK, products)
}

// ===== Category Handlers =====

func (h *Handler) ListCategoriesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	rows, err := h.DB.Query("SELECT id, name, parent_id FROM categories ORDER BY name")
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var c models.Category
		if err := rows.Scan(&c.ID, &c.Name, &c.ParentID); err != nil {
			slog.Warn("Scan error", "error", err)
			continue
		}
		categories = append(categories, c)
	}

	if categories == nil {
		categories = []models.Category{}
	}

	RespondWithJSON(w, http.StatusOK, categories)
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

	rows, err := h.DB.Query(`
		SELECT access_key, number, supplier_name, total_items, processed_at
		FROM processed_nfes
		ORDER BY processed_at DESC
		LIMIT ?
	`, limit)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer rows.Close()

	var nfes []models.ProcessedNFe
	for rows.Next() {
		var nfe models.ProcessedNFe
		if err := rows.Scan(&nfe.AccessKey, &nfe.Number, &nfe.SupplierName, &nfe.TotalItems, &nfe.ProcessedAt); err != nil {
			slog.Warn("Scan error", "error", err)
			continue
		}
		nfes = append(nfes, nfe)
	}

	if nfes == nil {
		nfes = []models.ProcessedNFe{}
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
		slog.Error("Failed to decode product update request", "error", err, "code", code)
		RespondWithError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Verificar se produto existe
	var exists bool
	err := h.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM products WHERE code = ?)", code).Scan(&exists)
	if err != nil || !exists {
		RespondWithError(w, http.StatusNotFound, "Product not found")
		return
	}

	_, err = h.DB.Exec(`
		UPDATE products SET 
			name = ?, description = ?, category_id = ?, unit = ?, 
			barcode = ?, cost_price = ?, sale_price = ?, min_stock = ?, 
			max_stock = ?, location = ?, supplier_id = ?, updated_at = CURRENT_TIMESTAMP
		WHERE code = ?
	`, req.Name, req.Description, req.CategoryID, req.Unit, 
	   req.Barcode, req.CostPrice, req.SalePrice, req.MinStock, 
	   req.MaxStock, req.Location, req.SupplierID, code)

	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error updating product: "+err.Error())
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Product updated successfully"})
}
