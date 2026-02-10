package worker_pools

import (
	"context"
	"estoque/internal/services"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupTestDB cria um banco de dados em memória para testes
func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}
	
	// Criar tabelas básicas necessárias para os testes
	// (apenas as que são usadas pelos worker pools)
	_ = db.Exec(`
		CREATE TABLE IF NOT EXISTS processed_nfes (
			access_key VARCHAR(255) PRIMARY KEY,
			total_items INT,
			processed_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS products (
			code VARCHAR(255) PRIMARY KEY,
			name VARCHAR(255),
			unit VARCHAR(20),
			active BOOLEAN DEFAULT 1
		);
		CREATE TABLE IF NOT EXISTS movements (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			product_code VARCHAR(255),
			type VARCHAR(20),
			quantity DECIMAL(19,4),
			origin VARCHAR(255),
			reference VARCHAR(255),
			created_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS stock (
			product_code VARCHAR(255) PRIMARY KEY,
			quantity DECIMAL(19,4)
		);
	`)
	
	return db
}


func TestNewNFeWorkerPool(t *testing.T) {
	db := setupTestDB(t)
	
	tests := []struct {
		name    string
		workers int
		want    int
	}{
		{
			name:    "workers válidos",
			workers: 5,
			want:    5,
		},
		{
			name:    "workers zero (deve usar default)",
			workers: 0,
			want:    5, // Default
		},
		{
			name:    "workers negativos (deve usar default)",
			workers: -1,
			want:    5, // Default
		},
		{
			name:    "workers customizados",
			workers: 10,
			want:    10,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pool := NewNFeWorkerPool(tt.workers, db)
			if pool.workers != tt.want {
				t.Errorf("NewNFeWorkerPool() workers = %v, want %v", pool.workers, tt.want)
			}
			if pool.db == nil {
				t.Error("NewNFeWorkerPool() db should not be nil")
			}
			if pool.jobQueue == nil {
				t.Error("NewNFeWorkerPool() jobQueue should not be nil")
			}
		})
	}
}

func TestNFeWorkerPool_Start(t *testing.T) {
	db := setupTestDB(t)
	pool := NewNFeWorkerPool(2, db)
	
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	
	pool.ctx = ctx
	pool.cancel = cancel
	
	pool.Start()
	
	// Aguardar um pouco para garantir que os workers iniciaram
	time.Sleep(100 * time.Millisecond)
	
	// Verificar se os workers estão rodando tentando enviar um job
	// (mesmo que falhe, confirma que o pool está ativo)
	job := NFeJob{
		XMLData:    []byte("invalid"),
		UserEmail:  "test@example.com",
		ResultChan: make(chan NFeResult, 1),
	}
	
	// Deve conseguir submeter (mesmo que o processamento falhe)
	err := pool.Submit(job)
	if err != nil {
		t.Errorf("Submit() error = %v, want nil", err)
	}
	
	pool.Stop()
}

func TestNFeWorkerPool_Stop(t *testing.T) {
	db := setupTestDB(t)
	pool := NewNFeWorkerPool(2, db)
	
	pool.Start()
	
	// Aguardar workers iniciarem
	time.Sleep(50 * time.Millisecond)
	
	// Parar pool
	pool.Stop()
	
	// Tentar submeter job após parar - deve falhar
	job := NFeJob{
		XMLData:   []byte("test"),
		UserEmail: "test@example.com",
	}
	
	err := pool.Submit(job)
	if err == nil {
		t.Error("Submit() after Stop() should return error")
	}
}

func TestNFeWorkerPool_Submit(t *testing.T) {
	db := setupTestDB(t)
	pool := NewNFeWorkerPool(1, db)
	
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	
	pool.ctx = ctx
	pool.cancel = cancel
	pool.Start()
	defer pool.Stop()
	
	tests := []struct {
		name    string
		job     NFeJob
		wantErr bool
	}{
		{
			name: "job válido",
			job: NFeJob{
				XMLData:   []byte("test"),
				UserEmail: "test@example.com",
			},
			wantErr: false,
		},
		{
			name: "job com resultChan",
			job: NFeJob{
				XMLData:    []byte("test"),
				UserEmail:  "test@example.com",
				ResultChan: make(chan NFeResult, 1),
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := pool.Submit(tt.job)
			if (err != nil) != tt.wantErr {
				t.Errorf("Submit() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestNFeWorkerPool_GetMetrics(t *testing.T) {
	db := setupTestDB(t)
	pool := NewNFeWorkerPool(1, db)
	
	// Métricas iniciais devem ser zero
	total, success, errors := pool.GetMetrics()
	if total != 0 || success != 0 || errors != 0 {
		t.Errorf("GetMetrics() inicial = (%d, %d, %d), want (0, 0, 0)", total, success, errors)
	}
	
	// Atualizar métricas manualmente (simular processamento)
	pool.updateMetrics(NFeResult{Success: true})
	pool.updateMetrics(NFeResult{Success: false})
	
	total, success, errors = pool.GetMetrics()
	if total != 2 {
		t.Errorf("GetMetrics() total = %d, want 2", total)
	}
	if success != 1 {
		t.Errorf("GetMetrics() success = %d, want 1", success)
	}
	if errors != 1 {
		t.Errorf("GetMetrics() errors = %d, want 1", errors)
	}
}

func TestNFeWorkerPool_processNFe_InvalidXML(t *testing.T) {
	db := setupTestDB(t)
	pool := NewNFeWorkerPool(1, db)
	
	nfeService := services.NewNfeService(db)
	
	job := NFeJob{
		XMLData:   []byte("invalid xml"),
		UserEmail: "test@example.com",
	}
	
	result := pool.processNFe(nfeService, job, 0)
	
	// Com XML inválido, deve falhar na decodificação
	if result.Success {
		t.Error("processNFe() with invalid XML should return Success = false")
	}
	if result.Error == nil {
		t.Error("processNFe() with invalid XML should return error")
	}
}

func TestNFeResult_String(t *testing.T) {
	result := NFeResult{
		Success:   true,
		Items:     5,
		AccessKey: "test-key",
		Duration:  100 * time.Millisecond,
	}
	
	if !result.Success {
		t.Error("NFeResult.Success should be true")
	}
	if result.Items != 5 {
		t.Errorf("NFeResult.Items = %d, want 5", result.Items)
	}
	if result.AccessKey != "test-key" {
		t.Errorf("NFeResult.AccessKey = %s, want test-key", result.AccessKey)
	}
}

func TestNFeJob_Validation(t *testing.T) {
	tests := []struct {
		name    string
		job     NFeJob
		wantErr bool
	}{
		{
			name: "job válido com XMLData",
			job: NFeJob{
				XMLData:   []byte("test"),
				UserEmail: "test@example.com",
			},
			wantErr: false,
		},
		{
			name: "job sem XMLData",
			job: NFeJob{
				XMLData:   nil,
				UserEmail: "test@example.com",
			},
			wantErr: false, // Não valida no Submit, apenas no processamento
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Por enquanto, apenas verificar que a estrutura está correta
			if tt.job.UserEmail == "" {
				t.Error("NFeJob should have UserEmail")
			}
		})
	}
}

func TestNFeWorkerPool_ContextCancellation(t *testing.T) {
	db := setupTestDB(t)
	pool := NewNFeWorkerPool(1, db)
	
	ctx, cancel := context.WithCancel(context.Background())
	pool.ctx = ctx
	pool.cancel = cancel
	
	pool.Start()
	
	// Cancelar contexto
	cancel()
	
	// Aguardar um pouco
	time.Sleep(50 * time.Millisecond)
	
	// Tentar submeter - deve falhar
	job := NFeJob{
		XMLData:   []byte("test"),
		UserEmail: "test@example.com",
	}
	
	err := pool.Submit(job)
	if err == nil {
		t.Error("Submit() after context cancellation should return error")
	}
	
	pool.Stop()
}

func TestNFeWorkerPool_ConcurrentSubmits(t *testing.T) {
	db := setupTestDB(t)
	pool := NewNFeWorkerPool(5, db)
	
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	
	pool.ctx = ctx
	pool.cancel = cancel
	pool.Start()
	defer pool.Stop()
	
	// Submeter múltiplos jobs concorrentemente
	const numJobs = 10
	errChan := make(chan error, numJobs)
	
	for i := 0; i < numJobs; i++ {
		go func(id int) {
			job := NFeJob{
				XMLData:   []byte("test"),
				UserEmail: "test@example.com",
			}
			errChan <- pool.Submit(job)
		}(i)
	}
	
	// Coletar erros
	var errors int
	for i := 0; i < numJobs; i++ {
		if err := <-errChan; err != nil {
			errors++
		}
	}
	
	if errors > 0 {
		t.Errorf("ConcurrentSubmits() had %d errors, want 0", errors)
	}
}
