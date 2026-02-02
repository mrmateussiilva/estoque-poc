package api

import (
	"database/sql"
	"encoding/json"
	"encoding/xml"
	"estoque/internal/models"
	"log/slog"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

func (h *Handler) LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	var user models.User
	var storedPassword string
	err := h.DB.QueryRow(`
		SELECT id, name, email, password, role, active 
		FROM users WHERE email = ?
	`, req.Email).Scan(&user.ID, &user.Name, &user.Email, &storedPassword, &user.Role, &user.Active)
	if err != nil {
		RespondWithError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	if !user.Active {
		RespondWithError(w, http.StatusUnauthorized, "User is inactive")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedPassword), []byte(req.Password)); err != nil {
		RespondWithError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &models.Claims{
		Email: req.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(JwtSecret)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error generating token")
		return
	}

	RespondWithJSON(w, http.StatusOK, models.LoginResponse{
		Token: tokenString,
		User:  user,
	})
}

func (h *Handler) UploadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Error parsing form: "+err.Error())
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "File not found (key 'file' required): "+err.Error())
		return
	}
	defer file.Close()

	var proc models.NfeProc
	if err := xml.NewDecoder(file).Decode(&proc); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Error decoding XML: "+err.Error())
		return
	}

	tx, err := h.DB.Begin()
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "DB Error (beginning transaction): "+err.Error())
		return
	}
	defer tx.Rollback()

	// Verificar duplicação
	var exists bool
	err = tx.QueryRow("SELECT EXISTS(SELECT 1 FROM processed_nfes WHERE access_key = $1)", proc.NFe.InfNFe.ID).Scan(&exists)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error checking duplicate NFe: "+err.Error())
		return
	}
	if exists {
		RespondWithError(w, http.StatusConflict, "Esta NF-e já foi processada anteriormente")
		return
	}

	// Registrar NF-e processada
	totalItems := len(proc.NFe.InfNFe.Det)
	_, err = tx.Exec(`
		INSERT INTO processed_nfes (access_key, total_items) 
		VALUES ($1, $2)
	`, proc.NFe.InfNFe.ID, totalItems)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error registering NFe: "+err.Error())
		return
	}

	// Processar cada produto
	for _, det := range proc.NFe.InfNFe.Det {
		// Inserir/atualizar produto
		_, err = tx.Exec(`
			INSERT OR IGNORE INTO products (code, name, unit) 
			VALUES ($1, $2, 'UN')`,
			det.Prod.CProd, det.Prod.XProd,
		)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Error inserting product: "+err.Error())
			return
		}

		// Criar movimentação de entrada
		_, err = tx.Exec(`
			INSERT INTO movements (product_code, type, quantity, origin, reference)
			VALUES ($1, 'ENTRADA', $2, 'NFE', $3)
		`, det.Prod.CProd, det.Prod.QCom, proc.NFe.InfNFe.ID)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Error creating movement: "+err.Error())
			return
		}

		// Atualizar estoque
		_, err = tx.Exec(`
			INSERT INTO stock (product_code, quantity) 
			VALUES ($1, $2)
			ON CONFLICT (product_code) 
			DO UPDATE SET quantity = quantity + excluded.quantity`,
			det.Prod.CProd, det.Prod.QCom,
		)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Error updating stock: "+err.Error())
			return
		}
	}

	if err := tx.Commit(); err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Commit error: "+err.Error())
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message":     "NF-e processada com sucesso",
		"total_items": totalItems,
	})
}

func (h *Handler) StockHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	query := `
		SELECT 
			p.code, p.name, COALESCE(s.quantity, 0) as quantity, 
			p.unit, p.min_stock, p.max_stock, p.sale_price,
			COALESCE(c.name, 'Sem Categoria') as category_name,
			p.description, p.category_id, p.barcode, p.cost_price,
			p.location, p.supplier_id
		FROM products p
		LEFT JOIN stock s ON p.code = s.product_code
		LEFT JOIN categories c ON p.category_id = c.id
		WHERE p.active = 1
	`
	args := []interface{}{}

	// Busca por nome ou código
	if search := r.URL.Query().Get("search"); search != "" {
		query += " AND (p.code LIKE ? OR p.name LIKE ?)"
		pattern := "%" + search + "%"
		args = append(args, pattern, pattern)
	}

	// Filtro por categoria
	if categoryID := r.URL.Query().Get("category_id"); categoryID != "" {
		query += " AND p.category_id = ?"
		args = append(args, categoryID)
	}

	query += " ORDER BY p.name ASC"

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "DB Error (querying stock): "+err.Error())
		return
	}
	defer rows.Close()

	var list []models.StockItem
	for rows.Next() {
		var item models.StockItem
		err := rows.Scan(
			&item.Code, &item.Name, &item.Quantity, 
			&item.Unit, &item.MinStock, &item.MaxStock, &item.SalePrice, 
			&item.CategoryName, &item.Description, &item.CategoryID,
			&item.Barcode, &item.CostPrice, &item.Location, &item.SupplierID,
		)
		if err != nil {
			slog.Warn("Scan error", "error", err)
			continue
		}
		list = append(list, item)
	}

	if list == nil {
		list = []models.StockItem{}
	}

	RespondWithJSON(w, http.StatusOK, list)
}
