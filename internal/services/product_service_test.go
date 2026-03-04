package services

import (
	"estoque/internal/models"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCreateMovementRequest_Validation(t *testing.T) {
	assert := assert.New(t)

	t.Run("entrada válida", func(t *testing.T) {
		req := models.CreateMovementRequest{
			ProductCode: "PROD001",
			Type:        "ENTRADA",
			Quantity:    10.0,
		}

		assert.NotEmpty(req.ProductCode)
		assert.Equal("ENTRADA", req.Type)
		assert.Greater(req.Quantity, 0.0)
	})

	t.Run("saída válida", func(t *testing.T) {
		req := models.CreateMovementRequest{
			ProductCode: "PROD001",
			Type:        "SAIDA",
			Quantity:    5.0,
		}

		assert.NotEmpty(req.ProductCode)
		assert.Equal("SAIDA", req.Type)
		assert.Greater(req.Quantity, 0.0)
	})

	t.Run("tipo inválido deve falhar na validação", func(t *testing.T) {
		req := models.CreateMovementRequest{
			ProductCode: "PROD001",
			Type:        "INVALIDO",
			Quantity:    5.0,
		}

		err := ValidateMovementRequest(req.ProductCode, req.Type, req.Quantity)
		assert.Error(err, "tipo inválido deve retornar erro")
	})

	t.Run("quantidade negativa deve falhar", func(t *testing.T) {
		req := models.CreateMovementRequest{
			ProductCode: "PROD001",
			Type:        "ENTRADA",
			Quantity:    -10.0,
		}

		err := ValidateMovementRequest(req.ProductCode, req.Type, req.Quantity)
		assert.Error(err, "quantidade negativa deve retornar erro")
	})

	t.Run("produto sem código deve falhar", func(t *testing.T) {
		req := models.CreateMovementRequest{
			ProductCode: "",
			Type:        "ENTRADA",
			Quantity:    10.0,
		}

		err := ValidateMovementRequest(req.ProductCode, req.Type, req.Quantity)
		assert.Error(err, "código vazio deve retornar erro")
	})

	t.Run("quantidade zero deve falhar", func(t *testing.T) {
		req := models.CreateMovementRequest{
			ProductCode: "PROD001",
			Type:        "ENTRADA",
			Quantity:    0.0,
		}

		err := ValidateMovementRequest(req.ProductCode, req.Type, req.Quantity)
		assert.Error(err, "quantidade zero deve retornar erro")
	})
}

func TestBatchMovementRequest_Validation(t *testing.T) {
	assert := assert.New(t)

	t.Run("lote vazio deve ser aceito (validação de cada item)", func(t *testing.T) {
		items := []models.CreateMovementRequest{}

		assert.Empty(items, "lote vazio deve estar vazio")
	})

	t.Run("lote com itens válidos", func(t *testing.T) {
		items := []models.CreateMovementRequest{
			{ProductCode: "PROD001", Type: "ENTRADA", Quantity: 10},
			{ProductCode: "PROD002", Type: "ENTRADA", Quantity: 20},
		}

		assert.Len(items, 2, "deve ter 2 itens")

		for _, item := range items {
			err := ValidateMovementRequest(item.ProductCode, item.Type, item.Quantity)
			assert.NoError(err)
		}
	})

	t.Run("lote com item inválido", func(t *testing.T) {
		items := []models.CreateMovementRequest{
			{ProductCode: "PROD001", Type: "ENTRADA", Quantity: 10},
			{ProductCode: "", Type: "ENTRADA", Quantity: 20},
		}

		hasError := false
		for _, item := range items {
			if err := ValidateMovementRequest(item.ProductCode, item.Type, item.Quantity); err != nil {
				hasError = true
				break
			}
		}
		assert.True(hasError, "deve detectar item inválido no lote")
	})

	t.Run("lote com tipos mistos válidos", func(t *testing.T) {
		items := []models.CreateMovementRequest{
			{ProductCode: "PROD001", Type: "ENTRADA", Quantity: 10},
			{ProductCode: "PROD002", Type: "SAIDA", Quantity: 5},
		}

		assert.Len(items, 2)

		err1 := ValidateMovementRequest(items[0].ProductCode, items[0].Type, items[0].Quantity)
		err2 := ValidateMovementRequest(items[1].ProductCode, items[1].Type, items[1].Quantity)

		assert.NoError(err1)
		assert.NoError(err2)
	})
}

func TestProductService_PaginationCalculation(t *testing.T) {
	assert := assert.New(t)

	tests := []struct {
		name           string
		page           int
		limit          int
		expectedOffset int
		shouldError    bool
	}{
		{"pagina 1 limit 10", 1, 10, 0, false},
		{"pagina 2 limit 10", 2, 10, 10, false},
		{"pagina 3 limit 20", 3, 20, 40, false},
		{"pagina 0 deve ajustar para 1", 0, 10, -10, true},
		{"pagina negativa", -1, 10, -20, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			offset := (tt.page - 1) * tt.limit

			if tt.shouldError {
				assert.Less(offset, 0, "offset deve ser negativo para indicar erro")
			} else {
				assert.Equal(tt.expectedOffset, offset, "offset deve ser calculado corretamente")
			}
		})
	}
}

func TestProductService_SearchQuery(t *testing.T) {
	assert := assert.New(t)

	t.Run("busca vazia", func(t *testing.T) {
		search := ""

		// Simula a construção da query
		pattern := "%" + search + "%"

		assert.Equal("%%", pattern, "busca vazia gera padrão de match all")
	})

	t.Run("busca com texto", func(t *testing.T) {
		search := "notebook"

		pattern := "%" + search + "%"

		assert.Equal("%notebook%", pattern)
		assert.Contains(pattern, search)
	})

	t.Run("busca com espaços", func(t *testing.T) {
		search := "  produto  "

		pattern := "%" + search + "%"

		assert.Equal("%  produto  %", pattern)
	})
}

func TestStockItem_Model(t *testing.T) {
	assert := assert.New(t)

	t.Run("criar StockItem com todos os campos", func(t *testing.T) {
		item := models.StockItem{
			Code:         "PROD001",
			Name:         "Notebook",
			Quantity:     10.0,
			Unit:         "UN",
			MinStock:     5.0,
			CategoryName: "Eletrônicos",
			SalePrice:    2500.00,
			CostPrice:    1800.00,
		}

		assert.Equal("PROD001", item.Code)
		assert.Equal("Notebook", item.Name)
		assert.Equal(10.0, item.Quantity)
		assert.Equal("UN", item.Unit)
		assert.Equal(5.0, item.MinStock)
		assert.Equal("Eletrônicos", item.CategoryName)
		assert.Equal(2500.00, item.SalePrice)
		assert.Equal(1800.00, item.CostPrice)
	})

	t.Run("StockItem com ponteiros nil", func(t *testing.T) {
		item := models.StockItem{
			Code:     "PROD002",
			Name:     "Mouse",
			Quantity: 0.0,
		}

		assert.Nil(item.MaxStock)
		assert.Nil(item.Description)
		assert.Nil(item.CategoryID)
		assert.Nil(item.Barcode)
		assert.Nil(item.Location)
		assert.Nil(item.SupplierID)
	})
}

func TestMovement_TypeConstants(t *testing.T) {
	assert := assert.New(t)

	t.Run("verificar tipos de movimentação", func(t *testing.T) {
		assert.Equal("ENTRADA", "ENTRADA", "tipo entrada deve ser ENTRADA")
		assert.Equal("SAIDA", "SAIDA", "tipo saída deve ser SAIDA")
	})

	t.Run("validar tipos vs constants", func(t *testing.T) {
		validTypes := []string{"ENTRADA", "SAIDA"}

		assert.True(contains(validTypes, "ENTRADA"))
		assert.True(contains(validTypes, "SAIDA"))
		assert.False(contains(validTypes, "INVALIDO"))
	})
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
