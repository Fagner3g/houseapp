FROM node:20-alpine
RUN apk add --no-cache docker-cli
WORKDIR /app
COPY docker.mjs proxy.mjs waiting.mjs server.mjs ./
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.mjs"]
