# Correção de CORS - Problema de Requisições Cross-Origin

## Problema Identificado

O frontend em `https://sge.finderbit.com.br` está tentando fazer requisições para a API em `https://api-sge.finderbit.com.br`, mas está recebendo erros de CORS:

```
CORS Missing Allow Origin
Requisição cross-origin bloqueada: A diretiva Same Origin (mesma origem) não permite a leitura do recurso remoto
```

## Soluções Implementadas

### 1. Configuração de CORS no Backend (`main.go`)

- ✅ Adicionada origem `https://sge.finderbit.com.br` nas origens permitidas
- ✅ Adicionado método `PATCH` aos métodos permitidos
- ✅ Adicionado header `X-Requested-With` aos headers permitidos
- ✅ Adicionado header `Content-Disposition` aos headers expostos (para downloads)

### 2. Correção no Frontend (`Stock.tsx`)

- ✅ Removida duplicação da URL da API no `handleExport` (o `apiFetch` já inclui a URL base)

### 3. Configuração Necessária no Frontend

**IMPORTANTE**: O frontend precisa ter a variável de ambiente `VITE_API_BASE_URL` configurada:

```bash
# No ambiente de produção, criar arquivo .env.production ou configurar no servidor:
VITE_API_BASE_URL=https://api-sge.finderbit.com.br
```

**Para desenvolvimento local:**
```bash
# .env.local ou .env
VITE_API_BASE_URL=http://localhost:8003
```

### 4. Verificação de Proxy/Reverse Proxy

O erro **502 (Bad Gateway)** sugere que pode haver um problema de configuração no proxy/reverse proxy (nginx, caddy, etc.) que está na frente da API.

**Verificações necessárias:**

1. **Nginx/Caddy deve passar os headers CORS corretamente:**
   ```nginx
   # Exemplo para Nginx
   location /api {
       proxy_pass http://localhost:8003;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       
       # Não sobrescrever headers CORS do backend
       proxy_hide_header Access-Control-Allow-Origin;
   }
   ```

2. **Verificar se o proxy não está bloqueando requisições OPTIONS:**
   - As requisições OPTIONS (preflight) devem passar direto para o backend
   - O backend já está configurado para responder corretamente a OPTIONS

3. **Verificar se o backend está rodando e acessível:**
   ```bash
   curl -I https://api-sge.finderbit.com.br/api/health
   ```

## Teste Local

Para testar localmente:

1. **Backend:**
   ```bash
   PORT=8003 go run main.go
   ```

2. **Frontend:**
   ```bash
   cd frontend
   echo "VITE_API_BASE_URL=http://localhost:8003" > .env.local
   pnpm dev
   ```

3. **Verificar CORS:**
   ```bash
   curl -H "Origin: http://localhost:5173" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: Authorization" \
        -X OPTIONS \
        http://localhost:8003/api/stock \
        -v
   ```

   Deve retornar:
   ```
   Access-Control-Allow-Origin: http://localhost:5173
   Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
   Access-Control-Allow-Headers: Accept, Authorization, Content-Type, X-CSRF-Token, X-Requested-With
   ```

## Próximos Passos

1. ✅ Configurar `VITE_API_BASE_URL` no ambiente de produção
2. ⚠️ Verificar configuração do proxy/reverse proxy
3. ⚠️ Testar requisições CORS em produção
4. ⚠️ Verificar logs do backend para identificar erros 502

## Notas

- O middleware de CORS está configurado **ANTES** do middleware de autenticação, garantindo que requisições OPTIONS sejam tratadas corretamente
- O `AuthMiddleware` já está configurado para pular autenticação em requisições OPTIONS
- A configuração de CORS permite credenciais (`AllowCredentials: true`), necessário para enviar tokens JWT
