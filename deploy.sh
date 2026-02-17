#!/bin/bash
set -e

# Configurações
PROJECT_NAME="sge-backend"
BLUE_PORT=8003
GREEN_PORT=8004
HEALTH_CHECK_WAIT=5

echo "========== ZERO DOWNTIME DEPLOY INICIADO =========="

# 1. Identificar instância ativa
if docker ps --format '{{.Names}}' | grep -q "${PROJECT_NAME}-blue"; then
    ACTIVE="blue"
    NEXT="green"
    PORT=$GREEN_PORT
else
    ACTIVE="green"
    NEXT="blue"
    PORT=$BLUE_PORT
fi

echo "Instância ativa: $ACTIVE"
echo "Preparando instância: $NEXT na porta $PORT"

# 2. Atualizar código
echo "========== ATUALIZANDO CÓDIGO =========="
git fetch --all
git reset --hard origin/main

# 3. Subir nova instância
echo "========== CONSTRUINDO E SUBINDO $NEXT =========="
# Usamos -p para isolar as instâncias se necessário, ou apenas nomes de container diferentes
# Aqui usamos variáveis de ambiente que o docker-compose.yml agora aceita
export PORT=$PORT
docker compose -p "${PROJECT_NAME}-${NEXT}" up -d --build --force-recreate

# 4. Health Check simplificado
echo "========== AGUARDANDO INICIALIZAÇÃO ($HEALTH_CHECK_WAIT seg) =========="
sleep $HEALTH_CHECK_WAIT

# TODO: Adicionar health check real aqui se houver endpoint
# if ! curl -f http://localhost:$PORT/health; then echo "Erro no health check"; exit 1; fi

# 5. Switch Caddy
echo "========== CHAVEANDO TRÁFEGO NO CADDY =========="
# Nota: Isso assume que você tem um Caddyfile que usa import ou variáveis
# Ou podemos usar a API do Caddy para um switch atômico
# Exemplificando via edição de arquivo (assumindo local comum):
if [ -f "Caddyfile" ]; then
    sed -i "s/localhost:[0-9]\{4\}/localhost:$PORT/g" Caddyfile
    caddy reload --config Caddyfile || echo "Aviso: Caddy não recarregado (verifique se o caddy está no PATH)"
else
    echo "Aviso: arquivo Caddyfile não encontrado no diretório local."
    echo "Por favor, certifique-se de que o Caddy está apontando para localhost:$PORT"
fi

# 6. Cleanup (Opcional: esperar um pouco mais antes de derrubar)
echo "========== FINALIZANDO INSTÂNCIA ANTIGA ($ACTIVE) =========="
docker compose -p "${PROJECT_NAME}-${ACTIVE}" down 2>/dev/null || true

echo "========== DEPLOY $NEXT CONCLUÍDO COM SUCESSO =========="
docker ps | grep $PROJECT_NAME
