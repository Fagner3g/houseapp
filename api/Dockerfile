FROM node:20-slim

# Instala dependencias do sistema se necessario (ex.: openssl)
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Habilita pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copia apenas manifests para cache eficiente
COPY api/package.json ./package.json
COPY api/pnpm-lock.yaml ./pnpm-lock.yaml

# Instala prod + dev para compilar TS
RUN pnpm install --frozen-lockfile

# Copia codigo e compila
COPY api/ ./
RUN pnpm build

ENV NODE_ENV=production

# Instala apenas deps de produção (opcional)
RUN pnpm prune --prod

EXPOSE 3333
CMD ["node", "src/http/server.js"]
