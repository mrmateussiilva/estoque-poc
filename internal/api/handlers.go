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

	var storedPassword string
	err := h.DB.QueryRow("SELECT password FROM users WHERE email = ?", req.Email).Scan(&storedPassword)
	if err != nil {
		RespondWithError(w, http.StatusUnauthorized, "Invalid credentials")
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

	RespondWithJSON(w, http.StatusOK, models.LoginResponse{Token: tokenString})
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

	_, err = tx.Exec("INSERT INTO processed_nfes (access_key) VALUES ($1)", proc.NFe.InfNFe.ID)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error registering NFe: "+err.Error())
		return
	}

	for _, det := range proc.NFe.InfNFe.Det {
		_, err = tx.Exec(`
			INSERT OR IGNORE INTO products (code, name) 
			VALUES ($1, $2)`,
			det.Prod.CProd, det.Prod.XProd,
		)
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Error inserting product: "+err.Error())
			return
		}

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

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Upload successful"))
}

func (h *Handler) StockHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	rows, err := h.DB.Query(`
		SELECT p.code, p.name, s.quantity 
		FROM stock s 
		JOIN products p ON s.product_code = p.code
	`)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "DB Error (querying stock): "+err.Error())
		return
	}
	defer rows.Close()

	var list []models.StockItem
	for rows.Next() {
		var item models.StockItem
		if err := rows.Scan(&item.Code, &item.Name, &item.Quantity); err != nil {
			slog.Warn("Scan error", "error", err)
			continue
		}
		list = append(list, item)
	}

	RespondWithJSON(w, http.StatusOK, list)
}
