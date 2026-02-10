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

O erro **502 (Bad Gateway)** indica que o proxy/reverse proxy não está conseguindo se comunicar com o backend. Isso pode acontecer por:

1. **Backend não está rodando** na porta configurada
2. **Proxy não está configurado corretamente** para passar requisições ao backend
3. **Firewall bloqueando** conexões entre proxy e backend

**Configuração de Proxy (Nginx):**

```nginx
# Exemplo completo para Nginx
server {
    listen 443 ssl http2;
    server_name api-sge.finderbit.com.br;

    # Certificados SSL
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api {
        # IMPORTANTE: Passar todas as requisições, incluindo OPTIONS
        proxy_pass http://localhost:8003;
        
        # Headers básicos
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # IMPORTANTE: Não sobrescrever headers CORS do backend
        # O backend já adiciona os headers CORS corretos
        # Não adicione headers CORS aqui, deixe o backend fazer isso
        
        # Permitir requisições OPTIONS
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Accept, Authorization, Content-Type, X-CSRF-Token, X-Requested-With' always;
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
```

**Configuração de Proxy (Caddy):**

```caddy
api-sge.finderbit.com.br {
    reverse_proxy localhost:8003 {
        # Headers
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        
        # Timeouts
        transport http {
            dial_timeout 60s
            response_header_timeout 60s
        }
    }
}
```

**Verificações de Diagnóstico:**

1. **Verificar se o backend está rodando:**
   ```bash
   # No servidor onde o backend está rodando
   curl http://localhost:8003/api/health
   # Deve retornar: {"status":"ok","version":"1.1.0"}
   ```

2. **Verificar se o proxy consegue acessar o backend:**
   ```bash
   # Do servidor do proxy
   curl http://localhost:8003/api/health
   # Se falhar, verificar firewall/network
   ```

3. **Testar requisição OPTIONS diretamente no backend:**
   ```bash
   curl -X OPTIONS \
        -H "Origin: https://sge.finderbit.com.br" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: Authorization" \
        http://localhost:8003/api/stock \
        -v
   ```
   Deve retornar headers CORS corretos.

4. **Verificar logs do backend:**
   ```bash
   # Verificar se as requisições estão chegando no backend
   tail -f /var/log/estoque-poc.log
   # ou
   journalctl -u estoque-poc -f
   ```

5. **Verificar logs do proxy:**
   ```bash
   # Nginx
   tail -f /var/log/nginx/error.log
   
   # Caddy
   tail -f /var/log/caddy/access.log
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
