import { getLogoutUrl } from "@monsieurtis/ory";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { kratosPublic } from "../server/ory";
import { getCookieHeader } from "../server/request";

/**
 * /logout — resolve the one-shot Kratos logout URL for the current session
 * and bounce the browser through it. Kratos then redirects to the configured
 * default return URL (`/`), which — with the session gone — lands on /login.
 * With no active session there is nothing to do; go straight to /login.
 */
const handleLogout = createServerFn({ method: "GET" }).handler(async () => {
    const logoutUrl = await getLogoutUrl(kratosPublic, getCookieHeader()).catch(
        () => null,
    );

    if (logoutUrl) throw redirect({ href: logoutUrl });
    throw redirect({ to: "/login", search: {} });
});

export const Route = createFileRoute("/logout")({
    loader: () => handleLogout(),
});
