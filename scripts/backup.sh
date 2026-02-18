#!/bin/bash

# S.G.E. - Database Backup Script
# Recomendado: Adicionar ao crontab (ex: 0 3 * * * para rodar as 3 da manhã)

# Configurações (Ajustar conforme necessário ou usar env vars)
BACKUP_DIR="/var/backups/sge"
DB_NAME=${DB_NAME:-"estoque"}
DB_USER=${DB_USER:-"root"}
DB_PASS=${DB_PASS:-""}
DB_HOST=${DB_HOST:-"localhost"}
RETENTION_DAYS=7

# Criar diretório se não existir
mkdir -p "$BACKUP_DIR"

# Nome do arquivo com timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/sge_backup_$TIMESTAMP.sql.gz"

echo "[$(date)] Iniciando backup do banco de dados $DB_NAME..."

# Realizar o dump compactado
if [ -z "$DB_PASS" ]; then
    mysqldump -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" | gzip > "$FILENAME"
else
    export MYSQL_PWD="$DB_PASS"
    mysqldump -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" | gzip > "$FILENAME"
    unset MYSQL_PWD
fi

# Verificar se funcionou
if [ $? -eq 0 ]; then
    echo "[$(date)] Backup concluído com sucesso: $FILENAME"
    
    # Remover backups antigos (mais de RETENTION_DAYS dias)
    echo "[$(date)] Limpando backups antigos (retenção: $RETENTION_DAYS dias)..."
    find "$BACKUP_DIR" -name "sge_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "[$(date)] Limpeza concluída."
else
    echo "[$(date)] ERRO: Falha ao realizar backup do banco de dados!"
    exit 1
fi
