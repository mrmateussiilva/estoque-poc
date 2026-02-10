package api

import (
	"encoding/csv"
	"estoque/internal/models"
	"net/http"
	"strconv"
	"time"
)

// ExportStockHandler exporta lista de estoque em CSV
func (h *Handler) ExportStockHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Método não permitido")
		return
	}

	search := r.URL.Query().Get("search")
	categoryID := r.URL.Query().Get("category_id")

	// Buscar todos os produtos (sem paginação para exportação)
	list, _, err := h.ProductService.GetStockList(search, categoryID, 1, 10000)
	if err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao buscar estoque", err), "Erro ao exportar")
		return
	}

	// Configurar headers para download CSV
	filename := "estoque_" + time.Now().Format("20060102_150405") + ".csv"
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename="+filename)
	w.Header().Set("Content-Transfer-Encoding", "binary")

	// Criar writer CSV
	writer := csv.NewWriter(w)
	defer writer.Flush()

	// Escrever cabeçalho
	header := []string{
		"Código",
		"Nome",
		"Quantidade",
		"Unidade",
		"Estoque Mínimo",
		"Estoque Máximo",
		"Categoria",
		"Preço de Custo",
		"Preço de Venda",
		"Localização",
		"Status",
	}
	if err := writer.Write(header); err != nil {
		return
	}

	// Escrever dados
	for _, item := range list {
		status := "Em Estoque"
		if item.Quantity <= 0 {
			status = "Esgotado"
		} else if item.Quantity < item.MinStock {
			status = "Baixo Estoque"
		}

		maxStock := ""
		if item.MaxStock != nil {
			maxStock = strconv.FormatFloat(*item.MaxStock, 'f', 2, 64)
		}

		record := []string{
			item.Code,
			item.Name,
			strconv.FormatFloat(item.Quantity, 'f', 2, 64),
			item.Unit,
			strconv.FormatFloat(item.MinStock, 'f', 2, 64),
			maxStock,
			item.CategoryName,
			strconv.FormatFloat(item.CostPrice, 'f', 2, 64),
			strconv.FormatFloat(item.SalePrice, 'f', 2, 64),
			getStringValue(item.Location),
			status,
		}
		if err := writer.Write(record); err != nil {
			return
		}
	}
}

// ExportMovementsHandler exporta movimentações em CSV
func (h *Handler) ExportMovementsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Método não permitido")
		return
	}

	// Buscar movimentações (sem paginação para exportação)
	db := h.DB.Model(&models.Movement{}).Order("created_at DESC").Limit(10000)

	if productCode := r.URL.Query().Get("product_code"); productCode != "" {
		db = db.Where("product_code = ?", productCode)
	}
	if movType := r.URL.Query().Get("type"); movType != "" {
		db = db.Where("type = ?", movType)
	}

	var movements []models.Movement
	if err := db.Preload("Product").Preload("User").Find(&movements).Error; err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao buscar movimentações", err), "Erro ao exportar")
		return
	}

	// Configurar headers para download CSV
	filename := "movimentacoes_" + time.Now().Format("20060102_150405") + ".csv"
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename="+filename)
	w.Header().Set("Content-Transfer-Encoding", "binary")

	// Criar writer CSV
	writer := csv.NewWriter(w)
	defer writer.Flush()

	// Escrever cabeçalho
	header := []string{
		"Data",
		"Produto (Código)",
		"Produto (Nome)",
		"Tipo",
		"Quantidade",
		"Origem",
		"Referência",
		"Usuário",
		"Observações",
	}
	if err := writer.Write(header); err != nil {
		return
	}

	// Escrever dados
	for _, m := range movements {
		userEmail := ""
		if m.User != nil {
			userEmail = m.User.Email
		}

		productName := ""
		if m.Product != nil {
			productName = m.Product.Name
		}

		record := []string{
			m.CreatedAt.Format("02/01/2006 15:04:05"),
			m.ProductCode,
			productName,
			m.Type,
			strconv.FormatFloat(m.Quantity, 'f', 2, 64),
			getStringValue(m.Origin),
			getStringValue(m.Reference),
			userEmail,
			getStringValue(m.Notes),
		}
		if err := writer.Write(record); err != nil {
			return
		}
	}
}

func getStringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
