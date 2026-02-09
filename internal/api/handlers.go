package api

import (
	"encoding/json"
	"encoding/xml"
	"estoque/internal/models"
	"estoque/internal/services"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Handler struct {
	DB             *gorm.DB
	NfeService     *services.NfeService
	ProductService *services.ProductService
}

func NewHandler(db *gorm.DB) *Handler {
	return &Handler{
		DB:             db,
		NfeService:     services.NewNfeService(db),
		ProductService: services.NewProductService(db),
	}
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
	result := h.DB.Where("email = ?", req.Email).First(&user)
	if result.Error != nil {
		RespondWithError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	if !user.Active {
		RespondWithError(w, http.StatusUnauthorized, "User is inactive")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
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

	totalItems, err := h.NfeService.ProcessNfe(&proc)
	if err != nil {
		if err == gorm.ErrDuplicatedKey {
			RespondWithError(w, http.StatusConflict, "Esta NF-e já foi processada anteriormente")
			return
		}
		RespondWithError(w, http.StatusInternalServerError, "Error processing NF-e: "+err.Error())
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

	search := r.URL.Query().Get("search")
	categoryID := r.URL.Query().Get("category_id")

	list, err := h.ProductService.GetStockList(search, categoryID)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Error fetching stock: "+err.Error())
		return
	}

	RespondWithJSON(w, http.StatusOK, list)
}

func (h *Handler) GetMovementsReport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	startDateStr := r.URL.Query().Get("start_date")
	endDateStr := r.URL.Query().Get("end_date")

	if startDateStr == "" || endDateStr == "" {
		RespondWithError(w, http.StatusBadRequest, "Parâmetros 'start_date' e 'end_date' são obrigatórios.")
		return
	}

	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Formato de 'start_date' inválido. Use YYYY-MM-DD.")
		return
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "Formato de 'end_date' inválido. Use YYYY-MM-DD.")
		return
	}

	// Adjust endDate to include the entire day
	endDate = endDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)

	reportData, err := database.GetMovementsReportData(h.DB, startDate, endDate)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Erro ao gerar relatório de movimentações: "+err.Error())
		return
	}

	RespondWithJSON(w, http.StatusOK, reportData)
}

func stringPtr(s string) *string {
	return &s
}
