FROM node:20-alpine AS deps

WORKDIR /app

# Install system dependencies required for build
RUN apk add --no-cache python3 make g++

# Copy package manifests first (better caching)
COPY package.json yarn.lock ./
# Use Yarn to respect yarn.lock
RUN corepack enable && yarn install --frozen-lockfile

FROM deps AS build
COPY . ./
RUN yarn build

# Stage for running migrations


FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

# Copy only necessary files for runtime
COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./package.json

## Drizzle configuration support at runtime
# drizzle.config.ts imports from src/db/setup and src/config/env (which imports logger)
COPY drizzle.config.ts ./
COPY src/config/env.ts ./src/config/env.ts
COPY src/db/setup.ts ./src/db/setup.ts
COPY src/lib/logger.ts ./src/lib/logger.ts
# Note: .migrations directory is not copied because it may not exist in the repo.
# If you use SQL migrations, ensure the folder is present in the build context
# or mount it at runtime.
COPY .migrations ./.migrations

EXPOSE 3333
CMD ["node", "dist/server.js"]
