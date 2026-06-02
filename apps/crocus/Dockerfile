# Multi-stage build for Crocus.
#
# Build context is the monorepo root (so we can copy workspace siblings:
# @monsieurtis/ui, @monsieurtis/ory, @monsieurtis/tsconfig). Build from the
# repo root:
#
#   docker build -f apps/crocus/Dockerfile -t ghcr.io/monsieurtis/crocus:dev .

###############################################################################
# 1. Install dependencies
###############################################################################
FROM oven/bun:1.3.13-alpine AS deps
WORKDIR /repo

# Copy only the manifests first so Bun can cache the dependency layer.
COPY package.json bun.lock ./
COPY apps/crocus/package.json apps/crocus/
COPY lib/ui/package.json      lib/ui/
COPY lib/core/package.json    lib/core/
COPY lib/tsconfig/            lib/tsconfig/
COPY lib/packages/ory/package.json lib/packages/ory/

RUN bun install --frozen-lockfile

###############################################################################
# 2. Build
###############################################################################
FROM oven/bun:1.3.13-alpine AS build
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/package.json ./package.json
COPY --from=deps /repo/bun.lock     ./bun.lock

# Copy workspace sources (only what Crocus depends on).
COPY apps/crocus      apps/crocus
COPY lib/ui           lib/ui
COPY lib/core         lib/core
COPY lib/tsconfig     lib/tsconfig
COPY lib/packages/ory lib/packages/ory

WORKDIR /repo/apps/crocus
RUN bun run build

###############################################################################
# 3. Runtime
###############################################################################
FROM oven/bun:1.3.13-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# TanStack Start's Vite output places a Node entry under `.output/`. We copy
# only what's needed at runtime.
COPY --from=build /repo/apps/crocus/.output ./.output

EXPOSE 3000

# `.output/server/index.mjs` is the TanStack Start server bundle.
CMD ["bun", "run", ".output/server/index.mjs"]
