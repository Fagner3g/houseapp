FROM node:20-alpine AS deps

WORKDIR /app

# Instala dependências do sistema necessárias para build
RUN apk add --no-cache python3 make g++

# Usa Yarn 1 (Classic) para evitar restrições de workspaces no build
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# Copia manifests primeiro (cache)
COPY package.json yarn.lock ./
# Instala dependências
RUN yarn install --frozen-lockfile

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
