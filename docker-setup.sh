#!/bin/bash

# MK-Edge Backend - Docker Setup Script
# Facilita a configuração inicial do ambiente Docker

set -e

echo "🚀 MK-Edge Backend - Docker Setup"
echo "=================================="
echo ""

# Verifica se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado!"
    echo "   Instale em: https://docs.docker.com/get-docker/"
    exit 1
fi

# Verifica se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não está instalado!"
    echo "   Instale em: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker instalado"
echo "✅ Docker Compose instalado"
echo ""

# Verifica se .env existe
if [ ! -f .env ]; then
    echo "⚠️  Arquivo .env não encontrado!"
    echo "   Criando a partir do .env.example..."
    
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Arquivo .env criado"
        echo ""
        echo "⚠️  IMPORTANTE: Edite o arquivo .env com suas credenciais!"
        echo "   - MONGODB_PASSWORD"
        echo "   - JWT_SECRET"
        echo "   - EFI_CLIENT_ID e EFI_CLIENT_SECRET"
        echo "   - ZAPI_TOKEN"
        echo ""
        read -p "Pressione ENTER depois de configurar o .env..."
    else
        echo "❌ .env.example não encontrado!"
        exit 1
    fi
else
    echo "✅ Arquivo .env encontrado"
fi

# Verifica certificado EFI
echo ""
echo "Verificando certificado EFI..."
if [ ! -d cert ]; then
    mkdir -p cert
    echo "✅ Pasta cert/ criada"
fi

if [ ! -f cert/producao.p12 ]; then
    echo "⚠️  Certificado EFI não encontrado em cert/producao.p12"
    echo "   Coloque seu certificado .p12 da EFI na pasta cert/"
    read -p "Pressione ENTER para continuar mesmo assim..."
else
    echo "✅ Certificado EFI encontrado"
fi

# Cria pasta de logs
echo ""
if [ ! -d logs ]; then
    mkdir -p logs
    echo "✅ Pasta logs/ criada"
fi

# Pergunta se deseja fazer build
echo ""
read -p "Deseja fazer o build das imagens? (s/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🔨 Fazendo build..."
    docker-compose build --no-cache
    echo "✅ Build concluído"
fi

# Inicia os containers
echo ""
echo "🚀 Iniciando containers..."
docker-compose up -d

# Aguarda um pouco
echo ""
echo "⏳ Aguardando containers iniciarem..."
sleep 5

# Mostra status
echo ""
echo "📊 Status dos containers:"
docker-compose ps

# Mostra logs
echo ""
echo "📝 Logs da API (Ctrl+C para sair):"
echo ""
docker-compose logs -f api
