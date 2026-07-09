# Build from monorepo root: docker build -f web/Dockerfile .
FROM node:20-alpine AS build
WORKDIR /app/web

# Dependências do sistema necessárias para build (e esbuild em alpine)
RUN apk add --no-cache python3 make g++ libc6-compat

# Local workspace package (file:../packages/finance-core)
COPY packages/finance-core /app/packages/finance-core
COPY web/package.json web/yarn.lock ./

# Use Yarn para respeitar yarn.lock e evitar mismatch do esbuild.
# finance-core is consumed from source under /app/packages; Yarn only installs its
# deps into web/node_modules here, so link dayjs where Node/Vite resolve from.
RUN corepack enable && yarn install --frozen-lockfile \
  && mkdir -p /app/packages/finance-core/node_modules \
  && ln -sfn "$(node -e "console.log(require('path').dirname(require.resolve('dayjs/package.json')))")" \
    /app/packages/finance-core/node_modules/dayjs

# Copiar arquivos de configuração necessários
COPY web/tsconfig*.json ./
COPY web/vite.config.ts ./
COPY web/tailwind.config.ts ./

# Copiar código fonte
COPY web/index.html ./
COPY web/src ./src
COPY web/public ./public

# Vite alias and version fallback read the monorepo root package.json
COPY package.json /app/package.json

# Variáveis de ambiente necessárias para o build do Vite
ARG VITE_API_HOST
ARG VITE_APP_VERSION
ENV VITE_API_HOST=$VITE_API_HOST \
    VITE_APP_VERSION=$VITE_APP_VERSION

RUN yarn build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/web/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
