# 🤖 Agents - Guia para Agentes de IA

Este documento serve como referência completa para agentes de IA (Antigravity, GitHub Copilot, Cursor, etc.) que trabalharão neste projeto.

---

## 📊 Visão Geral do Projeto

**Nome**: S.G.E. (Sistema de Gestão de Estoque)  
**Tipo**: SaaS de controle de estoque  
**Status**: PoC (Proof of Concept) em evolução

### Objetivo
Sistema automatizado de gestão de estoque baseado no processamento de arquivos XML de Nota Fiscal Eletrônica (NF-e), com interface web moderna para visualização e controle.

---

## 🏗️ Arquitetura do Sistema

### Stack Tecnológica

#### Backend
- **Linguagem**: Go 1.25.4
- **Banco de Dados**: MySQL 5.6
- **Autenticação**: JWT (JSON Web Tokens)
- **HTTP Server**: `net/http` nativo (sem frameworks)
- **Logging**: `slog` (structured logging)
- **Dependências**:
  - `github.com/go-sql-driver/mysql` - Driver MySQL
  - `github.com/golang-jwt/jwt/v5` - JWT
  - `golang.org/x/crypto/bcrypt` - Hash de senhas

#### Frontend
- **Framework**: React 19.2.0
- **Linguagem**: TypeScript 5.9.3
- **Build Tool**: Vite 7.2.4
- **Estilização**: Tailwind CSS 4.1.18
- **Ícones**: Lucide React 0.563.0
- **Gráficos**: Recharts 3.7.0
- **Gerenciador de Pacotes**: pnpm

### Estrutura de Diretórios

```
estoque-poc/
├── main.go                      # Ponto de entrada do backend
├── go.mod, go.sum              # Dependências Go
├── .env                        # Variáveis de ambiente (DB, Port, etc.)
├── internal/                   # Código interno do backend
│   ├── api/
│   │   ├── handlers.go         # Login, Upload NF-e, Stock
│   │   ├── handlers_extended.go # Dashboard, Movements, Products, Categories
│   │   ├── middleware.go       # Auth, CORS, Logging
│   │   └── responses.go        # Helpers de resposta HTTP
│   ├── database/
│   │   └── db.go              # InitDB, migrations, seeds
│   └── models/
│       └── models.go          # Structs de dados (DTOs)
├── static/                     # Frontend compilado (servido pelo backend)
├── frontend/                   # Código fonte do frontend
│   ├── src/
│   │   ├── components/        # Componentes reutilizáveis
│   │   ├── contexts/          # AuthContext, DataContext
│   │   ├── layout/            # Header, Sidebar
│   │   ├── pages/             # Dashboard, Stock, Entries, NFe, Reports, Login
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── .agent/                     # Documentação para agentes
│   ├── rules.md               # Regras e convenções do projeto
│   └── agents.md              # Este arquivo
├── AGENTS.md                   # Versão simplificada na raiz
├── README.md
└── DOCKER.md
```

---

## 🗄️ Modelo de Dados

### Diagrama de Relacionamentos

```
users (1) ──┐
            │
            ├──> movements (N) ──> products (1)
            │                           │
categories (1) ─────────────────────────┤
                                        │
suppliers (1) ──────────────────────────┤
                                        │
                                        └──> stock (1:1)

processed_nfes (independente)
```

### Tabelas Principais

#### `products`
```sql
CREATE TABLE products (
    code VARCHAR(255) PRIMARY KEY,      -- SKU do produto
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT,                    -- FK para categories
    unit VARCHAR(20) DEFAULT 'UN',
    barcode VARCHAR(255) UNIQUE,
    cost_price DECIMAL(19,4) DEFAULT 0,
    sale_price DECIMAL(19,4) DEFAULT 0,
    min_stock DECIMAL(19,4) DEFAULT 0,
    max_stock DECIMAL(19,4),
    location VARCHAR(255),
    supplier_id INT,                    -- FK para suppliers
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### `stock`
```sql
CREATE TABLE stock (
    product_code VARCHAR(255) PRIMARY KEY, -- FK para products.code
    quantity DECIMAL(19,4) DEFAULT 0
);
```

**⚠️ REGRA CRÍTICA**: Nunca atualizar `stock.quantity` diretamente sem criar um registro em `movements`.

#### `movements`
```sql
CREATE TABLE movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_code VARCHAR(255) NOT NULL, -- FK para products.code
    type ENUM('ENTRADA', 'SAIDA') NOT NULL,
    quantity DECIMAL(19,4) NOT NULL,
    origin VARCHAR(255),               -- 'NFE', 'MANUAL', 'VENDA', 'AJUSTE'
    reference VARCHAR(255),            -- Chave NF-e, ID venda, etc.
    user_id INT,                       -- FK para users.id
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Índices**:
- `idx_movements_product` em `product_code`
- `idx_movements_created` em `created_at`
- `idx_movements_type` em `type`

#### `processed_nfes`
```sql
CREATE TABLE processed_nfes (
    access_key VARCHAR(255) PRIMARY KEY, -- Chave de acesso da NF-e (44 dígitos)
    number VARCHAR(50),
    supplier_name VARCHAR(255),
    total_items INT,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `users`
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,         -- Hasheado com bcrypt
    role ENUM('ADMIN', 'GERENTE', 'OPERADOR', 'VISUALIZADOR') DEFAULT 'OPERADOR',
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Usuário Padrão**:
- Email: `admin@sge.com`
- Senha: `admin123`
- Role: `ADMIN`

#### `categories`
```sql
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    parent_id INT                   -- FK para categories.id (hierarquia)
);
```

**Categorias Padrão**: Eletrônicos, Informática, Escritório, Ferramentas, Outros

#### `suppliers`
```sql
CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20) UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 API Endpoints

### Base URL
- **Desenvolvimento**: `http://localhost:8003`
- **Configurável via**: Variável de ambiente `PORT`

### Rotas Públicas

#### `POST /login`
**Descrição**: Autenticação de usuário  
**Body**:
```json
{
  "email": "admin@sge.com",
  "password": "admin123"
}
```
**Resposta**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "admin@sge.com",
    "role": "ADMIN",
    "active": true
  }
}
```

### Rotas Protegidas (Requerem `Authorization: Bearer <token>`)

#### `POST /nfe/upload`
**Descrição**: Upload e processamento de XML de NF-e  
**Content-Type**: `multipart/form-data`  
**Form Field**: `file` (arquivo XML)  
**Resposta**:
```json
{
  "message": "NF-e processada com sucesso",
  "total_items": 15
}
```

#### `GET /api/nfes`
**Descrição**: Lista NF-es processadas  
**Resposta**: Array de `ProcessedNFe`

#### `GET /stock`
**Descrição**: Lista produtos com estoque  
**Query Params**:
- `search`: Busca por código ou nome
- `category_id`: Filtro por categoria

**Resposta**: Array de `StockItem`

#### `GET /api/products`
**Descrição**: Lista todos os produtos  
**Resposta**: Array de `Product`

#### `PATCH /api/products/{code}`
**Descrição**: Atualiza produto  
**Body**: Campos a atualizar (parcial)

#### `POST /api/movements`
**Descrição**: Cria movimentação manual  
**Body**:
```json
{
  "product_code": "PROD001",
  "type": "ENTRADA",
  "quantity": 10,
  "origin": "MANUAL",
  "notes": "Ajuste de inventário"
}
```

#### `GET /api/movements/list`
**Descrição**: Lista movimentações  
**Query Params**:
- `product_code`: Filtro por produto
- `type`: Filtro por tipo (ENTRADA/SAIDA)
- `limit`: Limite de resultados

#### `GET /api/dashboard/stats`
**Descrição**: Estatísticas do dashboard  
**Resposta**:
```json
{
  "total_items": 1500.5,
  "total_skus": 250,
  "entries_this_month": 45,
  "low_stock_count": 12
}
```

#### `GET /api/dashboard/evolution`
**Descrição**: Evolução do estoque por mês  
**Resposta**: Array de `{ month: string, items: number }`

#### `GET /api/categories`
**Descrição**: Lista categorias  
**Resposta**: Array de `Category`

---

## 🔐 Autenticação e Segurança

### Fluxo de Autenticação

1. **Login**:
   - Frontend envia credenciais para `POST /login`
   - Backend valida com bcrypt
   - Retorna JWT com expiração de 24h

2. **Armazenamento**:
   - Token salvo em `localStorage` (`auth_token`)
   - Usuário salvo em `localStorage` (`auth_user`)

3. **Requisições Autenticadas**:
   - Frontend usa `apiFetch` do `AuthContext`
   - Header `Authorization: Bearer <token>` incluído automaticamente

4. **Validação**:
   - `AuthMiddleware` valida token em todas as rotas protegidas
   - Token inválido/expirado → 401 Unauthorized
   - Frontend detecta 401 e faz logout automático

### Middleware Stack

Todas as rotas protegidas usam:
```
LoggingMiddleware → CorsMiddleware → AuthMiddleware → Handler
```

---

## 🎨 Frontend - Componentes e Contextos

### Contextos

#### `AuthContext`
**Localização**: `frontend/src/contexts/AuthContext.tsx`

**Provê**:
- `user: User | null` - Usuário autenticado
- `token: string | null` - JWT
- `login(email, password)` - Função de login
- `logout()` - Função de logout
- `isAuthenticated: boolean` - Status de autenticação
- `apiFetch(endpoint, options)` - Fetch com token automático

**Uso**:
```typescript
const { apiFetch, isAuthenticated, logout } = useAuth();
```

#### `DataContext`
**Localização**: `frontend/src/contexts/DataContext.tsx`

**Provê**:
- Cache global de produtos, categorias, etc.
- Funções de refresh de dados
- Evita requisições duplicadas

### Componentes de UI

**Localização**: `frontend/src/components/UI.tsx`

Componentes disponíveis:
- `Card` - Container com sombra e bordas arredondadas
- `Button` - Botão com variantes (primary, secondary, danger)
- `Input` - Campo de texto estilizado
- `Select` - Dropdown estilizado
- `Table` - Tabela responsiva
- `Badge` - Tag colorida para status
- `Modal` - Overlay modal

**Sempre use estes componentes para manter consistência visual.**

### Páginas

#### `Dashboard.tsx`
- Estatísticas gerais (total de itens, SKUs, entradas do mês)
- Gráfico de evolução de estoque
- Lista de produtos com estoque baixo

#### `Stock.tsx`
- Lista completa de produtos
- Filtros por nome/código e categoria
- Edição de produtos (modal)
- Indicadores visuais de estoque baixo/alto

#### `Entries.tsx`
- Formulário de entrada manual
- Tabela de movimentações recentes
- Cards de ações rápidas

#### `NFe.tsx`
- Upload de arquivos XML
- Lista de NF-es processadas
- Histórico de processamento

#### `Reports.tsx`
- Relatórios diversos (em desenvolvimento)

#### `Login.tsx`
- Formulário de autenticação
- Validação de credenciais

---

## 🔄 Fluxos de Dados Críticos

### Fluxo de Upload de NF-e

```
1. Usuário seleciona arquivo XML no frontend
   ↓
2. Frontend envia via POST /nfe/upload (multipart/form-data)
   ↓
3. Backend valida XML e decodifica estrutura NfeProc
   ↓
4. Verifica duplicação por access_key em processed_nfes
   ↓
5. Inicia transação SQL
   ↓
6. Para cada item (det) na NF-e:
   a. INSERT IGNORE em products
   b. INSERT em movements (type: ENTRADA, origin: NFE)
   c. INSERT ... ON DUPLICATE KEY UPDATE em stock
   ↓
7. INSERT em processed_nfes
   ↓
8. Commit da transação
   ↓
9. Retorna sucesso com total de itens
```

### Fluxo de Movimentação Manual

```
1. Usuário preenche formulário em Entries.tsx
   ↓
2. Frontend envia POST /api/movements
   ↓
3. Backend valida dados
   ↓
4. Inicia transação
   ↓
5. INSERT em movements
   ↓
6. UPDATE em stock (incrementa ou decrementa)
   ↓
7. Commit da transação
   ↓
8. Retorna movimento criado
```

### Fluxo de Atualização de Produto

```
1. Usuário edita produto em Stock.tsx (modal)
   ↓
2. Frontend envia PATCH /api/products/{code}
   ↓
3. Backend valida campos
   ↓
4. UPDATE em products
   ↓
5. Atualiza updated_at
   ↓
6. Retorna produto atualizado
```

---

## 🛠️ Comandos de Desenvolvimento

### Backend

```bash
# Compilar
go build -o estoque-poc main.go

# Executar
./estoque-poc

# Compilar e executar
go run main.go

# Build para produção (Linux)
GOOS=linux GOARCH=amd64 go build -o estoque-poc main.go
```

### Frontend

```bash
cd frontend

# Instalar dependências
pnpm install

# Desenvolvimento (hot reload)
pnpm dev

# Build de produção
pnpm build

# Lint
pnpm lint

# Preview do build
pnpm preview
```

### Deploy

```bash
# 1. Build do frontend
cd frontend
pnpm build

# 2. Copiar para static/
cp -r dist/* ../static/

# 3. Build do backend
cd ..
go build -o estoque-poc main.go

# 4. Executar
./estoque-poc
```

---

## 🧩 Padrões de Código

### Backend (Go)

#### Handler Pattern
```go
func (h *Handler) NomeHandler(w http.ResponseWriter, r *http.Request) {
    // 1. Validar método HTTP
    if r.Method != http.MethodPost {
        RespondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
        return
    }

    // 2. Decodificar request
    var req models.Request
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        RespondWithError(w, http.StatusBadRequest, "Invalid request")
        return
    }

    // 3. Validar dados
    if req.Field == "" {
        RespondWithError(w, http.StatusBadRequest, "Field is required")
        return
    }

    // 4. Processar (com transação se necessário)
    tx, err := h.DB.Begin()
    if err != nil {
        RespondWithError(w, http.StatusInternalServerError, "DB Error")
        return
    }
    defer tx.Rollback()

    // ... operações no banco

    if err := tx.Commit(); err != nil {
        RespondWithError(w, http.StatusInternalServerError, "Commit error")
        return
    }

    // 5. Responder
    RespondWithJSON(w, http.StatusOK, response)
}
```

#### Query Pattern
```go
// Com filtros opcionais
query := "SELECT * FROM products WHERE active = 1"
args := []interface{}{}

if search := r.URL.Query().Get("search"); search != "" {
    query += " AND name LIKE ?"
    args = append(args, "%"+search+"%")
}

rows, err := h.DB.Query(query, args...)
```

### Frontend (React/TypeScript)

#### Componente com Fetch
```typescript
function MyComponent() {
  const { apiFetch } = useAuth();
  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiFetch('/api/endpoint');
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiFetch]);

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      {data.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

#### Formulário com Validação
```typescript
const [formData, setFormData] = useState({ field: '' });
const [errors, setErrors] = useState<Record<string, string>>({});

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validação
  const newErrors: Record<string, string> = {};
  if (!formData.field) newErrors.field = 'Campo obrigatório';
  
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }

  // Envio
  try {
    const response = await apiFetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    
    if (response.ok) {
      // Sucesso
    }
  } catch (error) {
    console.error('Erro:', error);
  }
};
```

---

## 🎯 Tarefas Comuns para Agentes

### Adicionar Novo Endpoint

1. **Criar handler** em `internal/api/handlers_extended.go`:
   ```go
   func (h *Handler) NovoHandler(w http.ResponseWriter, r *http.Request) {
       // Implementação
   }
   ```

2. **Registrar rota** em `main.go`:
   ```go
   mux.HandleFunc("/api/novo", api.LoggingMiddleware(api.CorsMiddleware(api.AuthMiddleware(h.NovoHandler))))
   ```

3. **Criar interface frontend** na página apropriada

### Adicionar Nova Tabela

1. **Adicionar SQL** em `internal/database/db.go` no array `queries`

2. **Criar struct** em `internal/models/models.go`

3. **Criar handlers** para CRUD

4. **Atualizar frontend** para consumir novos endpoints

### Adicionar Nova Página

1. **Criar componente** em `frontend/src/pages/NomeDaPagina.tsx`

2. **Adicionar rota** em `frontend/src/App.tsx`:
   ```typescript
   const pageConfig = {
     // ...
     novapagina: { title: 'Nova Página', component: NovaPagina, showSync: false },
   };
   ```

3. **Adicionar item no menu** em `frontend/src/layout/Sidebar.tsx`

---

## 🐛 Debugging e Troubleshooting

### Backend

- **Logs**: Verifique saída do console (JSON estruturado via `slog`)
- **Banco**: Use `mysql -u root -p estoque` para inspecionar dados
- **Erros comuns**:
  - `Error 1045 (28000): Access denied`: Verifique usuário e senha no .env
  - `Error 1049 (42000): Unknown database`: O banco de dados não existe
  - `401 Unauthorized`: Token expirado ou inválido

### Frontend

- **Console do navegador**: Erros de JavaScript/TypeScript
- **Network tab**: Inspecionar requisições e respostas
- **React DevTools**: Inspecionar estado e props
- **Erros comuns**:
  - `Cannot read property of undefined`: Dados ainda não carregados (use optional chaining)
  - `CORS error`: Backend não está rodando ou CORS mal configurado
  - `401 Unauthorized`: Fazer logout e login novamente

---

## 📚 Recursos Adicionais

### Documentação Oficial

- [Go Documentation](https://go.dev/doc/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [MySQL 5.6 Documentation](https://dev.mysql.com/doc/refman/5.6/en/)

### Estrutura de NF-e XML

A estrutura XML processada segue o padrão:
```xml
<nfeProc>
  <NFe>
    <infNFe Id="NFe44...">
      <det nItem="1">
        <prod>
          <cProd>CODIGO_PRODUTO</cProd>
          <xProd>Nome do Produto</xProd>
          <qCom>10.0000</qCom>
        </prod>
      </det>
      <!-- mais itens -->
    </infNFe>
  </NFe>
</nfeProc>
```

---

## ✅ Checklist para Novas Features

- [ ] Backend: Handler criado e testado
- [ ] Backend: Rota registrada em `main.go`
- [ ] Backend: Logs estruturados adicionados
- [ ] Backend: Tratamento de erros implementado
- [ ] Frontend: Interface criada
- [ ] Frontend: Integração com API via `apiFetch`
- [ ] Frontend: Estados de loading e erro tratados
- [ ] Frontend: Componentes de UI reutilizados
- [ ] Documentação: `rules.md` atualizado se necessário
- [ ] Documentação: `agents.md` atualizado se necessário
- [ ] Testes: Funcionalidade testada manualmente

---

*Este documento é a fonte única de verdade sobre o projeto. Mantenha-o atualizado conforme o sistema evolui.*
