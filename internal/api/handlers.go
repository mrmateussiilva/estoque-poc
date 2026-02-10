package api

import (
	"bytes"
	"encoding/json"
	"estoque/internal/database"
	"estoque/internal/models"
	"estoque/internal/services"
	"estoque/internal/services/worker_pools"
	"io"
	"log/slog"
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
	NFeWorkerPool  *worker_pools.NFeWorkerPool
	ExportPool     *worker_pools.ExportWorkerPool
}

func NewHandler(db *gorm.DB, nfePool *worker_pools.NFeWorkerPool, exportPool *worker_pools.ExportWorkerPool) *Handler {
	return &Handler{
		DB:             db,
		NfeService:     services.NewNfeService(db),
		ProductService: services.NewProductService(db),
		NFeWorkerPool:  nfePool,
		ExportPool:     exportPool,
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
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao gerar token", err), "Erro ao processar autenticação")
		return
	}

	// Log estruturado do login (sem senha)
	slog.Info("Login realizado",
		"user_id", user.ID,
		"user_email", user.Email,
		"user_role", user.Role,
	)

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

	// Limitar tamanho do formulário a 10MB
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		HandleError(w, NewAppError(http.StatusBadRequest, "Erro ao processar formulário", err), "Erro ao processar upload")
		return
	}

	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		HandleError(w, NewAppError(http.StatusBadRequest, "Arquivo não encontrado (chave 'file' obrigatória)", err), "Erro ao processar upload")
		return
	}
	defer file.Close()

	// Validar tamanho do arquivo antes de processar
	maxSize := int64(10 << 20) // 10MB
	if fileHeader.Size > maxSize {
		HandleError(w, NewAppError(http.StatusBadRequest, "Arquivo muito grande. Tamanho máximo: 10MB", nil), "Erro ao processar upload")
		return
	}

	if fileHeader.Size == 0 {
		HandleError(w, NewAppError(http.StatusBadRequest, "Arquivo vazio", nil), "Erro ao processar upload")
		return
	}

	// Ler XML completo para enviar ao worker pool
	xmlData, err := io.ReadAll(file)
	if err != nil {
		HandleError(w, NewAppError(http.StatusBadRequest, "Erro ao ler arquivo", err), "Erro ao processar upload")
		return
	}

	// Obter usuário do contexto
	user, _ := GetUserFromContext(r)
	var userID *int32
	userEmail := "system"
	if user != nil {
		userID = &user.ID
		userEmail = user.Email
	}

	// Processar via worker pool (assíncrono)
	result, err := h.NFeWorkerPool.ProcessXMLFromReader(r.Context(), bytes.NewReader(xmlData), userID, userEmail)
	if err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao processar NF-e", err), "Erro ao processar upload")
		return
	}

	if !result.Success {
		if result.Error == gorm.ErrDuplicatedKey {
			HandleError(w, ErrDuplicateNFe, "Erro ao processar NF-e")
			return
		}
		HandleError(w, NewAppErrorWithContext(
			http.StatusInternalServerError,
			"Erro ao processar NF-e",
			result.Error,
			map[string]interface{}{"access_key": result.AccessKey},
		), "Erro ao processar NF-e")
		return
	}

	slog.Info("NF-e processada",
		"access_key", result.AccessKey,
		"total_items", result.Items,
		"user_email", userEmail,
		"duration_ms", result.Duration.Milliseconds(),
	)

	// Invalidar cache do dashboard e estoque usando tags (mais eficiente)
	InvalidateCacheByTags(TagDashboard, TagStock)

	RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message":     "NF-e processada com sucesso",
		"total_items": result.Items,
		"access_key":  result.AccessKey,
	})
}

func (h *Handler) StockHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	search := r.URL.Query().Get("search")
	categoryID := r.URL.Query().Get("category_id")
	params := ParsePaginationParams(r)

	list, total, err := h.ProductService.GetStockList(search, categoryID, params.Page, params.Limit)
	if err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao buscar estoque", err), "Erro ao buscar estoque")
		return
	}

	response := NewPaginatedResponse(list, total, params)
	RespondWithJSON(w, http.StatusOK, response)
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
		HandleError(w, NewAppErrorWithContext(
			http.StatusInternalServerError,
			"Erro ao gerar relatório de movimentações",
			err,
			map[string]interface{}{
				"start_date": startDateStr,
				"end_date":   endDateStr,
			},
		), "Erro ao gerar relatório")
		return
	}

	RespondWithJSON(w, http.StatusOK, reportData)
}

func stringPtr(s string) *string {
	return &s
}
