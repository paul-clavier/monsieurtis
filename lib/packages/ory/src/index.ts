/**
 * @monsieurtis/ory
 *
 * Thin client helpers around the Ory stack (Kratos + Hydra + Keto) used by
 * consumer apps (linlin-server, harley, crocus). Framework-agnostic — the
 * framework bindings live in sibling packages:
 *
 *   - `@monsieurtis/ory-nest`  : NestJS guards/decorators
 *   - `@monsieurtis/ory-react` : React <RequireAppAccess /> wrapper
 *
 * The package is deliberately small — we wrap the bits we need, not the full
 * @ory/client SDK, so it compiles in any environment (Node, Bun, edge).
 */

export * from "./hydra/clients";
export * from "./keto/check";
export * from "./keto/expand";
export * from "./keto/write";
export * from "./kratos/flows";
export * from "./kratos/session";
export * from "./types";
