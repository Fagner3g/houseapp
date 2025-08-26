FROM --platform=$BUILDPLATFORM node:20-slim AS deps

WORKDIR /app

# Habilita Yarn (Berry) e usa node-modules linker dentro do container
RUN corepack enable && corepack prepare yarn@stable --activate \
  && yarn config set nodeLinker node-modules

# Instala somente a árvore de dependências (com dev) para compilar
COPY package.json yarn.lock ./
RUN yarn install

FROM deps AS build
COPY . ./
RUN yarn build

FROM --platform=$TARGETPLATFORM node:20-slim AS runtime

# Dependências mínimas de sistema
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# Copia apenas o necessário para runtime
COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./package.json

EXPOSE 3333
CMD ["node", "dist/server.js"]
