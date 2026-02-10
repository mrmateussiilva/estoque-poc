# Changelog - Melhorias de UX e Funcionalidades

## Data: 2026-02-06

### ✅ Implementadas

#### 1. Feedback Visual em Operações Longas
- **Arquivos**: `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/Stock.tsx`
- **Funcionalidade**: 
  - Loading states em todas as operações assíncronas
  - Indicadores de progresso durante upload de NF-e
  - Skeleton loaders nas tabelas
  - Botões com estado de loading
- **Impacto**: 
  - Usuário sabe que o sistema está processando
  - Melhor experiência durante operações longas

#### 2. Confirmação em Ações Destrutivas
- **Arquivo**: `frontend/src/components/ConfirmModal.tsx` (novo)
- **Funcionalidade**:
  - Modal de confirmação reutilizável
  - Suporta variantes (danger, warning, info)
  - Estados de loading durante confirmação
- **Aplicação**:
  - Exclusão de categorias
  - Inativação de usuários
  - Limpeza de itens em Entries
- **Impacto**: 
  - Previne ações acidentais
  - Melhor segurança e UX

#### 3. Exportação de Dados em CSV
- **Arquivo**: `internal/api/export.go` (novo)
- **Endpoints**:
  - `GET /api/export/stock` - Exporta lista de estoque
  - `GET /api/export/movements` - Exporta movimentações
- **Funcionalidade**:
  - Gera arquivos CSV com todos os dados
  - Nome de arquivo com timestamp
  - Headers apropriados para download
  - Filtros aplicados na exportação
- **Frontend**:
  - Botão de exportação em Stock.tsx
  - Download automático do arquivo
- **Impacto**: 
  - Facilita análises externas
  - Permite backup de dados

#### 4. Dashboard com Atualização Automática (Polling)
- **Arquivo**: `frontend/src/pages/Dashboard.tsx`
- **Funcionalidade**:
  - Polling automático a cada 30 segundos
  - Atualiza stats e evolução do estoque
  - Usa React Query para invalidação inteligente
- **Impacto**: 
  - Dados sempre atualizados
  - Não requer refresh manual

#### 5. Histórico de Alterações (Audit Log)
- **Arquivo**: `internal/models/audit_log.go` (novo), `internal/api/audit.go` (novo)
- **Funcionalidade**:
  - Tabela `audit_logs` criada automaticamente
  - Registra todas as ações importantes:
    - Criação de movimentações
    - Criação/atualização/exclusão de categorias
    - Criação/atualização/inativação de usuários
  - Armazena:
    - User ID, Action, Entity Type, Entity ID
    - Descrição, valores antigos e novos (JSON)
    - IP Address, User Agent
    - Timestamp
- **Função**: `LogAuditAction()` para registrar ações
- **Impacto**: 
  - Rastreabilidade completa
  - Facilita auditoria e compliance

#### 6. Melhorias de Mensagens
- **Arquivos**: Todos os handlers
- **Mudanças**:
  - Todas as mensagens padronizadas em português
  - Mensagens mais claras e amigáveis
  - Consistência em todo o sistema
- **Exemplos**:
  - "Movimentação criada com sucesso"
  - "Categoria atualizada com sucesso"
  - "Método não permitido"

### 📊 Estatísticas

- **Arquivos Criados**: 4 (`ConfirmModal.tsx`, `export.go`, `audit_log.go`, `audit.go`)
- **Arquivos Modificados**: 8
- **Linhas Adicionadas**: ~600
- **Linhas Removidas**: ~20

### 🔧 Arquivos Modificados

1. `frontend/src/components/ConfirmModal.tsx` - Novo componente de confirmação
2. `frontend/src/pages/Admin.tsx` - Confirmações em ações destrutivas
3. `frontend/src/pages/Stock.tsx` - Botão de exportação
4. `frontend/src/pages/Dashboard.tsx` - Polling automático
5. `frontend/src/pages/Entries.tsx` - Confirmação melhorada
6. `internal/api/export.go` - Handlers de exportação
7. `internal/api/audit.go` - Funções de audit log
8. `internal/models/audit_log.go` - Modelo de audit log
9. `internal/api/handlers_extended.go` - Integração de audit log
10. `internal/api/user_handlers.go` - Integração de audit log
11. `internal/database/db.go` - Migração de audit_logs
12. `main.go` - Rotas de exportação

### ⚠️ Breaking Changes

Nenhum breaking change. Todas as mudanças são aditivas.

### 🚀 Como Usar

#### Exportação de Dados
```bash
# Exportar estoque
GET /api/export/stock?search=produto&category_id=1

# Exportar movimentações
GET /api/export/movements?type=ENTRADA&product_code=PROD001
```

#### Audit Log
O audit log é automático e registra:
- Todas as movimentações criadas
- Todas as alterações em categorias
- Todas as alterações em usuários

Para consultar:
```sql
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100;
```

#### Confirmação de Ações
O componente `ConfirmModal` pode ser usado assim:
```tsx
<ConfirmModal
    isOpen={isOpen}
    onClose={() => setIsOpen(false)}
    onConfirm={handleConfirm}
    title="Confirmar Exclusão"
    message="Tem certeza que deseja excluir?"
    variant="danger"
    loading={isLoading}
/>
```

### ✅ Testes Recomendados

1. **Exportação**:
   - Testar exportação de estoque
   - Testar exportação de movimentações
   - Verificar que filtros são aplicados
   - Verificar formato CSV

2. **Confirmações**:
   - Testar exclusão de categoria (deve pedir confirmação)
   - Testar inativação de usuário (deve pedir confirmação)
   - Verificar que cancelar não executa ação

3. **Polling**:
   - Verificar que dashboard atualiza automaticamente
   - Verificar que não há requisições excessivas

4. **Audit Log**:
   - Criar movimentação e verificar log
   - Criar categoria e verificar log
   - Atualizar usuário e verificar log

### 📈 Melhorias Esperadas

- **UX**: Experiência mais fluida e intuitiva
- **Segurança**: Prevenção de ações acidentais
- **Rastreabilidade**: Histórico completo de alterações
- **Produtividade**: Exportação facilita análises

---

*Implementado em: 2026-02-06*
