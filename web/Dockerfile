FROM node:20-slim AS build
WORKDIR /app
# Usa npm por padrao
COPY web/package.json ./package.json
RUN npm install --omit=dev=false
COPY web/ ./
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
