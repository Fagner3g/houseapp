FROM node:20-slim

# Dependências do sistema mínimas
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Habilita Yarn via Corepack
RUN corepack enable && corepack prepare yarn@stable --activate \
  && yarn config set nodeLinker node-modules

# Copia manifests para melhor cache
COPY package.json ./package.json
COPY yarn.lock ./yarn.lock

# Instala dependências (dev incluídas para compilar TS)
RUN yarn install

# Copia código e compila
COPY . ./
RUN yarn build

ENV NODE_ENV=production

# Opcional: manter deps completas; caso queira somente produção, descomente a linha abaixo
# RUN rm -rf node_modules && yarn install --production

EXPOSE 3333
CMD ["node", "dist/server.js"]
