package utils

import (
	"estoque/internal/models"
)

// ReportItem representa um item de relatório que pode ser reutilizado
type ReportItem struct {
	ProductCode string
	ProductName string
	Quantity    float64
	Type        string
	Date        string
}

// Reset limpa os dados do ReportItem para reutilização
func (r *ReportItem) Reset() {
	r.ProductCode = ""
	r.ProductName = ""
	r.Quantity = 0
	r.Type = ""
	r.Date = ""
}

// ReportItemPool é um pool específico para ReportItem
var ReportItemPool = NewObjectPool(func() interface{} {
	return &ReportItem{}
})

// GetReportItem obtém um ReportItem do pool
func GetReportItem() *ReportItem {
	return ReportItemPool.GetAndReset().(*ReportItem)
}

// PutReportItem retorna um ReportItem ao pool
func PutReportItem(item *ReportItem) {
	ReportItemPool.PutAndReset(item)
}

// StockItemPool é um pool para StockItem (usado em relatórios)
var StockItemPool = NewObjectPool(func() interface{} {
	return &models.StockItem{
		// Pre-alocar slice se necessário
	}
})

// GetStockItem obtém um StockItem do pool
func GetStockItem() *models.StockItem {
	return StockItemPool.Get().(*models.StockItem)
}

// PutStockItem retorna um StockItem ao pool
func PutStockItem(item *models.StockItem) {
	StockItemPool.Put(item)
}
