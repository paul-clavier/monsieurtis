/**
 * NestJS integration for the Ory stack.
 *
 * Apps that need per-request access checks pull in `KetoAccessGuard` and
 * decorate handlers with `@RequireAppAccess('linlin')`. The guard reads the
 * authenticated user's Kratos identity ID from `request.user.sub` (populated
 * by the upstream OIDC strategy) and queries Keto.
 *
 * On deny it issues a 302 to the canonical Crocus denied page, so SPA users
 * land back on the SSO console with a friendly message and the app launcher.
 */

export * from "./decorators/require-app-access.decorator";
export * from "./guards/keto-access.guard";
export * from "./ory.module";
