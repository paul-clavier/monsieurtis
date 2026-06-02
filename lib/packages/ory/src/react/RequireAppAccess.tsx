import { ReactNode } from "react";

import { AppId } from "../types";

export interface RequireAppAccessProps {
    appId: AppId;
    /** Already-resolved permission state (computed in the route loader). */
    allowed: boolean;
    /** Public origin of Crocus, e.g. `https://auth.monsieurtis.com`. */
    authOrigin: string;
    /** Path to bounce back to once access is granted (defaults to current URL). */
    from?: string;
    children: ReactNode;
}

/**
 * Render-time guard. The actual permission *check* must happen in the route
 * loader (server function) so it runs server-side — this component only acts
 * on the boolean result.
 *
 * If `allowed === false` we emit a `<meta http-equiv="refresh">` redirect, and
 * also throw a Response in environments that support it. The redirect is the
 * fallback for hard-rendered SSR; the throw is what TanStack Start prefers.
 *
 * @example
 *   // routes/_authed.linlin.tsx
 *   export const Route = createFileRoute("/_authed/linlin")({
 *     loader: async ({ context }) => {
 *       const allowed = await canAccessApp(context.keto, context.user.sub, "linlin");
 *       return { allowed };
 *     },
 *     component: () => {
 *       const { allowed } = Route.useLoaderData();
 *       return (
 *         <RequireAppAccess appId="linlin" allowed={allowed} authOrigin={AUTH_ORIGIN}>
 *           <LinlinShell />
 *         </RequireAppAccess>
 *       );
 *     },
 *   });
 */
export const RequireAppAccess = ({
    appId,
    allowed,
    authOrigin,
    from,
    children,
}: RequireAppAccessProps): ReactNode => {
    if (allowed) return children;

    const fromParam =
        from ??
        (typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "");
    const target = `${authOrigin}/denied?app=${encodeURIComponent(appId)}&from=${encodeURIComponent(fromParam)}`;

    // Client-side navigation (component runs in the browser after hydration).
    if (typeof window !== "undefined") {
        window.location.replace(target);
    }

    // SSR fallback — a meta refresh works even without JS.
    return (
        <html lang="en">
            <head>
                <meta httpEquiv="refresh" content={`0;url=${target}`} />
                <title>Redirecting…</title>
            </head>
            <body>Redirecting to the SSO console…</body>
        </html>
    );
};
