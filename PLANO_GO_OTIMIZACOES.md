# 🚀 Plano de Otimizações Go - Aproveitando ao Máximo as Habilidades do Go

Este documento apresenta um plano estruturado para aproveitar ao máximo as capacidades do Go no sistema S.G.E., focando em performance, concorrência, e padrões idiomáticos da linguagem.

---

## 📊 Análise do Estado Atual

### ✅ O que já está sendo usado:
- ✅ Goroutines básicas (nfe_consumer)
- ✅ Channels básicos (email processing)
- ✅ Context.Context (nfe_consumer)
- ✅ Structured logging (slog)
- ✅ Error handling customizado

### ❌ O que pode ser melhorado:
- ❌ Cache in-memory simples (pode usar sync.Map ou cache mais sofisticado)
- ❌ Processamento de NF-e sequencial (pode ser paralelo)
- ❌ Queries sem connection pooling otimizado
- ❌ Falta de worker pools para tarefas pesadas
- ❌ Sem graceful shutdown
- ❌ Sem métricas/observabilidade nativa
- ❌ Sem rate limiting inteligente por usuário
- ❌ Exportações grandes podem travar o servidor

---

## 🎯 Objetivos do Plano

1. **Performance**: Reduzir latência e aumentar throughput
2. **Concorrência**: Aproveitar múltiplos cores para processamento paralelo
3. **Escalabilidade**: Preparar para crescimento de carga
4. **Confiabilidade**: Graceful shutdown, retry logic, circuit breakers
5. **Observabilidade**: Métricas, tracing, profiling

---

## 📋 Fase 1: Concorrência e Worker Pools (ALTA PRIORIDADE)

### 1.1 Worker Pool para Processamento de NF-e
**Problema**: Upload de NF-e processa sequencialmente, bloqueando outras requisições

**Solução**: Worker pool com goroutines para processar múltiplas NF-es em paralelo

```go
// internal/services/nfe_worker_pool.go
type NFeWorkerPool struct {
    workers    int
    jobQueue   chan NFeJob
    resultChan chan NFeResult
    wg         sync.WaitGroup
    db         *gorm.DB
}

type NFeJob struct {
    XMLData []byte
    UserID  int32
}

type NFeResult struct {
    Success bool
    Items   int
    Error   error
}

func NewNFeWorkerPool(workers int, db *gorm.DB) *NFeWorkerPool {
    return &NFeWorkerPool{
        workers:    workers,
        jobQueue:   make(chan NFeJob, 100), // Buffer de 100 jobs
        resultChan: make(chan NFeResult, 100),
        db:         db,
    }
}

func (p *NFeWorkerPool) Start(ctx context.Context) {
    for i := 0; i < p.workers; i++ {
        p.wg.Add(1)
        go p.worker(ctx, i)
    }
}

func (p *NFeWorkerPool) worker(ctx context.Context, id int) {
    defer p.wg.Done()
    nfeService := services.NewNfeService(p.db)
    
    for {
        select {
        case <-ctx.Done():
            return
        case job := <-p.jobQueue:
            // Processar NF-e
            result := p.processNFe(nfeService, job)
            p.resultChan <- result
        }
    }
}

func (p *NFeWorkerPool) Submit(job NFeJob) {
    p.jobQueue <- job
}

func (p *NFeWorkerPool) Wait() {
    close(p.jobQueue)
    p.wg.Wait()
    close(p.resultChan)
}
```

**Benefícios**:
- Processa múltiplas NF-es simultaneamente
- Não bloqueia requisições HTTP
- Controle de concorrência (evita sobrecarga do DB)

**Impacto**: ⚡⚡⚡ Alto - Reduz tempo de resposta de uploads

---

### 1.2 Worker Pool para Exportações CSV
**Problema**: Exportações grandes podem travar o servidor

**Solução**: Processar exportações em background com worker pool

```go
// internal/services/export_worker_pool.go
type ExportWorkerPool struct {
    workers  int
    jobQueue chan ExportJob
    db       *gorm.DB
}

type ExportJob struct {
    Type     string // "stock" | "movements"
    Filters  map[string]string
    UserID   int32
    FilePath string
}

func (p *ExportWorkerPool) ProcessExport(ctx context.Context, job ExportJob) error {
    // Processar em goroutine separada
    // Salvar arquivo e notificar usuário via WebSocket ou polling
}
```

**Benefícios**:
- Exportações não bloqueiam servidor
- Usuário pode continuar navegando
- Suporta exportações muito grandes

**Impacto**: ⚡⚡ Médio - Melhora UX e estabilidade

---

### 1.3 Processamento Paralelo de Múltiplas NF-es
**Problema**: Se múltiplas NF-es chegam, são processadas uma por vez

**Solução**: Processar em paralelo com limite de concorrência

```go
// internal/api/handlers.go
func (h *Handler) BatchUploadHandler(w http.ResponseWriter, r *http.Request) {
    // Receber múltiplos arquivos
    // Processar em paralelo com semáforo
    sem := make(chan struct{}, 5) // Máximo 5 simultâneas
    var wg sync.WaitGroup
    
    for _, file := range files {
        wg.Add(1)
        go func(f File) {
            defer wg.Done()
            sem <- struct{}{} // Acquire
            defer func() { <-sem }() // Release
            
            // Processar NF-e
        }(file)
    }
    wg.Wait()
}
```

**Impacto**: ⚡⚡⚡ Alto - Reduz tempo total de processamento

---

## 📋 Fase 2: Cache Avançado e Otimizações de Memória (ALTA PRIORIDADE)

### 2.1 Cache com sync.Map para Thread-Safety
**Problema**: Cache atual usa mutex, pode ter contenção

**Solução**: Usar sync.Map para leituras concorrentes ou cache mais sofisticado

```go
// internal/api/cache_advanced.go
import (
    "sync"
    "time"
    "github.com/patrickmn/go-cache" // ou implementar próprio
)

type AdvancedCache struct {
    cache *cache.Cache // go-cache ou implementação própria
    mu    sync.RWMutex
}

// Ou usar sync.Map para casos específicos
type FastCache struct {
    data sync.Map // map[string]*CacheEntry
}

type CacheEntry struct {
    Value     interface{}
    ExpiresAt time.Time
}
```

**Alternativa**: Usar `github.com/patrickmn/go-cache` que já é thread-safe e tem TTL

**Impacto**: ⚡⚡ Médio - Melhora performance de leituras concorrentes

---

### 2.2 Cache de Queries com Invalidação Inteligente
**Problema**: Cache atual invalida tudo, mesmo quando não necessário

**Solução**: Cache granular com tags de invalidação

```go
type TaggedCache struct {
    entries map[string]*CacheEntry
    tags    map[string][]string // tag -> []keys
    mu      sync.RWMutex
}

func (c *TaggedCache) InvalidateByTag(tag string) {
    // Invalidar apenas entradas com essa tag
    // Ex: tag "product:123" invalida apenas cache relacionado a esse produto
}
```

**Impacto**: ⚡⚡⚡ Alto - Reduz invalidações desnecessárias

---

### 2.3 Object Pooling para Structs Pesadas
**Problema**: Alocações frequentes de structs grandes (ex: relatórios)

**Solução**: Object pooling com sync.Pool

```go
var reportPool = sync.Pool{
    New: func() interface{} {
        return &Report{
            Items: make([]ReportItem, 0, 100), // Pre-alocar slice
        }
    },
}

func getReport() *Report {
    r := reportPool.Get().(*Report)
    r.Reset() // Limpar dados
    return r
}

func putReport(r *Report) {
    reportPool.Put(r)
}
```

**Impacto**: ⚡⚡ Médio - Reduz alocações e GC pressure

---

## 📋 Fase 3: Graceful Shutdown e Confiabilidade (MÉDIA PRIORIDADE)

### 3.1 Graceful Shutdown Completo
**Problema**: Servidor não fecha conexões gracefully

**Solução**: Implementar shutdown com timeout e cleanup

```go
// main.go
func main() {
    // ... setup ...
    
    srv := &http.Server{
        Addr:         ":" + port,
        Handler:      r,
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
    }
    
    // Canal para sinais do sistema
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
    
    // Servidor em goroutine
    go func() {
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            slog.Error("Server error", "error", err)
        }
    }()
    
    // Aguardar sinal
    <-sigChan
    slog.Info("Shutting down gracefully...")
    
    // Context com timeout para shutdown
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    // Parar worker pools
    nfeConsumer.Stop(ctx)
    exportPool.Stop(ctx)
    
    // Shutdown do servidor HTTP
    if err := srv.Shutdown(ctx); err != nil {
        slog.Error("Server shutdown error", "error", err)
    }
    
    slog.Info("Server stopped")
}
```

**Impacto**: ⚡⚡⚡ Alto - Evita perda de dados e conexões abertas

---

### 3.2 Retry Logic com Exponential Backoff
**Problema**: Falhas temporárias de DB não são retentadas

**Solução**: Retry com exponential backoff

```go
// internal/utils/retry.go
func RetryWithBackoff(ctx context.Context, maxRetries int, fn func() error) error {
    backoff := time.Second
    
    for i := 0; i < maxRetries; i++ {
        err := fn()
        if err == nil {
            return nil
        }
        
        if i == maxRetries-1 {
            return err
        }
        
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-time.After(backoff):
            backoff *= 2 // Exponential backoff
            if backoff > 30*time.Second {
                backoff = 30 * time.Second
            }
        }
    }
    return errors.New("max retries exceeded")
}
```

**Impacto**: ⚡⚡ Médio - Melhora resiliência

---

### 3.3 Circuit Breaker para Proteção
**Problema**: Se DB fica lento, todas requisições ficam lentas

**Solução**: Circuit breaker para isolar falhas

```go
// internal/utils/circuit_breaker.go
type CircuitBreaker struct {
    maxFailures int
    timeout     time.Duration
    failures    int
    lastFailure time.Time
    state       State // Closed, Open, HalfOpen
    mu          sync.RWMutex
}

func (cb *CircuitBreaker) Call(fn func() error) error {
    cb.mu.Lock()
    defer cb.mu.Unlock()
    
    if cb.state == Open {
        if time.Since(cb.lastFailure) > cb.timeout {
            cb.state = HalfOpen // Tentar novamente
        } else {
            return ErrCircuitOpen
        }
    }
    
    err := fn()
    if err != nil {
        cb.failures++
        cb.lastFailure = time.Now()
        if cb.failures >= cb.maxFailures {
            cb.state = Open
        }
        return err
    }
    
    // Sucesso - resetar
    cb.failures = 0
    cb.state = Closed
    return nil
}
```

**Impacto**: ⚡⚡⚡ Alto - Protege sistema de sobrecarga

---

## 📋 Fase 4: Otimizações de Banco de Dados (MÉDIA PRIORIDADE)

### 4.1 Connection Pooling Otimizado
**Problema**: Pool padrão pode não ser otimizado

**Solução**: Configurar pool baseado em carga

```go
// internal/database/db.go
sqlDB, err := db.DB()
if err != nil {
    return err
}

// Configurar pool baseado em carga esperada
sqlDB.SetMaxOpenConns(25)        // Máximo de conexões abertas
sqlDB.SetMaxIdleConns(10)         // Máximo de conexões idle
sqlDB.SetConnMaxLifetime(5 * time.Minute) // Tempo máximo de vida
sqlDB.SetConnMaxIdleTime(10 * time.Minute) // Tempo máximo idle
```

**Impacto**: ⚡⚡⚡ Alto - Melhora performance e estabilidade

---

### 4.2 Prepared Statements Cached
**Problema**: Queries repetidas não usam prepared statements

**Solução**: Cache de prepared statements

```go
type QueryCache struct {
    stmts map[string]*sql.Stmt
    mu    sync.RWMutex
}

func (qc *QueryCache) GetOrPrepare(db *sql.DB, query string) (*sql.Stmt, error) {
    qc.mu.RLock()
    if stmt, ok := qc.stmts[query]; ok {
        qc.mu.RUnlock()
        return stmt, nil
    }
    qc.mu.RUnlock()
    
    qc.mu.Lock()
    defer qc.mu.Unlock()
    
    // Double-check
    if stmt, ok := qc.stmts[query]; ok {
        return stmt, nil
    }
    
    stmt, err := db.Prepare(query)
    if err != nil {
        return nil, err
    }
    
    qc.stmts[query] = stmt
    return stmt, nil
}
```

**Impacto**: ⚡⚡ Médio - Reduz overhead de parsing SQL

---

### 4.3 Batch Operations para Inserções
**Problema**: Inserções de movimentos são uma por uma

**Solução**: Batch inserts

```go
// internal/services/product_service.go
func (s *ProductService) CreateMovementsBatch(movements []Movement) error {
    if len(movements) == 0 {
        return nil
    }
    
    // Preparar batch insert
    values := make([]string, 0, len(movements))
    args := make([]interface{}, 0, len(movements)*5)
    
    for _, m := range movements {
        values = append(values, "(?, ?, ?, ?, ?)")
        args = append(args, m.ProductCode, m.Type, m.Quantity, m.Origin, m.UserID)
    }
    
    query := fmt.Sprintf(
        "INSERT INTO movements (product_code, type, quantity, origin, user_id) VALUES %s",
        strings.Join(values, ","),
    )
    
    return s.DB.Exec(query, args...).Error
}
```

**Impacto**: ⚡⚡⚡ Alto - Reduz tempo de inserção de múltiplos registros

---

## 📋 Fase 5: Observabilidade e Métricas (BAIXA PRIORIDADE)

### 5.1 Métricas com Prometheus
**Solução**: Expor métricas Prometheus

```go
// internal/metrics/metrics.go
import "github.com/prometheus/client_golang/prometheus"

var (
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )
    
    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "HTTP request duration",
        },
        []string{"method", "endpoint"},
    )
    
    nfeProcessedTotal = prometheus.NewCounter(
        prometheus.CounterOpts{
            Name: "nfe_processed_total",
            Help: "Total NF-e processed",
        },
    )
)

func init() {
    prometheus.MustRegister(httpRequestsTotal)
    prometheus.MustRegister(httpRequestDuration)
    prometheus.MustRegister(nfeProcessedTotal)
}
```

**Impacto**: ⚡⚡ Médio - Melhora observabilidade

---

### 5.2 Tracing com OpenTelemetry
**Solução**: Distributed tracing

```go
// internal/tracing/tracing.go
import "go.opentelemetry.io/otel"

func InitTracing(serviceName string) (*trace.TracerProvider, error) {
    // Configurar OpenTelemetry
    // Exportar para Jaeger/Zipkin
}
```

**Impacto**: ⚡ Baixo - Útil para debug em produção

---

### 5.3 Profiling Automático
**Solução**: Endpoint de profiling

```go
// main.go
import _ "net/http/pprof"

go func() {
    log.Println(http.ListenAndServe("localhost:6060", nil))
}()
```

**Impacto**: ⚡ Baixo - Útil para otimizações

---

## 📋 Fase 6: Otimizações Específicas (BAIXA PRIORIDADE)

### 6.1 Rate Limiting por Usuário (não apenas IP)
**Solução**: Rate limiting baseado em user ID

```go
type UserRateLimiter struct {
    limiters map[int32]*rate.Limiter
    mu       sync.RWMutex
}

func (rl *UserRateLimiter) Allow(userID int32) bool {
    rl.mu.RLock()
    limiter, ok := rl.limiters[userID]
    rl.mu.RUnlock()
    
    if !ok {
        rl.mu.Lock()
        limiter = rate.NewLimiter(rate.Every(time.Second), 10) // 10 req/s
        rl.limiters[userID] = limiter
        rl.mu.Unlock()
    }
    
    return limiter.Allow()
}
```

**Impacto**: ⚡⚡ Médio - Melhor controle de rate limiting

---

### 6.2 Streaming de Respostas Grandes
**Problema**: Exportações grandes carregam tudo na memória

**Solução**: Streaming com http.Flusher

```go
func (h *Handler) StreamExportHandler(w http.ResponseWriter, r *http.Request) {
    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "Streaming not supported", http.StatusInternalServerError)
        return
    }
    
    w.Header().Set("Content-Type", "text/csv")
    w.Header().Set("Transfer-Encoding", "chunked")
    
    // Escrever header
    fmt.Fprintf(w, "Code,Name,Quantity\n")
    flusher.Flush()
    
    // Stream dados
    rows, _ := h.DB.Raw("SELECT * FROM stock").Rows()
    defer rows.Close()
    
    for rows.Next() {
        // Processar e escrever linha
        fmt.Fprintf(w, "%s,%s,%d\n", code, name, qty)
        flusher.Flush()
    }
}
```

**Impacto**: ⚡⚡ Médio - Reduz uso de memória

---

### 6.3 Context Propagation em Toda Aplicação
**Solução**: Passar context em todas operações

```go
// Todos handlers devem receber context da request
func (h *Handler) StockHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    
    // Passar context para todas operações
    list, err := h.ProductService.GetStockList(ctx, search, categoryID, page, limit)
    // ...
}
```

**Impacto**: ⚡⚡⚡ Alto - Permite cancelamento e timeouts

---

## 🎯 Priorização e Roadmap

### Sprint 1 (2 semanas) - ALTA PRIORIDADE
1. ✅ Worker Pool para NF-e
2. ✅ Graceful Shutdown
3. ✅ Connection Pooling Otimizado
4. ✅ Batch Operations

### Sprint 2 (2 semanas) - ALTA/MÉDIA PRIORIDADE
1. ✅ Worker Pool para Exportações
2. ✅ Cache Avançado (go-cache)
3. ✅ Retry Logic
4. ✅ Context Propagation

### Sprint 3 (2 semanas) - MÉDIA PRIORIDADE
1. ✅ Circuit Breaker
2. ✅ Rate Limiting por Usuário
3. ✅ Streaming de Respostas
4. ✅ Métricas Básicas

### Sprint 4 (1 semana) - BAIXA PRIORIDADE
1. ✅ Object Pooling
2. ✅ Profiling
3. ✅ Tracing (opcional)

---

## 📊 Métricas de Sucesso

### Performance
- **Latência P95**: Reduzir de ~200ms para ~50ms
- **Throughput**: Aumentar de 100 req/s para 500+ req/s
- **Tempo de processamento NF-e**: Reduzir de 2s para 200ms (com worker pool)

### Confiabilidade
- **Uptime**: 99.9%+
- **Graceful Shutdown**: < 5s
- **Error Rate**: < 0.1%

### Escalabilidade
- **Concorrência**: Suportar 1000+ usuários simultâneos
- **Memória**: Reduzir uso em 30% (com object pooling)
- **CPU**: Melhor utilização de múltiplos cores

---

## 🔧 Ferramentas e Bibliotecas Recomendadas

### Concorrência
- `sync` (stdlib) - WaitGroup, Mutex, RWMutex, Pool, Map
- `golang.org/x/sync` - errgroup, semaphore

### Cache
- `github.com/patrickmn/go-cache` - Cache thread-safe com TTL
- `sync.Map` (stdlib) - Para casos específicos

### Métricas
- `github.com/prometheus/client_golang` - Prometheus metrics
- `go.opentelemetry.io/otel` - OpenTelemetry tracing

### Rate Limiting
- `golang.org/x/time/rate` - Token bucket rate limiter

### Circuit Breaker
- `github.com/sony/gobreaker` - Circuit breaker pattern

---

## 📝 Notas de Implementação

1. **Testes**: Cada feature deve ter testes unitários e de integração
2. **Benchmarks**: Usar `go test -bench` para validar melhorias
3. **Profiling**: Usar `go tool pprof` para identificar bottlenecks
4. **Documentação**: Atualizar documentação técnica com cada mudança

---

## 🚀 Próximos Passos

1. **Revisar plano** com equipe
2. **Priorizar features** baseado em necessidades de negócio
3. **Criar issues** no GitHub para cada feature
4. **Implementar Sprint 1** (alta prioridade)
5. **Medir resultados** e iterar

---

*Última atualização: 2026-02-10*
*Versão do Plano: 1.0*
