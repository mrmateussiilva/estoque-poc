# Correção de CORS - Problema 502 Bad Gateway

## Problema Identificado

O erro **502 (Bad Gateway)** indica que o proxy/reverse proxy não está conseguindo se comunicar com o backend ou está bloqueando requisições OPTIONS.

## Soluções Implementadas no Backend

### 1. Handler Global para OPTIONS
- ✅ Adicionado handler `r.Options("/*")` **ANTES** de qualquer rota
- ✅ Handler também dentro de `/api` para garantir cobertura completa
- ✅ Middleware de autenticação já pula requisições OPTIONS

### 2. Ordem dos Middlewares
A ordem correta é:
1. Middlewares globais (RequestID, RealIP, Logger, Recoverer, Timeout)
2. **CORS Middleware** (deve estar antes de autenticação)
3. Handler global para OPTIONS
4. Rotas da API

## Configuração Necessária no Proxy/Reverse Proxy

### Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name api-sge.finderbit.com.br;

    # Certificados SSL
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        # IMPORTANTE: Passar todas as requisições, incluindo OPTIONS
        proxy_pass http://localhost:8003;
        
        # Headers básicos
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts aumentados
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # IMPORTANTE: Não sobrescrever headers CORS do backend
        # O backend já adiciona os headers CORS corretos
        # Deixe o backend fazer isso
        
        # Buffer settings para melhor performance
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    # Health check endpoint (opcional, mas recomendado)
    location /api/health {
        proxy_pass http://localhost:8003/api/health;
        access_log off;
    }
}
```

### Caddy

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
        
        # Não modificar headers CORS - deixar o backend fazer isso
    }
}
```

## Verificações de Diagnóstico

### 1. Verificar se o backend está rodando

```bash
# Verificar se a porta 8003 está escutando
netstat -tlnp | grep 8003
# ou
ss -tlnp | grep 8003

# Testar diretamente o backend (bypass proxy)
curl -X OPTIONS http://localhost:8003/api/dashboard/stats \
  -H "Origin: https://sge.finderbit.com.br" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

### 2. Verificar logs do proxy

```bash
# Nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Caddy
# Logs geralmente em stdout/stderr ou arquivo configurado
```

### 3. Testar requisição OPTIONS diretamente

```bash
# Testar OPTIONS diretamente no backend (bypass proxy)
curl -X OPTIONS http://localhost:8003/api/dashboard/stats \
  -H "Origin: https://sge.finderbit.com.br" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -v

# Deve retornar:
# HTTP/1.1 204 No Content
# Access-Control-Allow-Origin: https://sge.finderbit.com.br
# Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
# Access-Control-Allow-Headers: Accept, Authorization, Content-Type, X-CSRF-Token, X-Requested-With
# Access-Control-Allow-Credentials: true
# Access-Control-Max-Age: 300
```

### 4. Verificar se o proxy está passando requisições OPTIONS

```bash
# Testar através do proxy
curl -X OPTIONS https://api-sge.finderbit.com.br/api/dashboard/stats \
  -H "Origin: https://sge.finderbit.com.br" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Se retornar 502, o proxy não está conseguindo se comunicar com o backend
# Se retornar 204 com headers CORS, está funcionando
```

## Problemas Comuns e Soluções

### Problema 1: 502 Bad Gateway
**Causa**: Proxy não consegue se conectar ao backend

**Soluções**:
- Verificar se o backend está rodando na porta correta
- Verificar firewall entre proxy e backend
- Verificar se `proxy_pass` está apontando para o endereço correto
- Verificar timeouts do proxy

### Problema 2: CORS headers não aparecem
**Causa**: Proxy está sobrescrevendo ou removendo headers CORS

**Soluções**:
- **NÃO** adicionar headers CORS no proxy
- Deixar o backend adicionar todos os headers CORS
- Verificar se há configurações que removem headers

### Problema 3: OPTIONS retorna 401/403
**Causa**: Middleware de autenticação bloqueando OPTIONS

**Solução**: Já implementado - o `AuthMiddleware` pula requisições OPTIONS

### Problema 4: Requisições intermitentes falhando
**Causa**: Timeout muito baixo ou backend lento

**Soluções**:
- Aumentar timeouts do proxy
- Verificar performance do backend
- Verificar se há rate limiting muito agressivo

## Checklist de Configuração

- [ ] Backend rodando na porta 8003
- [ ] Proxy configurado para passar requisições para `localhost:8003`
- [ ] Headers básicos configurados no proxy (Host, X-Real-IP, etc.)
- [ ] Timeouts configurados adequadamente (60s+)
- [ ] **NÃO** adicionar headers CORS no proxy
- [ ] Handler global para OPTIONS no backend
- [ ] CORS middleware antes de autenticação
- [ ] Middleware de autenticação pula requisições OPTIONS
- [ ] Testar requisição OPTIONS diretamente no backend
- [ ] Testar requisição OPTIONS através do proxy

## Notas Importantes

1. **Nunca adicione headers CORS no proxy** - o backend já faz isso corretamente
2. **Sempre teste diretamente no backend primeiro** - isso isola problemas de proxy
3. **Verifique logs do proxy** - eles geralmente mostram o problema real
4. **502 = problema de comunicação**, não CORS - verifique conectividade primeiro
