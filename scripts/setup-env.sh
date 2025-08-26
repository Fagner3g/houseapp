#!/bin/bash

# Script para configurar variáveis de ambiente localmente

echo "🚀 Configurando variáveis de ambiente..."

# Verifica se os arquivos de exemplo existem
if [ ! -f "deploy/env/api.env.example" ]; then
    echo "❌ Arquivo deploy/env/api.env.example não encontrado!"
    exit 1
fi

if [ ! -f "deploy/env/web.env.example" ]; then
    echo "❌ Arquivo deploy/env/web.env.example não encontrado!"
    exit 1
fi

# Copia arquivos de exemplo para as pastas
echo "📁 Copiando arquivos de exemplo..."

if [ -d "api" ]; then
    cp deploy/env/api.env.example api/.env
    echo "✅ api/.env criado"
else
    echo "⚠️  Pasta api/ não encontrada"
fi

if [ -d "web" ]; then
    cp deploy/env/web.env.example web/.env
    echo "✅ web/.env criado"
else
    echo "⚠️  Pasta web/ não encontrada"
fi

echo ""
echo "🎉 Configuração concluída!"
echo ""
echo "📝 Próximos passos:"
echo "1. Edite os arquivos .env nas pastas api/ e web/"
echo "2. Configure as variáveis com seus valores reais"
echo "3. Nunca commite os arquivos .env (eles já estão no .gitignore)"
echo ""
echo "🔧 Para produção, copie os arquivos para /opt/env/houseapp/ na VPS"
