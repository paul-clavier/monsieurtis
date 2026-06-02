/**
 * @monsieurtis/ory
 *
 * Thin client helpers around the Ory stack (Kratos + Hydra + Keto) used by
 * consumer apps (linlin-server, harley, crocus). Two entry points:
 *
 *   - `@monsieurtis/ory`         : framework-agnostic Keto + Hydra + Kratos helpers
 *   - `@monsieurtis/ory/nest`    : NestJS guards/decorators (peer dep on @nestjs/common)
 *   - `@monsieurtis/ory/react`   : TanStack Start <RequireAccess /> wrapper
 *
 * The package is deliberately small — we wrap the bits we need, not the full
 * @ory/client SDK, so it compiles in any environment (Node, Bun, edge).
 */

export * from "./keto/check";
export * from "./keto/expand";
export * from "./keto/write";
export * from "./kratos/session";
export * from "./hydra/clients";
export * from "./types";
