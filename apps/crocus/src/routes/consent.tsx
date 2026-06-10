import { Button } from "@monsieurtis/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@monsieurtis/ui/components/card";
import {
    acceptConsentRequest,
    canAccessApp,
    getConsentRequest,
    getIdentity,
} from "@monsieurtis/ory";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { hydraAdmin, ketoRead, kratosAdmin } from "../server/ory";

/**
 * Hydra calls /consent?consent_challenge=... after the login step.
 *
 * The handler does, server-side:
 *   1. fetch the consent request from Hydra
 *   2. fetch the user's fresh identity (traits) from Kratos admin
 *   3. ask Keto: "can user:<id> access app:<client_id>?"
 *   4a. if denied → redirect to /denied?app=<id> (the user lands on Crocus,
 *       NOT on the calling app's error page)
 *   4b. if allowed → render the consent screen, where the user can accept
 *       the requested scopes
 */
const consentSearch = z.object({
    consent_challenge: z.string().min(1),
});

// Identity lookup goes through kratosAdmin keyed by consent.subject — NOT
// whoami(kratosPublic, cookie). The cookie identifies whoever is on the
// browser right now; consent.subject is the user Hydra committed to during
// the preceding login step. They can diverge (second-tab signout between
// login and consent, expired Kratos session, hijacked challenge URL) and
// when they do Hydra is the source of truth — the id_token we mint here
// must reflect *that* identity's traits, not the browser's.
const loadConsent = createServerFn({ method: "GET" })
    .inputValidator((d: unknown) => consentSearch.parse(d))
    .handler(async ({ data }) => {
        const consent = await getConsentRequest(hydraAdmin, data.consent_challenge);
        const identity = await getIdentity(kratosAdmin, consent.subject);

        const allowed = await canAccessApp(ketoRead, identity.id, consent.client.client_id);

        return {
            allowed,
            appId: consent.client.client_id,
            appName: consent.client.client_name ?? consent.client.client_id,
            requested_scope: consent.requested_scope,
            email: identity.traits.email,
            consent_challenge: data.consent_challenge,
            // Skip the consent prompt entirely if the user has consented before
            // for this client (Hydra remembers).
            skip: consent.skip,
        };
    });

const acceptConsent = createServerFn({ method: "POST" })
    .inputValidator((d: unknown) =>
        z
            .object({
                consent_challenge: z.string(),
                granted_scope: z.array(z.string()),
            })
            .parse(d),
    )
    .handler(async ({ data }) => {
        const consent = await getConsentRequest(hydraAdmin, data.consent_challenge);
        const identity = await getIdentity(kratosAdmin, consent.subject);

        // Defense in depth: re-check Keto right before issuing the token.
        const allowed = await canAccessApp(ketoRead, identity.id, consent.client.client_id);
        if (!allowed) {
            throw redirect({
                to: "/denied",
                search: { app: consent.client.client_id },
            });
        }

        const result = await acceptConsentRequest(hydraAdmin, data.consent_challenge, {
            grant_scope: data.granted_scope,
            grant_access_token_audience: [],
            session: {
                id_token: {
                    email: identity.traits.email,
                    name: identity.traits.name,
                },
            },
            remember: true,
            remember_for: 86_400,
        });

        // Hydra hands us the URL to send the browser to (back to the OAuth client).
        throw redirect({ href: result.redirect_to });
    });

export const Route = createFileRoute("/consent")({
    validateSearch: consentSearch,
    loader: async ({ location }) => {
        const data = await loadConsent({ data: location.search });

        if (!data.allowed) {
            throw redirect({
                to: "/denied",
                search: { app: data.appId },
            });
        }

        // User has access — if Hydra says skip, auto-accept the scopes Hydra
        // already approved.
        if (data.skip) {
            await acceptConsent({
                data: {
                    consent_challenge: data.consent_challenge,
                    granted_scope: data.requested_scope,
                },
            });
        }

        return data;
    },
    component: ConsentPage,
});

function ConsentPage() {
    const data = Route.useLoaderData();
    const navigate = useNavigate();

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Sign in to {data.appName}</CardTitle>
                <CardDescription>
                    {data.email} — review the access this app is requesting.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                    <p className="text-sm font-medium mb-1">Requested permissions</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        {data.requested_scope.map((s) => (
                            <li key={s} className="font-mono">
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex gap-2 justify-end">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            navigate({ to: "/denied", search: { app: data.appId } });
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={async () => {
                            await acceptConsent({
                                data: {
                                    consent_challenge: data.consent_challenge,
                                    granted_scope: data.requested_scope,
                                },
                            });
                        }}
                    >
                        Allow
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
