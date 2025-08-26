# Variáveis de Ambiente

Esta pasta contém os arquivos de configuração de ambiente para o projeto HouseApp.

## Estrutura

- `api.env.example` - Exemplo das variáveis da API
- `web.env.example` - Exemplo das variáveis do Web
- `api.env` - Variáveis reais da API (não versionado)
- `web.env` - Variáveis reais do Web (não versionado)

## Configuração Local

Para desenvolvimento local, copie os arquivos de exemplo:

```bash
# Na pasta api/
cp ../deploy/env/api.env.example .env

# Na pasta web/
cp ../deploy/env/web.env.example .env
```

## Configuração de Produção

Na VPS, os arquivos devem estar em `/opt/env/houseapp/`:

```bash
# Na VPS
sudo mkdir -p /opt/env/houseapp
sudo cp api.env /opt/env/houseapp/
sudo cp web.env /opt/env/houseapp/
```

## Variáveis Importantes

### API
- `DATABASE_URL` - URL do PostgreSQL
- `JWT_SECRET` - Chave secreta para JWT
- `WEB_URL` - URL do frontend
- `EVOLUTION_API_KEY` - Chave da API do WhatsApp

### Web
- `VITE_API_HOST` - URL da API
- `VITE_OPENAPI_URL` - URL do Swagger

## Segurança

⚠️ **Nunca commite arquivos `.env` reais!** Apenas os arquivos `.example` são versionados.
