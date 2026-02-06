# 📋 Rules - Sistema de Gestão de Estoque (S.G.E.)

Este documento define as regras, convenções e padrões que devem ser seguidos ao desenvolver neste projeto.

---

## 🎯 Princípios Fundamentais

### 1. **Rastreabilidade Total**
- **NUNCA** atualize a tabela `stock` sem criar um registro correspondente em `movements`
- Toda alteração de estoque DEVE ter origem rastreável (`origin`: NFE, MANUAL, VENDA, etc.)
- Movimentações devem incluir `reference` quando aplicável (chave de acesso NF-e, ID de venda, etc.)

### 2. **Segurança em Primeiro Lugar**
- Todos os endpoints (exceto `/login`) DEVEM usar `AuthMiddleware`
- Senhas DEVEM ser hasheadas com `bcrypt` (nunca armazenar em texto plano)
- Tokens JWT devem expirar em 24 horas
- Validar SEMPRE as permissões do usuário baseado no `role`

### 3. **Integridade de Dados**
- Use transações (`tx.Begin()`) para operações que envolvem múltiplas tabelas
- Sempre faça `defer tx.Rollback()` após iniciar uma transação
- Valide duplicação de NF-e antes de processar (verificar `access_key`)
- **MySQL 5.6**: O sistema agora utiliza MySQL 5.6. Garanta que o servidor esteja acessível.

---

## 🏗️ Arquitetura e Organização

### Backend (Go)

#### Estrutura de Diretórios
```
estoque-poc/
├── main.go                 # Ponto de entrada, configuração de rotas
├── internal//
│   ├── api/               # Handlers e middlewares HTTP
│   │   ├── handlers.go           # Handlers principais (Login, Upload, Stock)
│   │   ├── handlers_extended.go  # Handlers adicionais (Dashboard, Movements, etc.)
│   │   ├── middleware.go         # AuthMiddleware, CorsMiddleware, LoggingMiddleware
│   │   └── responses.go          # Funções auxiliares de resposta HTTP
│   ├── database/          # Inicialização e migrations
│   │   └── db.go                 # InitDB, CreateTables, seeds
│   └── models/            # Estruturas de dados
│       └── models.go             # DTOs e modelos de domínio
├── static/                # Frontend compilado (servido pelo backend)
└── .env                  # Configurações de banco (MySQL)
```

#### Convenções de Código Go

1. **Nomenclatura**
   - Handlers: `<Recurso>Handler` (ex: `LoginHandler`, `StockHandler`)
   - Middlewares: `<Nome>Middleware` (ex: `AuthMiddleware`)
   - Structs: PascalCase (ex: `StockItem`, `Movement`)
   - Campos JSON: snake_case (ex: `product_code`, `created_at`)

2. **Tratamento de Erros**
   ```go
   if err != nil {
       slog.Error("Descrição do erro", "context", valor, "error", err)
       RespondWithError(w, http.StatusInternalServerError, "Mensagem amigável")
       return
   }
   ```

3. **Logging Estruturado**
   - Use `slog` para todos os logs
   - Níveis: `Debug`, `Info`, `Warn`, `Error`
   - Sempre inclua contexto relevante nos logs

4. **Respostas HTTP**
   - Use `RespondWithJSON()` para sucesso
   - Use `RespondWithError()` para erros
   - Status codes apropriados:
     - 200: Sucesso
     - 201: Criado
     - 400: Requisição inválida
     - 401: Não autenticado
     - 403: Não autorizado
     - 404: Não encontrado
     - 409: Conflito (ex: NF-e duplicada)
     - 500: Erro interno

5. **Queries SQL (Dialeto MySQL 5.6)**
   - Use prepared statements (placeholders `?`)
   - Use `INSERT IGNORE` para evitar erros de duplicidade amigáveis
   - Use `ON DUPLICATE KEY UPDATE` para upserts (substitui o `ON CONFLICT` do SQLite)
   - Use `DATE_FORMAT(date, format)` para formatação de datas
   - Prefira `DECIMAL(19,4)` para valores monetários e quantidades
   - Sempre use `LEFT JOIN` quando a relação pode ser nula
   - Adicione índices para colunas frequentemente consultadas

### Frontend (React + TypeScript)

#### Estrutura de Diretórios
```
frontend/
├── src/
│   ├── components/        # Componentes reutilizáveis
│   │   ├── UI.tsx                # Componentes de interface (Card, Button, Input, etc.)
│   │   ├── EditProductModal.tsx
│   │   ├── EntryActionCards.tsx
│   │   ├── EntryForm.tsx
│   │   └── EntryTable.tsx
│   ├── contexts/          # Contextos React
│   │   ├── AuthContext.tsx       # Autenticação e apiFetch
│   │   └── DataContext.tsx       # Cache global de dados
│   ├── layout/            # Componentes de layout
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── pages/             # Páginas da aplicação
│   │   ├── Dashboard.tsx
│   │   ├── Entries.tsx
│   │   ├── Stock.tsx
│   │   ├── NFe.tsx
│   │   ├── Reports.tsx
│   │   └── Login.tsx
│   ├── App.tsx            # Componente raiz
│   ├── main.tsx           # Ponto de entrada
│   └── index.css          # Estilos globais
├── package.json
└── vite.config.ts
```

#### Convenções de Código TypeScript/React

1. **Nomenclatura**
   - Componentes: PascalCase (ex: `Dashboard`, `EntryForm`)
   - Hooks customizados: `use<Nome>` (ex: `useAuth`, `useData`)
   - Funções: camelCase (ex: `handleSubmit`, `fetchProducts`)
   - Interfaces: PascalCase com sufixo descritivo (ex: `User`, `StockItem`, `AuthContextType`)

2. **Componentes**
   - Prefira function components com hooks
   - Use TypeScript para todas as props e estados
   - Extraia lógica complexa para hooks customizados
   - Mantenha componentes focados em uma única responsabilidade

3. **Estado e Contextos**
   - Use `AuthContext` para autenticação e `apiFetch`
   - Use `DataContext` para cache global de produtos, categorias, etc.
   - Evite prop drilling - use contextos quando apropriado
   - Prefira estado local quando o dado não precisa ser compartilhado

4. **Chamadas à API**
   - SEMPRE use `apiFetch` do `AuthContext` (inclui token automaticamente)
   - Trate erros de forma amigável ao usuário
   - Mostre estados de loading durante requisições
   - Exemplo:
     ```typescript
     const { apiFetch } = useAuth();
     
     const fetchData = async () => {
       try {
         const response = await apiFetch('/api/products');
         const data = await response.json();
         setProducts(data);
       } catch (error) {
         console.error('Erro ao carregar produtos:', error);
       }
     };
     ```

5. **Estilização**
   - Use Tailwind CSS para todos os estilos
   - Siga o design system definido em `UI.tsx`
   - Mantenha consistência visual entre páginas
   - Use classes utilitárias do Tailwind (evite CSS customizado)

6. **Ícones**
   - Use `lucide-react` para todos os ícones
   - Mantenha tamanhos consistentes (geralmente `size={20}` ou `size={24}`)

---

## 🗄️ Banco de Dados

### Tabelas Principais

#### `products`
- **Chave Primária**: `code` (SKU do produto)
- **Campos Obrigatórios**: `code`, `name`, `unit`
- **Soft Delete**: Use `active = 0` ao invés de deletar

#### `stock`
- **Chave Primária**: `product_code`
- **Regra**: NUNCA atualizar diretamente sem criar movimento

#### `movements`
- **Regra**: Criar SEMPRE que houver alteração de estoque
- **Tipos**: 'ENTRADA' ou 'SAIDA'
- **Origens**: 'NFE', 'MANUAL', 'VENDA', 'AJUSTE', etc.

#### `processed_nfes`
- **Chave Primária**: `access_key`
- **Regra**: Verificar duplicação antes de processar

#### `users`
- **Roles**: 'ADMIN', 'GERENTE', 'OPERADOR', 'VISUALIZADOR'
- **Senha**: SEMPRE hasheada com bcrypt

### Migrations

- Migrations são executadas via strings SQL em `database/db.go`
- Novas tabelas devem ser adicionadas ao array `queries` em `CreateTables()`
- Use `IF NOT EXISTS` para evitar erros em execuções subsequentes
- Crie índices para melhorar performance de queries frequentes

---

## 🔐 Autenticação e Autorização

### JWT (JSON Web Tokens)

1. **Geração**
   - Secret: Definido em `api/middleware.go` (variável `JwtSecret`)
   - Expiração: 24 horas
   - Claims: Email do usuário

2. **Validação**
   - Middleware `AuthMiddleware` valida token em todas as rotas protegidas
   - Token inválido/expirado retorna 401 Unauthorized
   - Frontend remove token e redireciona para login

3. **Frontend**
   - Token armazenado em `localStorage` (`auth_token`)
   - Incluído automaticamente em todas as requisições via `apiFetch`
   - Logout limpa `localStorage` e estado do contexto

### Roles e Permissões

- **ADMIN**: Acesso total ao sistema
- **GERENTE**: Visualização e edição de dados
- **OPERADOR**: Operações básicas (entradas, saídas)
- **VISUALIZADOR**: Apenas leitura

*Nota: Atualmente o sistema valida apenas autenticação. Implementação de autorização por role é futura.*

---

## 📦 Fluxo de Processamento de NF-e

1. **Upload** (`POST /nfe/upload`)
   - Validar formato XML
   - Verificar duplicação por `access_key`
   - Iniciar transação

2. **Processamento**
   - Para cada item (`det`) na NF-e:
     - Inserir/ignorar produto (`INSERT OR IGNORE`)
     - Criar movimentação de ENTRADA
     - Atualizar estoque (`ON CONFLICT DO UPDATE`)

3. **Finalização**
   - Registrar NF-e em `processed_nfes`
   - Commit da transação
   - Retornar sucesso com total de itens

4. **Tratamento de Erros**
   - Rollback automático em caso de erro
   - Mensagens amigáveis ao usuário
   - Log detalhado do erro

---

## 🧪 Testes e Qualidade

### Backend

1. **Testes Manuais**
   - Testar endpoints com `curl` ou Postman
   - Validar respostas JSON
   - Verificar logs estruturados

2. **Build**
   ```bash
   go build -o estoque-poc main.go
   ```

3. **Execução**
   ```bash
   ./estoque-poc
   # Porta padrão: 8003 (configurável via PORT env var)
   ```

### Frontend

1. **Desenvolvimento**
   ```bash
   cd frontend
   pnpm dev
   ```

2. **Build de Produção**
   ```bash
   pnpm build
   # Output: frontend/dist/
   ```

3. **Lint**
   ```bash
   pnpm lint
   ```

---

## 🚀 Deploy e Produção

### Backend

1. **Compilação**
   - Compilar para o SO alvo: `GOOS=linux GOARCH=amd64 go build -o estoque-poc main.go`

2. **Variáveis de Ambiente**
   - `PORT`: Porta do servidor (padrão: 8003)

3. **Frontend Estático**
   - Build do frontend deve ser copiado para `./static/`
   - Backend serve automaticamente via `http.FileServer`

### Frontend

1. **Build**
   - `pnpm build` gera arquivos em `dist/`
   - Copiar conteúdo de `dist/` para `../static/`

2. **Variáveis de Ambiente**
   - `VITE_API_BASE_URL`: URL base da API (padrão: http://localhost:8080)
   - Configurar em `.env` para desenvolvimento

---

## 📝 Convenções de Commit

Use mensagens de commit claras e descritivas:

- `feat: adiciona endpoint de relatórios`
- `fix: corrige cálculo de estoque mínimo`
- `refactor: reorganiza handlers em arquivos separados`
- `docs: atualiza documentação de API`
- `style: ajusta formatação de código`
- `test: adiciona testes para movimento de estoque`

---

## ⚠️ Avisos Importantes

1. **Nunca commitar**:
   - `estoque.db` (banco de dados local)
   - `frontend/node_modules/`
   - `frontend/dist/`
   - Arquivos binários compilados

2. **Backup de Dados**:
   - SQLite é um arquivo único (`estoque.db`)
   - Fazer backup regular em produção
   - Considerar migração para PostgreSQL/MySQL em escala

3. **Segurança**:
   - Trocar `JwtSecret` em produção
   - Usar HTTPS em produção
   - Validar e sanitizar TODOS os inputs do usuário

---

## 🔄 Workflow de Desenvolvimento

1. **Nova Feature**
   - Criar branch: `git checkout -b feature/nome-da-feature`
   - Desenvolver e testar localmente
   - Commit com mensagem descritiva
   - Merge para main após revisão

2. **Bug Fix**
   - Criar branch: `git checkout -b fix/nome-do-bug`
   - Corrigir e testar
   - Commit e merge

3. **Antes de Commitar**
   - Testar backend: `go build && ./estoque-poc`
   - Testar frontend: `cd frontend && pnpm build`
   - Verificar logs de erro
   - Revisar código alterado

---

*Este documento deve ser atualizado conforme o projeto evolui. Mantenha-o sincronizado com a realidade do código.*
