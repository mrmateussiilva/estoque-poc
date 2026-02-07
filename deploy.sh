#!/bin/bash
set -e

echo "========== DEPLOY INICIADO =========="
echo "Usuário: $(whoami)"
echo "Diretório: $(pwd)"

echo ""
echo "========== VERIFICANDO DOCKER =========="
docker version | head -5
docker compose version || docker-compose version

echo ""
echo "========== VERIFICANDO .ENV =========="
if [ -f .env ]; then
  echo "✓ Arquivo .env encontrado"
  echo "Primeiras 3 variáveis:"
  grep -E '^(DB_|DATABASE_URL|PORT)' .env | head -3 || echo "Nenhuma variável DB_ encontrada"
else
  echo "✗ ERRO: .env não existe!"
  exit 1
fi

echo ""
echo "========== ATUALIZANDO CÓDIGO =========="
git fetch --all
git reset --hard origin/main
echo "Último commit:"
GIT_PAGER=cat git log -1 --oneline

echo ""
echo "========== PARANDO CONTAINERS ANTIGOS =========="
docker compose down 2>/dev/null || echo "Nenhum container para parar"

echo ""
echo "========== CONSTRUINDO E SUBINDO CONTAINER =========="
docker compose up -d --build --force-recreate

echo ""
echo "========== AGUARDANDO INICIALIZAÇÃO =========="
sleep 5

echo ""
echo "========== STATUS DOS CONTAINERS =========="
docker ps -a

echo ""
echo "========== LOGS DO BACKEND =========="
docker logs sge-backend --tail 50 2>&1 || echo "Container sge-backend não encontrado"

echo ""
echo "========== DEPLOY CONCLUÍDO =========="
