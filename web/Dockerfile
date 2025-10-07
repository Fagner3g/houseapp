FROM node:20-alpine AS build
WORKDIR /app

# Dependências do sistema necessárias para build (e esbuild em alpine)
RUN apk add --no-cache python3 make g++ libc6-compat

# Use Yarn para respeitar yarn.lock e evitar mismatch do esbuild
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile

# Copiar arquivos de configuração necessários
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./

# Copiar código fonte
COPY index.html ./
COPY src ./src
COPY public ./public

# Variáveis de ambiente necessárias para o build do Vite
ARG VITE_API_HOST
ARG VITE_APP_VERSION
ENV VITE_API_HOST=$VITE_API_HOST \
    VITE_APP_VERSION=$VITE_APP_VERSION

RUN yarn build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
