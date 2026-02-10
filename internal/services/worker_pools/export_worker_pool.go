package worker_pools

import (
	"context"
	"encoding/csv"
	"estoque/internal/models"
	"estoque/internal/services"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"gorm.io/gorm"
)

// ExportType define o tipo de exportação
type ExportType string

const (
	ExportTypeStock      ExportType = "stock"
	ExportTypeMovements ExportType = "movements"
)

// ExportJob representa um trabalho de exportação
type ExportJob struct {
	Type       ExportType
	Filters    map[string]string
	UserID     *int32
	UserEmail  string
	ResultChan chan ExportResult
}

// ExportResult representa o resultado da exportação
type ExportResult struct {
	Success   bool
	FilePath  string
	FileName  string
	Error     error
	Duration  time.Duration
	RowCount  int
}

// ExportWorkerPool gerencia workers para processar exportações em background
type ExportWorkerPool struct {
	workers      int
	jobQueue     chan ExportJob
	db           *gorm.DB
	productService *services.ProductService
	exportDir    string
	wg           sync.WaitGroup
	ctx          context.Context
	cancel       context.CancelFunc
	metrics      *ExportMetrics
}

// ExportMetrics armazena métricas do worker pool
type ExportMetrics struct {
	ProcessedTotal   int64
	ProcessedSuccess int64
	ProcessedErrors  int64
	mu               sync.RWMutex
}

// NewExportWorkerPool cria um novo worker pool para exportações
func NewExportWorkerPool(workers int, db *gorm.DB, exportDir string) *ExportWorkerPool {
	if workers <= 0 {
		workers = 3 // Default: 3 workers (exportações são mais pesadas)
	}
	
	if exportDir == "" {
		exportDir = "./exports"
	}
	
	// Garantir que o diretório existe
	_ = os.MkdirAll(exportDir, 0755)
	
	ctx, cancel := context.WithCancel(context.Background())
	
	return &ExportWorkerPool{
		workers:        workers,
		jobQueue:       make(chan ExportJob, 50), // Buffer menor (exportações são maiores)
		db:             db,
		productService: services.NewProductService(db),
		exportDir:      exportDir,
		ctx:            ctx,
		cancel:         cancel,
		metrics:        &ExportMetrics{},
	}
}

// Start inicia os workers do pool
func (p *ExportWorkerPool) Start() {
	slog.Info("Starting Export Worker Pool", "workers", p.workers, "export_dir", p.exportDir)
	
	for i := 0; i < p.workers; i++ {
		p.wg.Add(1)
		go p.worker(i)
	}
}

// Stop para o worker pool gracefulmente
func (p *ExportWorkerPool) Stop() {
	slog.Info("Stopping Export Worker Pool")
	p.cancel()
	close(p.jobQueue)
	p.wg.Wait()
	slog.Info("Export Worker Pool stopped")
}

// Submit envia um job para processamento assíncrono
func (p *ExportWorkerPool) Submit(job ExportJob) error {
	select {
	case <-p.ctx.Done():
		return p.ctx.Err()
	case p.jobQueue <- job:
		return nil
	default:
		// Queue cheia - bloquear até ter espaço
		select {
		case <-p.ctx.Done():
			return p.ctx.Err()
		case p.jobQueue <- job:
			return nil
		}
	}
}

// SubmitSync envia um job e aguarda o resultado
func (p *ExportWorkerPool) SubmitSync(job ExportJob) (ExportResult, error) {
	resultChan := make(chan ExportResult, 1)
	job.ResultChan = resultChan
	
	if err := p.Submit(job); err != nil {
		return ExportResult{Success: false, Error: err}, err
	}
	
	select {
	case <-p.ctx.Done():
		return ExportResult{Success: false, Error: p.ctx.Err()}, p.ctx.Err()
	case result := <-resultChan:
		return result, nil
	case <-time.After(10 * time.Minute): // Timeout de 10 minutos para exportações
		return ExportResult{Success: false, Error: context.DeadlineExceeded}, context.DeadlineExceeded
	}
}

// worker processa jobs do pool
func (p *ExportWorkerPool) worker(id int) {
	defer p.wg.Done()
	
	slog.Debug("Export worker started", "worker_id", id)
	
	for {
		select {
		case <-p.ctx.Done():
			slog.Debug("Export worker stopping", "worker_id", id)
			return
		case job, ok := <-p.jobQueue:
			if !ok {
				slog.Debug("Export worker queue closed", "worker_id", id)
				return
			}
			
			start := time.Now()
			result := p.processExport(job, id)
			result.Duration = time.Since(start)
			
			// Atualizar métricas
			p.updateMetrics(result)
			
			// Enviar resultado se houver canal
			if job.ResultChan != nil {
				select {
				case job.ResultChan <- result:
				case <-p.ctx.Done():
					return
				}
			}
		}
	}
}

// processExport processa uma exportação
func (p *ExportWorkerPool) processExport(job ExportJob, workerID int) ExportResult {
	slog.Info("Processing export", 
		"worker_id", workerID,
		"type", job.Type,
		"user_email", job.UserEmail,
	)
	
	var result ExportResult
	
	switch job.Type {
	case ExportTypeStock:
		result = p.exportStock(job, workerID)
	case ExportTypeMovements:
		result = p.exportMovements(job, workerID)
	default:
		result = ExportResult{
			Success: false,
			Error:   fmt.Errorf("unknown export type: %s", job.Type),
		}
	}
	
	return result
}

// exportStock exporta dados de estoque
func (p *ExportWorkerPool) exportStock(job ExportJob, workerID int) ExportResult {
	search := job.Filters["search"]
	categoryID := job.Filters["category_id"]
	
	// Buscar todos os produtos (sem paginação para exportação)
	list, _, err := p.productService.GetStockList(search, categoryID, 1, 100000)
	if err != nil {
		slog.Error("Error fetching stock for export", 
			"worker_id", workerID,
			"error", err,
		)
		return ExportResult{
			Success: false,
			Error:   err,
		}
	}
	
	// Criar arquivo temporário
	filename := fmt.Sprintf("estoque_%s_%d.csv", 
		time.Now().Format("20060102_150405"),
		time.Now().UnixNano(),
	)
	filePath := filepath.Join(p.exportDir, filename)
	
	file, err := os.Create(filePath)
	if err != nil {
		slog.Error("Error creating export file", 
			"worker_id", workerID,
			"error", err,
		)
		return ExportResult{
			Success: false,
			Error:   err,
		}
	}
	defer file.Close()
	
	writer := csv.NewWriter(file)
	defer writer.Flush()
	
	// Escrever cabeçalho
	header := []string{
		"Código", "Nome", "Quantidade", "Unidade",
		"Estoque Mínimo", "Estoque Máximo", "Categoria",
		"Preço de Custo", "Preço de Venda", "Localização", "Status",
	}
	if err := writer.Write(header); err != nil {
		return ExportResult{Success: false, Error: err}
	}
	
	// Escrever dados
	rowCount := 0
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
			return ExportResult{Success: false, Error: err}
		}
		rowCount++
	}
	
	slog.Info("Stock export completed", 
		"worker_id", workerID,
		"file", filePath,
		"rows", rowCount,
	)
	
	return ExportResult{
		Success:  true,
		FilePath: filePath,
		FileName: filename,
		RowCount: rowCount,
	}
}

// exportMovements exporta movimentações
func (p *ExportWorkerPool) exportMovements(job ExportJob, workerID int) ExportResult {
	db := p.db.Model(&models.Movement{}).Order("created_at DESC").Limit(100000)
	
	if productCode := job.Filters["product_code"]; productCode != "" {
		db = db.Where("product_code = ?", productCode)
	}
	if movType := job.Filters["type"]; movType != "" {
		db = db.Where("type = ?", movType)
	}
	
	var movements []models.Movement
	if err := db.Preload("Product").Preload("User").Find(&movements).Error; err != nil {
		slog.Error("Error fetching movements for export", 
			"worker_id", workerID,
			"error", err,
		)
		return ExportResult{
			Success: false,
			Error:   err,
		}
	}
	
	// Criar arquivo temporário
	filename := fmt.Sprintf("movimentacoes_%s_%d.csv", 
		time.Now().Format("20060102_150405"),
		time.Now().UnixNano(),
	)
	filePath := filepath.Join(p.exportDir, filename)
	
	file, err := os.Create(filePath)
	if err != nil {
		return ExportResult{Success: false, Error: err}
	}
	defer file.Close()
	
	writer := csv.NewWriter(file)
	defer writer.Flush()
	
	// Escrever cabeçalho
	header := []string{
		"Data", "Produto (Código)", "Produto (Nome)", "Tipo",
		"Quantidade", "Origem", "Referência", "Usuário", "Observações",
	}
	if err := writer.Write(header); err != nil {
		return ExportResult{Success: false, Error: err}
	}
	
	// Escrever dados
	rowCount := 0
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
			return ExportResult{Success: false, Error: err}
		}
		rowCount++
	}
	
	slog.Info("Movements export completed", 
		"worker_id", workerID,
		"file", filePath,
		"rows", rowCount,
	)
	
	return ExportResult{
		Success:  true,
		FilePath: filePath,
		FileName: filename,
		RowCount: rowCount,
	}
}

// updateMetrics atualiza as métricas do pool
func (p *ExportWorkerPool) updateMetrics(result ExportResult) {
	p.metrics.mu.Lock()
	defer p.metrics.mu.Unlock()
	
	p.metrics.ProcessedTotal++
	if result.Success {
		p.metrics.ProcessedSuccess++
	} else {
		p.metrics.ProcessedErrors++
	}
}

// GetMetrics retorna as métricas atuais
func (p *ExportWorkerPool) GetMetrics() (total, success, errors int64) {
	p.metrics.mu.RLock()
	defer p.metrics.mu.RUnlock()
	
	return p.metrics.ProcessedTotal, p.metrics.ProcessedSuccess, p.metrics.ProcessedErrors
}

// Helper function
func getStringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
