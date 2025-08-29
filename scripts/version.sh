#!/bin/bash

# Script para atualizar versão do projeto
# Uso: ./scripts/version.sh [patch|minor|major|1.0.1]

set -e

if [ $# -eq 0 ]; then
    echo "❌ Uso: $0 [patch|minor|major|1.0.1]"
    echo ""
    echo "Exemplos:"
    echo "  $0 patch    # 1.0.0 -> 1.0.1"
    echo "  $0 minor    # 1.0.0 -> 1.1.0"
    echo "  $0 major    # 1.0.0 -> 2.0.0"
    echo "  $0 1.0.1    # Define versão específica"
    exit 1
fi

NEW_VERSION=""
CURRENT_VERSION=$(node -p "require('./api/package.json').version")

if [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    # Versão específica fornecida
    NEW_VERSION="$1"
else
    # Calcular nova versão baseada no tipo
    case "$1" in
        "patch")
            NEW_VERSION=$(node -e "
                const version = '$CURRENT_VERSION'.split('.');
                version[2] = parseInt(version[2]) + 1;
                console.log(version.join('.'));
            ")
            ;;
        "minor")
            NEW_VERSION=$(node -e "
                const version = '$CURRENT_VERSION'.split('.');
                version[1] = parseInt(version[1]) + 1;
                version[2] = 0;
                console.log(version.join('.'));
            ")
            ;;
        "major")
            NEW_VERSION=$(node -e "
                const version = '$CURRENT_VERSION'.split('.');
                version[0] = parseInt(version[0]) + 1;
                version[1] = 0;
                version[2] = 0;
                console.log(version.join('.'));
            ")
            ;;
        *)
            echo "❌ Tipo inválido: $1"
            echo "Use: patch, minor, major ou versão específica (ex: 1.0.1)"
            exit 1
            ;;
    esac
fi

echo "🔄 Atualizando versão: $CURRENT_VERSION -> $NEW_VERSION"

# Atualizar api/package.json
npm version "$NEW_VERSION" --prefix api --no-git-tag-version

echo "✅ Versão atualizada para $NEW_VERSION"
echo ""
echo "📋 Próximos passos:"
echo "1. git add api/package.json"
echo "2. git commit -m 'chore: bump version to $NEW_VERSION'"
echo "3. git push origin develop"
echo ""
echo "🚀 O próximo deploy usará a versão $NEW_VERSION"
