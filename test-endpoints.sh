#!/bin/bash

# ============================================
# Script de Teste dos Endpoints Backend
# ============================================

# Configuração
BASE_URL="http://localhost:3333"
TOKEN="SEU_TOKEN_JWT_AQUI"

echo "🧪 Testando Endpoints do Backend"
echo "=================================="
echo ""

# Teste 1: GET /provedor
echo "📍 Teste 1: GET /provedor"
echo "Obtendo dados do provedor e API Key do Google Maps..."
curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/provedor" | jq '.'
echo ""
echo "---"
echo ""

# Teste 2: GET /cto/:lat/:lng
echo "📍 Teste 2: GET /cto/:lat/:lng"
echo "Buscando CTOs próximas a uma coordenada..."
LAT="-23.5505"
LNG="-46.6333"
curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/cto/$LAT/$LNG" | jq '.'
echo ""
echo "---"
echo ""

# Teste 3: PUT /cliente/:id (com coordenadas)
echo "📍 Teste 3: PUT /cliente/:id"
echo "Atualizando coordenadas de um cliente..."
CLIENT_ID="1"
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -23.5505,
    "longitude": -46.6333,
    "observacao": "Coordenadas atualizadas via API"
  }' \
  "$BASE_URL/cliente/$CLIENT_ID" | jq '.'
echo ""
echo "---"
echo ""

# Teste 4: GET /cto/:lat/:lng (alias)
echo "📍 Teste 4: GET /cto/:lat/:lng (testando alias)"
curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/cto/-23.5505/-46.6333" | jq '.'
echo ""
echo "---"
echo ""

# Teste 5: Visualizar mapa de CTOs
echo "📍 Teste 5: Mapa visual de CTOs"
echo "Acesse no navegador: $BASE_URL/cto/map/$LAT/$LNG"
echo "(Requer autenticação JWT via query string ou sessão)"
echo ""

echo "✅ Testes concluídos!"
echo ""
echo "💡 Dicas:"
echo "  - Substitua TOKEN pelo JWT válido"
echo "  - Ajuste LAT/LNG para suas coordenadas"
echo "  - Substitua CLIENT_ID por um ID válido"
echo "  - Instale 'jq' para melhor formatação JSON"
