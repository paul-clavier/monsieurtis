/**
 * React / TanStack Start integration.
 *
 * Apps wrap their root layout (or specific routes) with `<RequireAppAccess>`.
 * The component runs a server function that calls Keto; on deny it issues a
 * redirect to the canonical Crocus denied page.
 *
 * The check is server-side only — never trust the client to enforce auth.
 */

export * from "./RequireAppAccess";
