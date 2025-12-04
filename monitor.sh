#!/bin/bash

# Script de monitoramento do servidor
# Verifica a cada 30 segundos se o servidor está respondendo

PORT=3333
HOST="172.31.255.3"
LOG_FILE="/srv/mk-auth-support-app-backend/logs/monitor.log"

while true; do
    # Tenta fazer requisição ao servidor
    response=$(curl -s -o /dev/null -w "%{http_code}" http://${HOST}:${PORT}/providers 2>/dev/null)
    
    if [ "$response" != "200" ]; then
        echo "$(date): Servidor não respondeu (HTTP $response). Reiniciando..." >> "$LOG_FILE"
        
        # Mata processos na porta
        fuser -k ${PORT}/tcp 2>/dev/null
        
        # Aguarda 3 segundos
        sleep 3
        
        # Reinicia o servidor
        cd /srv/mk-auth-support-app-backend
        npm run dev > /dev/null 2>&1 &
        
        echo "$(date): Servidor reiniciado" >> "$LOG_FILE"
    fi
    
    # Aguarda 30 segundos antes da próxima verificação
    sleep 30
done
