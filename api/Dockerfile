FROM node:20-alpine AS deps

WORKDIR /app

# Instala dependências do sistema necessárias para build
RUN apk add --no-cache python3 make g++

# Habilita Yarn (Berry) e configura node-modules linker globalmente
RUN corepack enable && corepack prepare yarn@stable --activate \
  && yarn config set -H nodeLinker node-modules

# Copia manifests primeiro (cache)
COPY package.json yarn.lock ./
# Instala dependências (usa config global do yarn)
RUN yarn install --immutable || yarn install

FROM deps AS build
COPY . ./
RUN yarn build

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Copia apenas o necessário para runtime
COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./package.json

EXPOSE 3333
CMD ["node", "dist/server.js"]
