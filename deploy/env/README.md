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
- **Localização na VPS:** `/opt/env/houseapp/api.env`
- **Banco:** PostgreSQL na VPS (`postgres:5432`)
- **URLs:** Domínios de produção (`api.jarvis.dev.br`, `app.jarvis.dev.br`)

### Web (`web.env`)
- **Localização na VPS:** `/opt/env/houseapp/web.env`
- **API Host:** `https://api.jarvis.dev.br`

## 💻 Desenvolvimento Local

### API (`api.env.local`)
- **Banco:** PostgreSQL local (`localhost:5432`)
- **URLs:** Localhost (`localhost:3333`, `localhost:5173`)

### Web (`web.env.local`)
- **API Host:** `http://localhost:3333`

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
# Copiar templates para a VPS
sudo mkdir -p /opt/templates/houseapp
sudo cp deploy/env/api.env /opt/templates/houseapp/api.env
sudo cp deploy/env/web.env /opt/templates/houseapp/web.env
```

## 🔐 Variáveis Sensíveis

**IMPORTANTE:** Nunca commite arquivos `.env` com dados reais!
- Use `.env.example` como template
- Configure valores reais apenas na VPS
- Para desenvolvimento local, use `api.env.local` e `web.env.local`

## 📋 Checklist de Deploy

- [ ] Criar `/opt/templates/houseapp/` na VPS
- [ ] Copiar `api.env` e `web.env` para templates
- [ ] Configurar valores reais nos templates
- [ ] Verificar se PostgreSQL está na rede `network_swarm_public`
- [ ] Fazer deploy da stack
