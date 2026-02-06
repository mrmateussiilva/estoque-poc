package api

import (
	"encoding/json"
	"encoding/xml"
	"estoque/internal/models"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Handler struct {
	DB *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler {
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

	err = h.DB.Transaction(func(tx *gorm.DB) error {
		// Verificar duplicação
		var count int64
		tx.Model(&models.ProcessedNFe{}).Where("access_key = ?", proc.NFe.InfNFe.ID).Count(&count)
		if count > 0 {
			return gorm.ErrDuplicatedKey
		}

		// Registrar NF-e processada
		totalItems := len(proc.NFe.InfNFe.Det)
		nfe := models.ProcessedNFe{
			AccessKey:  proc.NFe.InfNFe.ID,
			TotalItems: totalItems,
		}
		if err := tx.Create(&nfe).Error; err != nil {
			return err
		}

		// Processar cada produto
		for _, det := range proc.NFe.InfNFe.Det {
			// Inserir/atualizar produto
			product := models.Product{
				Code: det.Prod.CProd,
				Name: det.Prod.XProd,
				Unit: "UN",
			}
			if err := tx.FirstOrCreate(&product, models.Product{Code: product.Code}).Error; err != nil {
				return err
			}

			// Criar movimentação de entrada
			movement := models.Movement{
				ProductCode: det.Prod.CProd,
				Type:        "ENTRADA",
				Quantity:    det.Prod.QCom,
				Origin:      stringPtr("NFE"),
				Reference:   stringPtr(proc.NFe.InfNFe.ID),
			}
			if err := tx.Create(&movement).Error; err != nil {
				return err
			}

			// Atualizar estoque
			var stock models.Stock
			err := tx.First(&stock, "product_code = ?", det.Prod.CProd).Error
			if err == gorm.ErrRecordNotFound {
				stock = models.Stock{
					ProductCode: det.Prod.CProd,
					Quantity:    det.Prod.QCom,
				}
				if err := tx.Create(&stock).Error; err != nil {
					return err
				}
			} else if err != nil {
				return err
			} else {
				stock.Quantity += det.Prod.QCom
				if err := tx.Save(&stock).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})

	if err != nil {
		if err == gorm.ErrDuplicatedKey {
			RespondWithError(w, http.StatusConflict, "Esta NF-e já foi processada anteriormente")
			return
		}
		RespondWithError(w, http.StatusInternalServerError, "Transaction error: "+err.Error())
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message":     "NF-e processada com sucesso",
		"total_items": len(proc.NFe.InfNFe.Det),
	})
}

func (h *Handler) StockHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	db := h.DB.Model(&models.Product{}).
		Preload("Stock").
		Preload("Category").
		Where("active = ?", true)

	// Busca por nome ou código
	if search := r.URL.Query().Get("search"); search != "" {
		db = db.Where("code LIKE ? OR name LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// Filtro por categoria
	if categoryID := r.URL.Query().Get("category_id"); categoryID != "" {
		db = db.Where("category_id = ?", categoryID)
	}

	var products []models.Product
	if err := db.Order("name ASC").Find(&products).Error; err != nil {
		RespondWithError(w, http.StatusInternalServerError, "DB Error: "+err.Error())
		return
	}

	// Mapear para StockItem (formato esperado pelo frontend)
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

	RespondWithJSON(w, http.StatusOK, list)
}

func stringPtr(s string) *string {
	return &s
}
