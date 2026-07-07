# Configuração de Ambiente - HouseApp

Este diretório contém os arquivos de ambiente para diferentes ambientes do projeto.

## 📁 Estrutura de Arquivos

```
deploy/env/
├── api.env              # PRODUÇÃO (VPS) - API
├── api.env.local        # DESENVOLVIMENTO LOCAL - API
├── web.env              # PRODUÇÃO (VPS) - Web
├── web.env.local        # DESENVOLVIMENTO LOCAL - Web
├── api.env.example      # Exemplo para API
├── web.env.example      # Exemplo para Web
└── README.md           # Este arquivo
```

## 🚀 Produção (VPS)

### API (`api.env`)
- **Localização na VPS:** `/opt/stacks/houseapp/api.env`
- **Banco:** PostgreSQL na VPS (`postgres:5432`)
- **URLs:** Domínios de produção (`api.jarvis.dev.br`, `app.jarvis.dev.br`)

### Web (`web.env`)
- **Localização na VPS:** `/opt/stacks/houseapp/web.env`
- **API Host:** `https://api.jarvis.dev.br`

## 💻 Desenvolvimento Local

### API (`api.env.local`)
- **Banco:** PostgreSQL local (`localhost:5432`)
- **URLs:** Localhost (`localhost:3333`, `localhost:5173`)

### Web (`web.env.local`)
- **API Host:** `http://localhost:3333`

## 🗄️ Configuração do Banco de Dados

### Variáveis Individuais (Recomendado)
```bash
# Database Connection
DB_HOST=postgres          # Host do PostgreSQL
DB_PORT=5432             # Porta do PostgreSQL
DB_USER=postgres         # Usuário do banco
DB_PASSWORD=sua_senha    # Senha do banco
DB_NAME=houseapp_v2      # Nome do banco (v2 — schema incompatível com houseapp legado)
```

### URL Completa (Legacy)
```bash
# Legacy Database URL (opcional - para compatibilidade)
DATABASE_URL=postgresql://postgres:senha@host:5432/houseapp_v2
```

**Nota:** O sistema prioriza as variáveis individuais. Se `DATABASE_URL` estiver definida, ela será usada para compatibilidade.

## 🔧 Como Usar

### Para Desenvolvimento Local:
```bash
# API
cp deploy/env/api.env.local api/.env

# Web (se necessário)
cp deploy/env/web.env.local web/.env
```

### Para Produção (VPS):
```bash
# Criar estrutura na VPS
sudo mkdir -p /opt/stacks/houseapp

# Copiar arquivos de ambiente
sudo cp deploy/env/api.env /opt/stacks/houseapp/api.env
sudo cp deploy/env/web.env /opt/stacks/houseapp/web.env
```

## 🔐 Variáveis Sensíveis

**IMPORTANTE:** Nunca commite arquivos `.env` com dados reais!
- Use `.env.example` como template
- Configure valores reais apenas na VPS
- Para desenvolvimento local, use `api.env.local` e `web.env.local`

## 📋 Checklist de Deploy

- [ ] Criar `/opt/stacks/houseapp/` na VPS
- [ ] Copiar `api.env` e `web.env` para a pasta
- [ ] Configurar valores reais nos arquivos
- [ ] Verificar se PostgreSQL está na rede `network_swarm_public`
- [ ] Fazer deploy da stack
