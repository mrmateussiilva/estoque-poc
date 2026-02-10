# Changelog - Melhorias de Segurança

## Data: 2026-02-06

### ✅ Implementadas

#### 1. JWT Secret via Variável de Ambiente
- **Arquivo**: `internal/api/middleware.go`
- **Mudança**: JWT secret agora é lido da variável de ambiente `JWT_SECRET`
- **Função**: `InitJwtSecret()` valida que o secret tem pelo menos 32 caracteres
- **Fallback**: Em desenvolvimento, usa valor padrão com warning (NÃO SEGURO PARA PRODUÇÃO)
- **Impacto**: Remove vulnerabilidade crítica de secret hardcoded

#### 2. Autorização por Role
- **Arquivo**: `internal/api/middleware.go`
- **Novo Middleware**: `RoleMiddleware(allowedRoles ...string)`
- **Mudança**: `AuthMiddleware` agora injeta o usuário no contexto da requisição
- **Função**: `GetUserFromContext(r)` para extrair usuário dos handlers
- **Aplicação**: Endpoints de usuários agora requerem role `ADMIN`
- **Impacto**: Controle de acesso baseado em permissões implementado

#### 3. Rate Limiting
- **Dependência**: `github.com/go-chi/httprate v0.15.0`
- **Arquivo**: `main.go`
- **Login**: 5 tentativas por minuto por IP
- **Endpoints Protegidos**: 100 requisições por minuto por IP
- **Impacto**: Proteção contra brute force e DDoS

#### 4. Tratamento de Erros Customizado
- **Arquivo**: `internal/api/errors.go` (novo)
- **Tipos**: 
  - `AppError` - Erro com código HTTP e mensagem amigável
  - Erros customizados (`ErrInvalidJwtSecret`, `ErrUserNotFound`, etc.)
- **Função**: `HandleError()` mapeia erros para mensagens apropriadas
- **Comportamento**: 
  - Em produção: não expõe detalhes internos
  - Em desenvolvimento: mostra mais detalhes para debugging
- **Aplicação**: Handlers atualizados para usar `HandleError()`
- **Impacto**: Não expõe informações sensíveis em erros

### 📝 Mudanças Adicionais

#### Rastreabilidade de Movimentos
- **Arquivo**: `internal/services/product_service.go`
- **Mudança**: `CreateMovement()` agora recebe `userID` e associa ao movimento
- **Impacto**: Melhor rastreabilidade de quem fez cada movimentação

#### Documentação
- **Arquivo**: `ENV_VARIABLES.md` (novo)
- **Conteúdo**: Documentação completa de todas as variáveis de ambiente

### 🔧 Arquivos Modificados

1. `internal/api/middleware.go` - JWT secret, AuthMiddleware, RoleMiddleware
2. `internal/api/errors.go` - Novo arquivo com tratamento de erros
3. `internal/api/handlers.go` - Atualizado para usar novos erros
4. `internal/api/handlers_extended.go` - Atualizado para usar novos erros e associar user
5. `internal/api/user_handlers.go` - Atualizado para usar novos erros
6. `internal/services/product_service.go` - Adicionado userID em movimentos
7. `main.go` - Inicialização de JWT secret, rate limiting, RoleMiddleware
8. `go.mod` - Adicionada dependência `github.com/go-chi/httprate`

### ⚠️ Breaking Changes

#### Variável de Ambiente Obrigatória
- **JWT_SECRET**: Agora é obrigatória (com fallback apenas em desenvolvimento)
- **Ação**: Configure `JWT_SECRET` no ambiente antes de executar

#### AuthMiddleware
- **Mudança**: Agora recebe `*gorm.DB` como parâmetro
- **Impacto**: Todas as rotas protegidas precisam passar o banco de dados
- **Exemplo**: `r.Use(api.AuthMiddleware(db))`

#### CreateMovement
- **Mudança**: Agora requer `userID` como segundo parâmetro
- **Impacto**: Handlers que chamam este método precisam passar o userID

### 🚀 Como Usar

#### 1. Configurar Variáveis de Ambiente

Crie um arquivo `.env` ou configure variáveis de ambiente:

```bash
# Obrigatório
JWT_SECRET=seu-secret-super-seguro-com-pelo-menos-32-caracteres

# Opcional
PORT=8003
ENV=development
```

#### 2. Gerar JWT Secret Seguro

```bash
openssl rand -base64 32
```

#### 3. Endpoints com Proteção por Role

Endpoints de usuários agora requerem role `ADMIN`:

```go
r.Group(func(r chi.Router) {
    r.Use(api.RoleMiddleware("ADMIN"))
    r.Get("/users", h.ListUsersHandler)
    // ...
})
```

### 📊 Estatísticas

- **Arquivos Criados**: 2 (`errors.go`, `ENV_VARIABLES.md`)
- **Arquivos Modificados**: 8
- **Linhas Adicionadas**: ~300
- **Linhas Removidas**: ~50
- **Vulnerabilidades Corrigidas**: 4 críticas

### ✅ Testes Recomendados

1. **JWT Secret**:
   - Testar sem `JWT_SECRET` (deve usar fallback com warning)
   - Testar com `JWT_SECRET` curto (< 32 chars) - deve falhar
   - Testar com `JWT_SECRET` válido - deve funcionar

2. **Autorização por Role**:
   - Testar acesso a `/api/users` com role `ADMIN` - deve permitir
   - Testar acesso a `/api/users` com role `OPERADOR` - deve negar (403)

3. **Rate Limiting**:
   - Testar 6 tentativas de login em 1 minuto - 6ª deve falhar (429)
   - Testar 101 requisições em 1 minuto - 101ª deve falhar (429)

4. **Tratamento de Erros**:
   - Testar em `ENV=production` - erros não devem expor detalhes
   - Testar em `ENV=development` - erros devem mostrar mais detalhes

---

*Implementado em: 2026-02-06*
