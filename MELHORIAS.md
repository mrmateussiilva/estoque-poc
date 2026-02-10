# 🚀 Melhorias Sugeridas para o Sistema de Gestão de Estoque

Este documento lista melhorias identificadas após análise do código, organizadas por prioridade e categoria.

---

## 🔴 CRÍTICO - Segurança

### 1. **JWT Secret Hardcoded**
**Problema**: O secret do JWT está hardcoded no código (`sge-secret-key-change-in-production`)

**Impacto**: Qualquer pessoa com acesso ao código pode gerar tokens válidos

**Solução**:
```go
// middleware.go
var JwtSecret = []byte(os.Getenv("JWT_SECRET"))
if len(JwtSecret) == 0 {
    log.Fatal("JWT_SECRET environment variable is required")
}
```

### 2. **Falta de Autorização por Role**
**Problema**: O sistema valida apenas autenticação, mas não verifica permissões por role

**Impacto**: Qualquer usuário autenticado pode acessar todas as funcionalidades, incluindo endpoints administrativos

**Solução**: Implementar middleware de autorização:
```go
func RoleMiddleware(allowedRoles ...string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Extrair user do contexto (precisa ser injetado no AuthMiddleware)
            user := getUserFromContext(r)
            if !contains(allowedRoles, user.Role) {
                RespondWithError(w, http.StatusForbidden, "Insufficient permissions")
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}
```

### 3. **Exposição de Erros Detalhados**
**Problema**: Mensagens de erro expõem detalhes internos (ex: `err.Error()`)

**Impacto**: Informações sensíveis podem vazar para atacantes

**Solução**: Criar tipos de erro customizados e mapear para mensagens genéricas em produção

### 4. **Rate Limiting Ausente**
**Problema**: Não há proteção contra brute force ou DDoS

**Impacto**: Sistema vulnerável a ataques de força bruta no login

**Solução**: Implementar rate limiting (ex: `github.com/go-chi/httprate`)

### 5. **Validação de Input Insuficiente**
**Problema**: Falta validação robusta de inputs (SQL injection, XSS)

**Impacto**: Vulnerável a ataques de injeção

**Solução**: 
- Usar prepared statements (já usa GORM, mas validar)
- Sanitizar inputs de texto
- Validar tipos e formatos (email, números, etc.)

---

## 🟠 ALTA PRIORIDADE - Performance e Escalabilidade

### 6. **Falta de Paginação**
**Problema**: Endpoints retornam todos os registros sem paginação

**Impacto**: 
- `GET /api/products` - Pode retornar milhares de produtos
- `GET /api/movements/list` - Limitado a 100, mas sem offset
- `GET /stock` - Retorna todos os produtos

**Solução**: Implementar paginação padrão:
```go
type PaginationParams struct {
    Page  int `json:"page"`  // default: 1
    Limit int `json:"limit"` // default: 50, max: 100
}

type PaginatedResponse struct {
    Data       interface{} `json:"data"`
    Pagination struct {
        Page       int   `json:"page"`
        Limit      int   `json:"limit"`
        Total      int64 `json:"total"`
        TotalPages int   `json:"total_pages"`
    } `json:"pagination"`
}
```

### 7. **Queries N+1 Potenciais**
**Problema**: Em `GetStockList`, produtos são carregados e depois itera-se sobre eles

**Impacto**: Múltiplas queries ao banco quando há muitos produtos

**Solução**: Usar `Preload` corretamente e `Select` para evitar campos desnecessários

### 8. **Falta de Índices no Banco**
**Problema**: Não há índices explícitos em colunas frequentemente consultadas

**Impacto**: Queries lentas conforme o volume de dados cresce

**Solução**: Adicionar índices em:
- `movements.product_code`
- `movements.created_at`
- `movements.type`
- `products.category_id`
- `products.active`
- `users.email` (já tem UNIQUE, mas verificar índice)

### 9. **Cache Ausente**
**Problema**: Dados frequentemente acessados (categorias, stats do dashboard) são sempre buscados do banco

**Impacto**: Sobrecarga desnecessária no banco de dados

**Solução**: Implementar cache em memória (Redis ou in-memory) para:
- Lista de categorias
- Stats do dashboard (TTL: 5 minutos)
- Dados de produtos (com invalidação)

### 10. **Upload de Arquivo sem Validação de Tamanho Real**
**Problema**: `ParseMultipartForm(10 << 20)` limita a 10MB, mas não valida o arquivo antes de processar

**Impacto**: Pode processar arquivos grandes demais ou malformados

**Solução**: Validar tamanho do arquivo antes de decodificar XML

---

## 🟡 MÉDIA PRIORIDADE - Arquitetura e Código

### 11. **Tratamento de Erros Inconsistente**
**Problema**: Alguns handlers retornam `err.Error()` diretamente, outros têm mensagens genéricas

**Impacto**: Experiência do usuário inconsistente e possível exposição de detalhes

**Solução**: Criar tipos de erro customizados e mapear para mensagens amigáveis:
```go
type AppError struct {
    Code    int
    Message string
    Err     error
}

func (e *AppError) Error() string {
    return e.Message
}
```

### 12. **Falta de Logging Estruturado em Handlers**
**Problema**: Nem todos os handlers logam ações importantes

**Impacto**: Dificulta debugging e auditoria

**Solução**: Adicionar logs estruturados em todas as operações críticas:
```go
slog.Info("Movement created", 
    "product_code", req.ProductCode,
    "type", req.Type,
    "quantity", req.Quantity,
    "user", userEmail)
```

### 13. **Validação de Dados no Handler ao Invés de Service**
**Problema**: Validações de negócio estão nos handlers

**Impacto**: Lógica de negócio espalhada, difícil de testar

**Solução**: Mover validações para services e criar validators

### 14. **Falta de Testes**
**Problema**: Não há testes unitários ou de integração

**Impacto**: Refatorações são arriscadas, bugs podem passar despercebidos

**Solução**: 
- Testes unitários para services
- Testes de integração para handlers críticos
- Testes de carga para endpoints principais

### 15. **Contexto do Usuário Não Injetado**
**Problema**: O `AuthMiddleware` não injeta o usuário no contexto da requisição

**Impacto**: Handlers não sabem qual usuário está fazendo a ação (importante para auditoria)

**Solução**: 
```go
// middleware.go
ctx := context.WithValue(r.Context(), "user", user)
next.ServeHTTP(w, r.WithContext(ctx))

// handlers
user := r.Context().Value("user").(*models.User)
```

### 16. **Falta de Validação de UserID em Movimentos**
**Problema**: `CreateMovementHandler` não associa o movimento ao usuário autenticado

**Impacto**: Perda de rastreabilidade

**Solução**: Extrair user do contexto e associar ao movimento

---

## 🟢 BAIXA PRIORIDADE - UX e Funcionalidades

### 17. **Falta de Feedback Visual em Operações Longas**
**Problema**: Upload de NF-e pode demorar, mas não há indicador de progresso

**Impacto**: Usuário não sabe se o sistema travou

**Solução**: Implementar loading states e progress indicators

### 18. **Mensagens de Erro Não Traduzidas**
**Problema**: Algumas mensagens estão em inglês, outras em português

**Impacto**: Experiência inconsistente

**Solução**: Padronizar todas as mensagens em português

### 19. **Falta de Confirmação em Ações Destrutivas**
**Problema**: Deletar usuário/categoria não pede confirmação

**Impacto**: Ações irreversíveis podem ser feitas por engano

**Solução**: Adicionar modais de confirmação

### 20. **Falta de Filtros Avançados**
**Problema**: Filtros limitados (apenas search e category_id)

**Impacto**: Dificulta encontrar produtos específicos

**Solução**: Adicionar filtros por:
- Faixa de preço
- Estoque mínimo/máximo
- Fornecedor
- Localização
- Status (ativo/inativo)

### 21. **Falta de Exportação de Dados**
**Problema**: Não há como exportar relatórios ou listas

**Impacto**: Dificulta análises externas

**Solução**: Implementar exportação em CSV/Excel para:
- Lista de produtos
- Movimentações
- Relatórios

### 22. **Dashboard com Dados Estáticos**
**Problema**: Stats do dashboard não são atualizados em tempo real

**Impacto**: Dados podem estar desatualizados

**Solução**: Implementar polling ou WebSockets para atualização automática

### 23. **Falta de Histórico de Alterações**
**Problema**: Não há rastreamento de quem alterou o quê e quando

**Impacto**: Dificulta auditoria

**Solução**: Criar tabela `audit_log` para registrar alterações

### 24. **Falta de Notificações**
**Problema**: Não há alertas para estoque baixo ou outras situações críticas

**Impacto**: Problemas podem passar despercebidos

**Solução**: Implementar sistema de notificações (email, in-app)

---

## 🔵 DEVOPS E INFRAESTRUTURA

### 25. **Variáveis de Ambiente Não Documentadas**
**Problema**: Não há `.env.example` ou documentação das variáveis necessárias

**Impacto**: Dificulta setup de novos ambientes

**Solução**: Criar `.env.example` com todas as variáveis

### 26. **Falta de Health Check Completo**
**Problema**: `/api/health` apenas retorna status, não verifica banco

**Impacto**: Não detecta problemas de conectividade com DB

**Solução**: 
```go
func HealthHandler(w http.ResponseWriter, r *http.Request) {
    if err := db.Ping(); err != nil {
        RespondWithError(w, http.StatusServiceUnavailable, "Database unavailable")
        return
    }
    RespondWithJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
```

### 27. **Falta de Métricas e Monitoramento**
**Problema**: Não há métricas de performance ou monitoramento

**Impacto**: Dificulta identificar gargalos

**Solução**: Integrar Prometheus ou similar para métricas

### 28. **Logs Não Estruturados em Produção**
**Problema**: Logs JSON são bons, mas falta contexto de request ID em todos os logs

**Impacto**: Dificulta rastrear requisições específicas

**Solução**: Usar middleware de request ID (já existe no Chi) e incluir em todos os logs

### 29. **Falta de Backup Automatizado**
**Problema**: Não há estratégia de backup documentada

**Impacto**: Risco de perda de dados

**Solução**: Implementar backups automáticos do MySQL

### 30. **Docker Compose Pode Ser Melhorado**
**Problema**: Verificar se há docker-compose.yml e se está completo

**Impacto**: Dificulta desenvolvimento e deploy

**Solução**: Garantir que docker-compose inclui:
- Backend
- Frontend (dev)
- MySQL
- Redis (se implementar cache)

---

## 📊 Resumo de Prioridades

### 🔴 Implementar Imediatamente
1. JWT Secret via env var
2. Autorização por role
3. Rate limiting no login
4. Validação de inputs

### 🟠 Próximas Sprints
5. Paginação em todos os endpoints
6. Índices no banco de dados
7. Cache para dados frequentes
8. Injetar user no contexto

### 🟡 Planejamento
9. Testes automatizados
10. Logging estruturado completo
11. Tratamento de erros padronizado
12. Validações em services

### 🟢 Melhorias Contínuas
13. UX improvements
14. Funcionalidades adicionais
15. Exportação de dados
16. Notificações

---

## 🛠️ Como Implementar

### Fase 1: Segurança (1-2 semanas)
- [ ] Mover JWT_SECRET para env var
- [ ] Implementar RoleMiddleware
- [ ] Adicionar rate limiting
- [ ] Melhorar validação de inputs

### Fase 2: Performance (2-3 semanas)
- [ ] Implementar paginação
- [ ] Adicionar índices no banco
- [ ] Implementar cache básico
- [ ] Otimizar queries N+1

### Fase 3: Qualidade (2-3 semanas)
- [ ] Adicionar testes unitários
- [ ] Melhorar logging
- [ ] Padronizar tratamento de erros
- [ ] Refatorar validações

### Fase 4: Features (contínuo)
- [ ] Melhorias de UX
- [ ] Novas funcionalidades
- [ ] Exportação de dados
- [ ] Sistema de notificações

---

*Documento gerado em: 2026-02-06*
*Última atualização: 2026-02-06*
