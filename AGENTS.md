# 🤖 AGENTS.md - Guia para Agentes de IA

> **📚 Documentação Completa**: Este é um resumo. Para documentação detalhada, consulte:
> - **[.agent/agents.md](.agent/agents.md)** - Guia completo para agentes (arquitetura, API, fluxos, padrões)
> - **[.agent/rules.md](.agent/rules.md)** - Regras e convenções do projeto

---

## 🏗️ Arquitetura do Sistema

O **S.G.E. (Sistema de Gestão de Estoque)** é um SaaS de controle de estoque baseado em processamento de NF-e.

### Stack Tecnológica

#### Backend (Go 1.25.4)
- **Localização**: Raiz do projeto
- **Banco de Dados**: MySQL 5.6
- **Autenticação**: JWT (JSON Web Tokens)
- **HTTP**: `net/http` nativo (sem frameworks)
- **Estrutura**:
  - `main.go` - Ponto de entrada e rotas
  - `internal/api/` - Handlers (`handlers.go`, `handlers_extended.go`), middlewares, responses
  - `internal/database/` - InitDB, migrations, seeds
  - `internal/models/` - Structs de dados (DTOs)

#### Frontend (React 19 + TypeScript)
- **Localização**: `/frontend`
- **Stack**: React, Vite, Tailwind CSS, Lucide Icons, Recharts
- **Estrutura**:
  - `src/components/` - Componentes reutilizáveis (UI.tsx é o design system)
  - `src/contexts/` - AuthContext (login, apiFetch), DataContext (cache global)
  - `src/pages/` - Dashboard, Stock, Entries, NFe, Reports, Login
  - `src/layout/` - Header, Sidebar

---

## 🗄️ Modelo de Dados (Regras Críticas)

### Tabelas Principais

#### `products`
- **PK**: `code` (SKU)
- **Campos**: name, description, category_id, unit, barcode, cost_price, sale_price, min_stock, max_stock, location, supplier_id, active

#### `stock`
- **PK**: `product_code`
- **⚠️ REGRA**: NUNCA atualizar diretamente sem criar registro em `movements`

#### `movements` (Core do Sistema)
- **Campos**: product_code, type ('ENTRADA'/'SAIDA'), quantity, origin ('NFE', 'MANUAL', 'VENDA'), reference, user_id, notes
- **⚠️ REGRA**: TODA alteração de estoque DEVE gerar um movimento

#### `processed_nfes`
- **PK**: `access_key` (chave de acesso da NF-e)
- **Uso**: Evitar processamento duplicado

#### `users`
- **Autenticação**: Email + senha hasheada (bcrypt)
- **Roles**: ADMIN, GERENTE, OPERADOR, VISUALIZADOR
- **Padrão**: `admin@sge.com` / `admin123`

#### `categories` e `suppliers`
- Relacionamentos com `products`

---

## 🔌 API Endpoints (Resumo)

**Base URL**: `http://localhost:8003` (configurável via `PORT`)

### Públicas
- `POST /login` - Autenticação (retorna JWT)

### Protegidas (requerem `Authorization: Bearer <token>`)
- `POST /nfe/upload` - Upload de XML NF-e
- `GET /api/nfes` - Lista NF-es processadas
- `GET /stock` - Lista produtos com estoque (filtros: search, category_id)
- `GET /api/products` - Lista produtos
- `PATCH /api/products/{code}` - Atualiza produto
- `POST /api/movements` - Cria movimentação manual
- `GET /api/movements/list` - Lista movimentações
- `GET /api/dashboard/stats` - Estatísticas do dashboard
- `GET /api/dashboard/evolution` - Evolução de estoque
- `GET /api/categories` - Lista categorias

**Middleware Stack**: `LoggingMiddleware → CorsMiddleware → AuthMiddleware → Handler`

---

## 🔐 Autenticação (JWT)

### Fluxo
1. Login → Backend valida e retorna JWT (exp: 24h)
2. Frontend armazena em `localStorage` (`auth_token`, `auth_user`)
3. Todas as requisições usam `apiFetch` do `AuthContext` (inclui token automaticamente)
4. Token inválido → 401 → Logout automático

---

## 🎨 Frontend - Padrões

### Contextos
- **AuthContext**: `user`, `token`, `login()`, `logout()`, `isAuthenticated`, `apiFetch()`
- **DataContext**: Cache global de produtos, categorias

### Componentes de UI (`components/UI.tsx`)
Use SEMPRE para consistência: `Card`, `Button`, `Input`, `Select`, `Table`, `Badge`, `Modal`

### Páginas
- **Dashboard**: Stats, gráfico de evolução, produtos com estoque baixo
- **Stock**: Lista de produtos, filtros, edição (modal)
- **Entries**: Formulário de entrada manual, histórico de movimentações
- **NFe**: Upload de XML, lista de NF-es processadas
- **Reports**: Relatórios (em desenvolvimento)

---

## 🔄 Fluxos Críticos

### Upload de NF-e
1. Frontend → `POST /nfe/upload` (multipart/form-data)
2. Backend valida XML e decodifica `NfeProc`
3. Verifica duplicação (`access_key` em `processed_nfes`)
4. Inicia transação
5. Para cada item:
   - `INSERT IGNORE` em `products`
   - `INSERT` em `movements` (type: ENTRADA, origin: NFE)
   - `INSERT ... ON DUPLICATE KEY UPDATE` em `stock`
6. `INSERT` em `processed_nfes`
7. Commit → Retorna sucesso

### Movimentação Manual
1. Frontend → `POST /api/movements`
2. Backend valida e inicia transação
3. `INSERT` em `movements`
4. `UPDATE` em `stock` (incrementa/decrementa)
5. Commit → Retorna movimento criado

---

## 🛠️ Comandos de Desenvolvimento

### Backend
```bash
go build -o estoque-poc main.go  # Compilar
./estoque-poc                     # Executar (porta 8003)
```

### Frontend
```bash
cd frontend
pnpm install    # Instalar dependências
pnpm dev        # Desenvolvimento (hot reload)
pnpm build      # Build de produção
```

### Deploy
```bash
cd frontend && pnpm build         # 1. Build frontend
cp -r dist/* ../static/           # 2. Copiar para static/
cd .. && go build -o estoque-poc  # 3. Build backend
./estoque-poc                     # 4. Executar
```

---

## 🚩 Diretrizes para Agentes

1. **Rastreabilidade**: Nunca atualize `stock` sem criar `movement`
2. **Segurança**: Novos endpoints DEVEM usar `AuthMiddleware`
3. **Frontend**: Use componentes de `UI.tsx` para consistência
4. **Transações**: Use `tx.Begin()` + `defer tx.Rollback()` para operações multi-tabela
5. **Logging**: Use `slog` (structured logging) no backend
6. **Erros**: Sempre retorne mensagens amigáveis ao usuário
7. **Tipos**: TypeScript no frontend, validação de tipos em Go

---

## 📚 Recursos

- **Documentação Completa**: [.agent/agents.md](.agent/agents.md)
- **Regras e Convenções**: [.agent/rules.md](.agent/rules.md)
- **Usuário Padrão**: `admin@sge.com` / `admin123`

---

*Gerado automaticamente pelo Agente Antigravity. Última atualização: 2026-02-06*
