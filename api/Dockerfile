FROM node:20-alpine AS deps

WORKDIR /app

# Install system dependencies required for build
RUN apk add --no-cache python3 make g++

# Copy package manifest first (for better caching)
COPY package.json ./
# Install dependencies with npm
RUN npm install

FROM deps AS build
COPY . ./
RUN npm run build

# Stage for running migrations
FROM deps AS migrate
COPY . ./
# Run migrations (will fail if can't connect to database, which is expected during build)
RUN npm run db:migrate || echo "Migrations will be run at runtime"

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Copy only necessary files for runtime
COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./package.json

# Copy Drizzle configuration and migrations
COPY drizzle.config.ts ./
COPY src/config/env.ts ./src/config/env.ts
COPY .migrations ./.migrations

# Copy startup script
COPY start.js ./start.js
RUN chmod +x ./start.js

EXPOSE 3333
CMD ["node", "start.js"]
