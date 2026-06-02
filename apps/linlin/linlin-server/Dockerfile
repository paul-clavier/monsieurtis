# syntax=docker/dockerfile:1.10-labs

# ============================================================
# Stage 1: install only linlin-server's transitive deps
# ============================================================
FROM oven/bun:1.3.13 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY --parents **/package.json ./
RUN bun install --frozen-lockfile --filter linlin-server

# ============================================================
# Stage 2: add source for the workspaces linlin-server uses
# ============================================================
FROM deps AS source
COPY lib/tsconfig ./lib/tsconfig
COPY lib/core ./lib/core
COPY lib/packages/nest-rest-crud ./lib/packages/nest-rest-crud
COPY lib/packages/prisma ./lib/packages/prisma
COPY apps/linlin/interfaces ./apps/linlin/interfaces
COPY apps/linlin/linlin-server ./apps/linlin/linlin-server
RUN cd apps/linlin/linlin-server && bun --bun run prisma generate

# ============================================================
# Stage 3: dev — hot-reload via `nest start --watch`
# ============================================================
FROM source AS dev
WORKDIR /app/apps/linlin/linlin-server
EXPOSE 8000
CMD ["bun", "run", "start:dev"]

# ============================================================
# Stage 4: build the production bundle
# ============================================================
FROM source AS build
RUN cd apps/linlin/linlin-server && bun run build

# ============================================================
# Stage 5: slim production runtime
# ============================================================
FROM oven/bun:1.3.13-slim AS prod
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/linlin/linlin-server/node_modules ./apps/linlin/linlin-server/node_modules
COPY --from=build /app/apps/linlin/linlin-server/dist ./apps/linlin/linlin-server/dist
COPY --from=build /app/apps/linlin/linlin-server/package.json ./apps/linlin/linlin-server/
COPY --from=build /app/apps/linlin/linlin-server/src/infrastructure/prisma/generated ./apps/linlin/linlin-server/src/infrastructure/prisma/generated
WORKDIR /app/apps/linlin/linlin-server
EXPOSE 8000
CMD ["bun", "run", "start:prod"]
