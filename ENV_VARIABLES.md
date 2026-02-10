# Variáveis de Ambiente

Este documento lista todas as variáveis de ambiente necessárias para o sistema.

## Variáveis Obrigatórias

### JWT_SECRET
**Descrição**: Chave secreta para assinatura de tokens JWT  
**Tipo**: String  
**Tamanho mínimo**: 32 caracteres  
**Exemplo**: `JWT_SECRET=seu-secret-super-seguro-com-pelo-menos-32-caracteres`  
**Como gerar**: `openssl rand -base64 32`  
**⚠️ CRÍTICO**: Nunca use o valor padrão em produção!

## Variáveis do Banco de Dados

### Opção 1: Variáveis Individuais
```bash
DB_USER=root
DB_PASS=root
DB_HOST=localhost
DB_PORT=3306
DB_NAME=estoque
```

### Opção 2: DATABASE_URL (sobrescreve as variáveis acima)
```bash
DATABASE_URL=root:root@tcp(localhost:3306)/estoque?parseTime=true
```

## Variáveis Opcionais

### PORT
**Descrição**: Porta do servidor HTTP  
**Padrão**: `8003`  
**Exemplo**: `PORT=8080`

### ENV
**Descrição**: Ambiente de execução  
**Valores**: `development` | `production`  
**Padrão**: `development`  
**Efeito**: Em produção, erros detalhados não são expostos ao usuário  
**Exemplo**: `ENV=production`

## Exemplo de Arquivo .env

```bash
# JWT Secret (OBRIGATÓRIO EM PRODUÇÃO)
JWT_SECRET=seu-secret-super-seguro-com-pelo-menos-32-caracteres

# Banco de Dados
DB_USER=root
DB_PASS=root
DB_HOST=localhost
DB_PORT=3306
DB_NAME=estoque

# Servidor
PORT=8003
ENV=development
```

## Notas de Segurança

1. **JWT_SECRET**: 
   - Deve ser único por ambiente
   - Nunca commitar no repositório
   - Gerar um novo secret para cada ambiente (dev, staging, prod)
   - Em produção, use um gerenciador de secrets (ex: AWS Secrets Manager, HashiCorp Vault)

2. **Senhas do Banco**:
   - Use senhas fortes em produção
   - Não commitar no repositório
   - Considere usar IAM roles em ambientes cloud

3. **Arquivo .env**:
   - Adicione `.env` ao `.gitignore`
   - Use `.env.example` como template (sem valores reais)
   - Em produção, use variáveis de ambiente do sistema ou secrets manager
