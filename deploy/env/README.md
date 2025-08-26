# Variáveis de Ambiente

Esta pasta contém os arquivos de configuração de ambiente para o projeto HouseApp.

## Estrutura

- `api.env.example` - Exemplo das variáveis da API (para desenvolvimento local)
- `web.env.example` - Exemplo das variáveis do Web (para desenvolvimento local)

## Configuração Local

Para desenvolvimento local, copie os arquivos de exemplo:

```bash
# Na pasta api/
cp ../deploy/env/api.env.example .env

# Na pasta web/
cp ../deploy/env/web.env.example .env
```

## Configuração de Produção

### 1. Criar Templates na VPS

Na VPS, crie os arquivos de template em `/opt/templates/houseapp/`:

```bash
# Na VPS
sudo mkdir -p /opt/templates/houseapp

# Criar template da API
sudo nano /opt/templates/houseapp/api.env

# Criar template do Web
sudo nano /opt/templates/houseapp/web.env
```

### 2. Conteúdo dos Templates

**api.env** (template):
```bash
# Backend (API) - variáveis de produção
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-super-secret-jwt-key
WEB_URL=https://app.jarvis.dev.br
NODE_ENV=production
LOG_LEVEL=info
PORT=3333
HOST=0.0.0.0
METRICS_PREFIX=app_
LOG_FASTIFY=false
LOG_SQL=false
EVOLUTION_BASE_URL=https://evo.jarvis.dev.br
EVOLUTION_INSTANCE=JARVIS
EVOLUTION_API_KEY=your-evolution-api-key
```

**web.env** (template):
```bash
# Frontend (Web) - variáveis de produção
VITE_API_HOST=https://api.jarvis.dev.br
VITE_OPENAPI_URL=https://api.jarvis.dev.br/swagger.json
KUBB_LOG_LEVEL=info
```

### 3. Deploy Automático

O CI/CD automaticamente:
- Copia os templates de `/opt/templates/houseapp/` para `/opt/env/houseapp/`
- Executa o deploy com as variáveis corretas

## Variáveis Importantes

### API (Obrigatórias)
- `DATABASE_URL` - URL do PostgreSQL
- `JWT_SECRET` - Chave secreta para JWT
- `WEB_URL` - URL do frontend

### API (Opcionais)
- `NODE_ENV` - Ambiente (development/production)
- `LOG_LEVEL` - Nível de log (debug/info/warn/error)
- `EVOLUTION_API_KEY` - Chave da API do WhatsApp

### Web (Obrigatórias)
- `VITE_API_HOST` - URL da API

### Web (Opcionais)
- `VITE_OPENAPI_URL` - URL do Swagger
- `KUBB_LOG_LEVEL` - Nível de log

## Fluxo de Deploy

1. **Templates** → `/opt/templates/houseapp/` (você cria)
2. **CI/CD** → Copia para `/opt/env/houseapp/` (automático)
3. **Docker** → Usa `/opt/env/houseapp/` (automático)

## Segurança

⚠️ **Nunca commite arquivos `.env` reais!** 
- Apenas os arquivos `.example` são versionados
- Os templates na VPS ficam apenas no servidor
- O CI/CD copia automaticamente durante o deploy

## Troubleshooting

### Erro: "Missing env templates"
- Verifique se os arquivos existem em `/opt/templates/houseapp/`
- Confirme as permissões: `sudo chmod 644 /opt/templates/houseapp/*.env`

### Erro: "Environment files have example values"
- Edite os templates em `/opt/templates/houseapp/` com valores reais
- Remova valores como `changeme-super-secret` e `USER:PASS`
