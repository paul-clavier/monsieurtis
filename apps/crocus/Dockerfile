# syntax=docker/dockerfile:1.10-labs

# Multi-stage build for Crocus.
#
# Build context is the monorepo root (so we can copy workspace siblings:
# @monsieurtis/ui, @monsieurtis/ory, @monsieurtis/tsconfig). Build from the
# repo root:
#
#   docker build -f apps/crocus/Dockerfile -t ghcr.io/paul-clavier/crocus:dev .

###############################################################################
# 1. Install dependencies
###############################################################################
FROM oven/bun:1.3.13-alpine AS deps
WORKDIR /repo

COPY package.json bun.lock ./
COPY --parents **/package.json ./

RUN bun install --frozen-lockfile --filter crocus

###############################################################################
# 2. Build
###############################################################################
FROM deps AS build

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

COPY --from=build /repo/apps/crocus/.output ./.output

EXPOSE 3000

CMD ["bun", "run", ".output/server/index.mjs"]
