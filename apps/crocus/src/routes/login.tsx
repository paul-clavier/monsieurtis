import { acceptLoginRequest, getLoginRequest, whoami } from "@monsieurtis/ory";
import { Button } from "@monsieurtis/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@monsieurtis/ui/components/card";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { hydraAdmin, kratosPublic } from "../server/ory";
import { getCookieHeader } from "../server/request";

/**
 * /login — the Hydra → Kratos bridge.
 *
 * Two entry points:
 *  1. From Hydra (OAuth flow): `?login_challenge=...`.
 *     - If user already has a Kratos session, accept the login at Hydra and
 *       redirect back to the relying party.
 *     - Otherwise, bounce to Kratos to start a browser login flow; Kratos
 *       returns the user here on completion with the same login_challenge.
 *
 *  2. From a direct visit (no challenge): just bounce to Kratos for an SSO-
 *     style login that lands back on `/`.
 */
const loginSearch = z.object({
    login_challenge: z.string().optional(),
    flow: z.string().optional(),
});

/**
 * A. ?login_challenge=… from Hydra + existing Kratos session → acceptLoginRequest(hydra), redirect back to the relying party.
 * B. ?login_challenge=… + no session → bounce to Kratos /self-service/login/browser with return_to looping back to this same URL.
 * C. No challenge, no session → SSO-style bounce to Kratos that lands on /.
 */
const handleLogin = createServerFn({ method: "GET" })
    .validator((d: unknown) => loginSearch.parse(d))
    .handler(async ({ data }) => {
        const cookieHeader = getCookieHeader();
        const session = await whoami(kratosPublic, cookieHeader).catch(
            () => null,
        );

        // Case A: Kratos initialised a login flow whose `ui_url` is /login —
        // render the form. (For v1 we just acknowledge it; future polish
        // renders flow.ui.nodes inline.)
        if (data.flow) return { mode: "render-flow" as const, flow: data.flow };

        // Case B: Hydra is asking for a login on behalf of an OAuth client.
        if (data.login_challenge) {
            if (session) {
                const accept = await acceptLoginRequest(
                    hydraAdmin,
                    data.login_challenge,
                    {
                        subject: session.identity.id,
                        remember: true,
                        remember_for: 3600,
                    },
                );
                throw redirect({ href: accept.redirect_to });
            }

            // Sanity-check the challenge before sending the user off.
            await getLoginRequest(hydraAdmin, data.login_challenge);

            const returnTo = encodeURIComponent(
                `${process.env.PUBLIC_AUTH_ORIGIN}/login?login_challenge=${data.login_challenge}`,
            );
            throw redirect({
                href: `${process.env.KRATOS_PUBLIC_URL}/self-service/login/browser?return_to=${returnTo}`,
            });
        }

        // Case C: no challenge and no flow — pure landing on /login.
        if (session) throw redirect({ to: "/" });

        const returnTo = encodeURIComponent(
            `${process.env.PUBLIC_AUTH_ORIGIN}/`,
        );
        throw redirect({
            href: `${process.env.KRATOS_PUBLIC_URL}/self-service/login/browser?return_to=${returnTo}`,
        });
    });

export const Route = createFileRoute("/login")({
    validateSearch: loginSearch,
    loader: ({ location }) => handleLogin({ data: location.search }),
    component: LoginPage,
});

function LoginPage() {
    const data = Route.useLoaderData();

    // Hit only when Kratos returned us with a `flow=...` to render. For v1 we
    // show a placeholder; future polish renders `flow.ui.nodes` inline using
    // `@monsieurtis/ui` form components (password input + "Continue with Google").
    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Sign in to MonsieurTis</CardTitle>
                <CardDescription>
                    Flow <span className="font-mono text-xs">{data.flow}</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild variant="outline" className="w-full">
                    <a href="/login">Restart login</a>
                </Button>
            </CardContent>
        </Card>
    );
}
