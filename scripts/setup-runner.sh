#!/bin/bash

# Script para configurar GitHub Actions Runner ARM64
# Execute como: sudo bash scripts/setup-runner.sh

set -e

echo "🚀 Configurando GitHub Actions Runner ARM64..."

# Verificar arquitetura
ARCH=$(uname -m)
if [ "$ARCH" != "aarch64" ]; then
    echo "❌ Esta VPS não é ARM64 (aarch64). Arquitetura atual: $ARCH"
    exit 1
fi

echo "✅ VPS ARM64 detectada: $ARCH"

# Criar usuário se não existir
if ! id "github-runner" &>/dev/null; then
    echo "👤 Criando usuário github-runner..."
    sudo adduser --disabled-password --gecos "" github-runner
    sudo usermod -aG docker github-runner
    sudo usermod -aG sudo github-runner
else
    echo "✅ Usuário github-runner já existe"
fi

# Configurar diretório
RUNNER_DIR="/home/github-runner/actions-runner"
sudo mkdir -p $RUNNER_DIR
sudo chown github-runner:github-runner $RUNNER_DIR

# Baixar runner
echo "📥 Baixando GitHub Actions Runner ARM64..."
cd $RUNNER_DIR
sudo -u github-runner curl -o actions-runner-linux-arm64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-arm64-2.311.0.tar.gz

# Extrair
echo "📦 Extraindo runner..."
sudo -u github-runner tar xzf ./actions-runner-linux-arm64-2.311.0.tar.gz

# Configurar permissões
sudo chown -R github-runner:github-runner $RUNNER_DIR

echo "✅ Runner baixado e extraído!"
echo ""
echo "📋 Próximos passos:"
echo "1. Vá para: https://github.com/Fagner3g/houseapp/settings/actions/runners"
echo "2. Clique em 'New self-hosted runner'"
echo "3. Selecione 'Linux' e 'ARM64'"
echo "4. Copie o token de configuração"
echo "5. Execute:"
echo "   sudo -u github-runner $RUNNER_DIR/config.sh --url https://github.com/Fagner3g/houseapp --token YOUR_TOKEN --labels 'self-hosted,linux,ARM64'"
echo "6. Instale como serviço:"
echo "   sudo $RUNNER_DIR/svc.sh install github-runner"
echo "   sudo $RUNNER_DIR/svc.sh start"
echo ""
echo "🎯 O runner estará disponível para builds ARM64 nativos!"
