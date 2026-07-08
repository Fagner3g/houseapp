# Build from monorepo root: docker build -f api/Dockerfile .
FROM node:20-alpine AS deps

WORKDIR /app/api

# Install system dependencies required for build
RUN apk add --no-cache python3 make g++

# Local workspace package (file:../packages/finance-core)
COPY packages/finance-core /app/packages/finance-core
COPY api/package.json api/yarn.lock ./

# Use Yarn to respect yarn.lock
RUN corepack enable && yarn install --frozen-lockfile

FROM deps AS build
COPY api/ ./
RUN yarn build

FROM node:20-alpine AS runtime

# Keep the same paths as deps so file:../packages/finance-core symlinks resolve
WORKDIR /app/api
ENV NODE_ENV=production
RUN corepack enable

COPY --from=build /app/api/dist ./dist
COPY --from=deps /app/api/node_modules ./node_modules
COPY --from=deps /app/packages/finance-core /app/packages/finance-core
COPY api/package.json ./package.json

## Drizzle configuration support at runtime
# drizzle.config.ts imports from src/db/setup and src/config/env (which imports logger)
COPY api/drizzle.config.ts ./
COPY api/src/config/env.ts ./src/config/env.ts
COPY api/src/db/setup.ts ./src/db/setup.ts
COPY api/src/lib/logger.ts ./src/lib/logger.ts
# Note: .migrations directory is not copied because it may not exist in the repo.
# If you use SQL migrations, ensure the folder is present in the build context
# or mount it at runtime.
COPY api/.migrations ./.migrations

EXPOSE 3333
CMD ["node", "dist/server.js"]
