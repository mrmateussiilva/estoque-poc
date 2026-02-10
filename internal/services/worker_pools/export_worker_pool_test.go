package worker_pools

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDBForExport(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}
	
	// Criar tabelas básicas necessárias para os testes de exportação
	_ = db.Exec(`
		CREATE TABLE IF NOT EXISTS products (
			code VARCHAR(255) PRIMARY KEY,
			name VARCHAR(255),
			description TEXT,
			unit VARCHAR(20),
			min_stock DECIMAL(19,4),
			max_stock DECIMAL(19,4),
			cost_price DECIMAL(19,4),
			sale_price DECIMAL(19,4),
			location VARCHAR(255),
			category_id INT,
			active BOOLEAN DEFAULT 1
		);
		CREATE TABLE IF NOT EXISTS stock (
			product_code VARCHAR(255) PRIMARY KEY,
			quantity DECIMAL(19,4)
		);
		CREATE TABLE IF NOT EXISTS categories (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name VARCHAR(255)
		);
		CREATE TABLE IF NOT EXISTS movements (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			product_code VARCHAR(255),
			type VARCHAR(20),
			quantity DECIMAL(19,4),
			origin VARCHAR(255),
			reference VARCHAR(255),
			user_id INT,
			notes TEXT,
			created_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email VARCHAR(255)
		);
	`)
	
	return db
}

func setupTestExportDir(t *testing.T) string {
	dir := filepath.Join(os.TempDir(), "test_exports_"+time.Now().Format("20060102_150405"))
	err := os.MkdirAll(dir, 0755)
	if err != nil {
		t.Fatalf("Failed to create test export directory: %v", err)
	}
	t.Cleanup(func() {
		os.RemoveAll(dir)
	})
	return dir
}

func TestNewExportWorkerPool(t *testing.T) {
	db := setupTestDBForExport(t)
	exportDir := setupTestExportDir(t)
	
	tests := []struct {
		name      string
		workers   int
		exportDir string
		want      int
	}{
		{
			name:      "workers válidos",
			workers:   3,
			exportDir: exportDir,
			want:      3,
		},
		{
			name:      "workers zero (deve usar default)",
			workers:   0,
			exportDir: exportDir,
			want:      3, // Default
		},
		{
			name:      "workers negativos (deve usar default)",
			workers:   -1,
			exportDir: exportDir,
			want:      3, // Default
		},
		{
			name:      "exportDir vazio (deve usar default)",
			workers:   3,
			exportDir: "",
			want:      3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pool := NewExportWorkerPool(tt.workers, db, tt.exportDir)
			if pool.workers != tt.want {
				t.Errorf("NewExportWorkerPool() workers = %v, want %v", pool.workers, tt.want)
			}
			if pool.db == nil {
				t.Error("NewExportWorkerPool() db should not be nil")
			}
			if pool.jobQueue == nil {
				t.Error("NewExportWorkerPool() jobQueue should not be nil")
			}
		})
	}
}

func TestExportWorkerPool_Start(t *testing.T) {
	db := setupTestDBForExport(t)
	exportDir := setupTestExportDir(t)
	pool := NewExportWorkerPool(2, db, exportDir)
	
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	
	pool.ctx = ctx
	pool.cancel = cancel
	
	pool.Start()
	
	// Aguardar workers iniciarem
	time.Sleep(100 * time.Millisecond)
	
	// Verificar se os workers estão rodando
	job := ExportJob{
		Type:      ExportTypeStock,
		Filters:   make(map[string]string),
		UserEmail: "test@example.com",
	}
	
	err := pool.Submit(job)
	if err != nil {
		t.Errorf("Submit() error = %v, want nil", err)
	}
	
	pool.Stop()
}

func TestExportWorkerPool_Stop(t *testing.T) {
	db := setupTestDBForExport(t)
	exportDir := setupTestExportDir(t)
	pool := NewExportWorkerPool(2, db, exportDir)
	
	pool.Start()
	
	// Aguardar workers iniciarem
	time.Sleep(50 * time.Millisecond)
	
	// Parar pool
	pool.Stop()
	
	// Aguardar um pouco para garantir que o canal foi fechado
	time.Sleep(50 * time.Millisecond)
	
	// Tentar submeter job após parar - deve falhar ou panic
	// Usar recover para capturar panic de canal fechado
	func() {
		defer func() {
			if r := recover(); r != nil {
				// Panic esperado ao tentar enviar em canal fechado
				// Isso é comportamento esperado
			}
		}()
		
		job := ExportJob{
			Type:      ExportTypeStock,
			Filters:   make(map[string]string),
			UserEmail: "test@example.com",
		}
		
		err := pool.Submit(job)
		if err == nil {
			// Se não deu panic, deve ter retornado erro
			t.Error("Submit() after Stop() should return error or panic")
		}
	}()
}

func TestExportWorkerPool_Submit(t *testing.T) {
	db := setupTestDBForExport(t)
	exportDir := setupTestExportDir(t)
	pool := NewExportWorkerPool(1, db, exportDir)
	
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	
	pool.ctx = ctx
	pool.cancel = cancel
	pool.Start()
	defer pool.Stop()
	
	tests := []struct {
		name    string
		job     ExportJob
		wantErr bool
	}{
		{
			name: "job stock válido",
			job: ExportJob{
				Type:      ExportTypeStock,
				Filters:   make(map[string]string),
				UserEmail: "test@example.com",
			},
			wantErr: false,
		},
		{
			name: "job movements válido",
			job: ExportJob{
				Type:      ExportTypeMovements,
				Filters:   make(map[string]string),
				UserEmail: "test@example.com",
			},
			wantErr: false,
		},
		{
			name: "job com resultChan",
			job: ExportJob{
				Type:      ExportTypeStock,
				Filters:   make(map[string]string),
				UserEmail: "test@example.com",
				ResultChan: make(chan ExportResult, 1),
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

func TestExportWorkerPool_GetMetrics(t *testing.T) {
	db := setupTestDBForExport(t)
	exportDir := setupTestExportDir(t)
	pool := NewExportWorkerPool(1, db, exportDir)
	
	// Métricas iniciais devem ser zero
	total, success, errors := pool.GetMetrics()
	if total != 0 || success != 0 || errors != 0 {
		t.Errorf("GetMetrics() inicial = (%d, %d, %d), want (0, 0, 0)", total, success, errors)
	}
	
	// Atualizar métricas manualmente
	pool.updateMetrics(ExportResult{Success: true})
	pool.updateMetrics(ExportResult{Success: false})
	
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

func TestExportType_String(t *testing.T) {
	tests := []struct {
		name string
		et   ExportType
		want string
	}{
		{
			name: "ExportTypeStock",
			et:   ExportTypeStock,
			want: "stock",
		},
		{
			name: "ExportTypeMovements",
			et:   ExportTypeMovements,
			want: "movements",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.et) != tt.want {
				t.Errorf("ExportType.String() = %v, want %v", string(tt.et), tt.want)
			}
		})
	}
}

func TestExportResult_Validation(t *testing.T) {
	result := ExportResult{
		Success:  true,
		FilePath: "/tmp/test.csv",
		FileName: "test.csv",
		RowCount: 100,
		Duration: 1 * time.Second,
	}
	
	if !result.Success {
		t.Error("ExportResult.Success should be true")
	}
	if result.FilePath != "/tmp/test.csv" {
		t.Errorf("ExportResult.FilePath = %s, want /tmp/test.csv", result.FilePath)
	}
	if result.RowCount != 100 {
		t.Errorf("ExportResult.RowCount = %d, want 100", result.RowCount)
	}
}

func TestExportWorkerPool_ContextCancellation(t *testing.T) {
	db := setupTestDBForExport(t)
	exportDir := setupTestExportDir(t)
	pool := NewExportWorkerPool(1, db, exportDir)
	
	ctx, cancel := context.WithCancel(context.Background())
	pool.ctx = ctx
	pool.cancel = cancel
	
	pool.Start()
	
	// Cancelar contexto
	cancel()
	
	// Aguardar um pouco
	time.Sleep(50 * time.Millisecond)
	
	// Tentar submeter - deve falhar
	job := ExportJob{
		Type:      ExportTypeStock,
		Filters:   make(map[string]string),
		UserEmail: "test@example.com",
	}
	
	err := pool.Submit(job)
	if err == nil {
		t.Error("Submit() after context cancellation should return error")
	}
	
	pool.Stop()
}

func TestExportWorkerPool_ConcurrentSubmits(t *testing.T) {
	db := setupTestDBForExport(t)
	exportDir := setupTestExportDir(t)
	pool := NewExportWorkerPool(5, db, exportDir)
	
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
			job := ExportJob{
				Type:      ExportTypeStock,
				Filters:   make(map[string]string),
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

func TestExportWorkerPool_SubmitSync_Timeout(t *testing.T) {
	db := setupTestDBForExport(t)
	exportDir := setupTestExportDir(t)
	pool := NewExportWorkerPool(1, db, exportDir)
	
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	
	pool.ctx = ctx
	pool.cancel = cancel
	pool.Start()
	defer pool.Stop()
	
	// Criar job que vai demorar muito (simulado)
	job := ExportJob{
		Type:      ExportTypeStock,
		Filters:   make(map[string]string),
		UserEmail: "test@example.com",
		ResultChan: make(chan ExportResult, 1),
	}
	
	// Não enviar resultado - deve timeout
	result, err := pool.SubmitSync(job)
	
	// Deve retornar timeout ou erro
	if err == nil && result.Success {
		t.Error("SubmitSync() should timeout or return error for long-running job")
	}
}

func TestExportJob_Filters(t *testing.T) {
	job := ExportJob{
		Type:    ExportTypeStock,
		Filters: make(map[string]string),
	}
	
	// Adicionar filtros
	job.Filters["search"] = "test"
	job.Filters["category_id"] = "1"
	
	if job.Filters["search"] != "test" {
		t.Errorf("ExportJob.Filters['search'] = %s, want test", job.Filters["search"])
	}
	if job.Filters["category_id"] != "1" {
		t.Errorf("ExportJob.Filters['category_id'] = %s, want 1", job.Filters["category_id"])
	}
}

func TestExportWorkerPool_ExportDirCreation(t *testing.T) {
	db := setupTestDBForExport(t)
	
	// Testar criação automática de diretório
	testDir := filepath.Join(os.TempDir(), "auto_created_export_dir")
	defer os.RemoveAll(testDir)
	
	_ = NewExportWorkerPool(1, db, testDir)
	
	// Verificar se diretório foi criado
	if _, err := os.Stat(testDir); os.IsNotExist(err) {
		t.Error("NewExportWorkerPool() should create export directory if it doesn't exist")
	}
}
