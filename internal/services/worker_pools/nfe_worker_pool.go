package worker_pools

import (
	"context"
	"encoding/xml"
	"estoque/internal/models"
	"estoque/internal/services"
	"io"
	"log/slog"
	"sync"
	"time"

	"gorm.io/gorm"
)

// NFeJob representa um trabalho de processamento de NF-e
type NFeJob struct {
	XMLData  []byte
	UserID   *int32
	UserEmail string
	ResultChan chan NFeResult
}

// NFeResult representa o resultado do processamento
type NFeResult struct {
	Success   bool
	Items     int
	AccessKey string
	Error     error
	Duration  time.Duration
}

// NFeWorkerPool gerencia workers para processar NF-es em paralelo
type NFeWorkerPool struct {
	workers    int
	jobQueue   chan NFeJob
	db         *gorm.DB
	wg         sync.WaitGroup
	ctx        context.Context
	cancel     context.CancelFunc
	metrics    *NFeMetrics
}

// NFeMetrics armazena métricas do worker pool
type NFeMetrics struct {
	ProcessedTotal int64
	ProcessedSuccess int64
	ProcessedErrors int64
	mu sync.RWMutex
}

// NewNFeWorkerPool cria um novo worker pool para processamento de NF-e
func NewNFeWorkerPool(workers int, db *gorm.DB) *NFeWorkerPool {
	if workers <= 0 {
		workers = 5 // Default: 5 workers
	}
	
	ctx, cancel := context.WithCancel(context.Background())
	
	return &NFeWorkerPool{
		workers:  workers,
		jobQueue: make(chan NFeJob, 100), // Buffer de 100 jobs
		db:       db,
		ctx:      ctx,
		cancel:   cancel,
		metrics:  &NFeMetrics{},
	}
}

// Start inicia os workers do pool
func (p *NFeWorkerPool) Start() {
	slog.Info("Starting NFe Worker Pool", "workers", p.workers)
	
	for i := 0; i < p.workers; i++ {
		p.wg.Add(1)
		go p.worker(i)
	}
}

// Stop para o worker pool gracefulmente
func (p *NFeWorkerPool) Stop() {
	slog.Info("Stopping NFe Worker Pool")
	p.cancel()
	close(p.jobQueue)
	p.wg.Wait()
	slog.Info("NFe Worker Pool stopped")
}

// Submit envia um job para processamento assíncrono
func (p *NFeWorkerPool) Submit(job NFeJob) error {
	// Verificar se contexto foi cancelado primeiro
	select {
	case <-p.ctx.Done():
		return p.ctx.Err()
	default:
	}
	
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
func (p *NFeWorkerPool) SubmitSync(job NFeJob) (NFeResult, error) {
	resultChan := make(chan NFeResult, 1)
	job.ResultChan = resultChan
	
	if err := p.Submit(job); err != nil {
		return NFeResult{Success: false, Error: err}, err
	}
	
	select {
	case <-p.ctx.Done():
		return NFeResult{Success: false, Error: p.ctx.Err()}, p.ctx.Err()
	case result := <-resultChan:
		return result, nil
	case <-time.After(5 * time.Minute): // Timeout de 5 minutos
		return NFeResult{Success: false, Error: context.DeadlineExceeded}, context.DeadlineExceeded
	}
}

// worker processa jobs do pool
func (p *NFeWorkerPool) worker(id int) {
	defer p.wg.Done()
	
	nfeService := services.NewNfeService(p.db)
	
	slog.Debug("NFe worker started", "worker_id", id)
	
	for {
		select {
		case <-p.ctx.Done():
			slog.Debug("NFe worker stopping", "worker_id", id)
			return
		case job, ok := <-p.jobQueue:
			if !ok {
				slog.Debug("NFe worker queue closed", "worker_id", id)
				return
			}
			
			start := time.Now()
			result := p.processNFe(nfeService, job, id)
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

// processNFe processa uma NF-e
func (p *NFeWorkerPool) processNFe(nfeService *services.NfeService, job NFeJob, workerID int) NFeResult {
	slog.Info("Processing NFe", 
		"worker_id", workerID,
		"user_email", job.UserEmail,
		"xml_size", len(job.XMLData),
	)
	
	// Decodificar XML
	var proc models.NfeProc
	if err := xml.Unmarshal(job.XMLData, &proc); err != nil {
		slog.Error("Error decoding XML", 
			"worker_id", workerID,
			"error", err,
		)
		return NFeResult{
			Success: false,
			Error:   err,
		}
	}
	
	accessKey := proc.NFe.InfNFe.ID
	
	// Processar NF-e
	totalItems, err := nfeService.ProcessNfe(&proc)
	if err != nil {
		slog.Error("Error processing NFe", 
			"worker_id", workerID,
			"access_key", accessKey,
			"error", err,
		)
		return NFeResult{
			Success:   false,
			AccessKey: accessKey,
			Error:     err,
		}
	}
	
	slog.Info("NFe processed successfully", 
		"worker_id", workerID,
		"access_key", accessKey,
		"items", totalItems,
	)
	
	return NFeResult{
		Success:   true,
		Items:     totalItems,
		AccessKey: accessKey,
	}
}

// updateMetrics atualiza as métricas do pool
func (p *NFeWorkerPool) updateMetrics(result NFeResult) {
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
func (p *NFeWorkerPool) GetMetrics() (total, success, errors int64) {
	p.metrics.mu.RLock()
	defer p.metrics.mu.RUnlock()
	
	return p.metrics.ProcessedTotal, p.metrics.ProcessedSuccess, p.metrics.ProcessedErrors
}

// ProcessXMLFromReader processa XML a partir de um io.Reader
func (p *NFeWorkerPool) ProcessXMLFromReader(ctx context.Context, reader io.Reader, userID *int32, userEmail string) (NFeResult, error) {
	// Ler XML completo
	xmlData, err := io.ReadAll(reader)
	if err != nil {
		return NFeResult{Success: false, Error: err}, err
	}
	
	job := NFeJob{
		XMLData:   xmlData,
		UserID:    userID,
		UserEmail: userEmail,
	}
	
	return p.SubmitSync(job)
}
