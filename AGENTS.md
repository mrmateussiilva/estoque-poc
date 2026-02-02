# 🤖 AGENTS.md - Guia para Agentes de IA

Este documento serve como referência para outros agentes de IA (como Antigravity, GitHub Copilot, etc.) que venham a trabalhar neste projeto.

## 🏗️ Arquitetura do Sistema

O **S.G.E. (Sistema de Gestão de Estoque)** é um SaaS simples composto por:

### 1. Backend (Go)
- **Localização**: Raiz do projeto.
- **Banco de Dados**: SQLite (`estoque.db`).
- **Autenticação**: JWT (JSON Web Tokens).
- **Estrutura**:
  - `main.go`: Ponto de entrada e definição de rotas.
  - `internal/api/`: Handlers e middlewares.
  - `internal/database/`: Inicialização e migrations (via `queries` strings).
  - `internal/models/`: Estruturas de dados (DTOs e modelos de banco).

### 2. Frontend (React + TS)
- **Localização**: `/frontend`
- **Stack**: React, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Páginas Principais**: Dashboard, Estoque, Entradas, NF-e, Relatórios.

## 🗃️ Estrutura de Dados Crítica

### Tabela `products`
O coração do sistema. Cada produto é identificado pelo seu `code` (SKU).

### Tabela `movements` (SaaS Core)
**Toda** alteração de estoque **DEVE** gerar um registro nesta tabela.
- `type`: 'ENTRADA' ou 'SAIDA'.
- `origin`: 'NFE', 'MANUAL', 'VENDA', etc.

## 🛠️ Comandos Comuns

### Backend
```bash
# Compilar
go build -o estoque-poc main.go

# Rodar (Porta 8003 por padrão)
./estoque-poc
```

### Frontend
```bash
cd frontend
pnpm dev
```

## 🚩 Diretrizes de Desenvolvimento

1. **Rastreabilidade**: Nunca atualize a tabela `stock` sem criar um registro correspondente em `movements`.
2. **Segurança**: Todos os novos endpoints devem usar o `AuthMiddleware`.
3. **Frontend**: Use os componentes de UI em `frontend/src/components/UI.tsx` para manter consistência.
4. **Mock Data**: Evite usar dados fictícios no frontend; conecte sempre aos novos endpoints em `handlers_extended.go`.

## 📈 Fluxo de Upload NF-e
1. O XML é recebido via `POST /nfe/upload`.
2. O backend processa o XML, cadastra produtos novos e cria uma movimentação do tipo `ENTRADA` para cada item.
3. O estoque atual (`stock`) é incrementado.

---
*Gerado automaticamente pelo Agente Antigravity para suporte a futuros desenvolvimentos.*
