import { getRegistrationFlow } from "@monsieurtis/ory";
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

import { FlowForm } from "../components/flow-form";
import { kratosPublic } from "../server/ory";
import { getCookieHeader } from "../server/request";

/**
 * /registration handles two states:
 *
 *   No `?flow=…`  → user clicked "Register"; bounce to Kratos to initialise a
 *                   browser flow. Kratos will redirect back here with `?flow=`.
 *
 *   `?flow=…`     → Kratos initialised a flow whose `ui_url` is /registration.
 *                   Fetch it (forwarding the CSRF cookie) and render
 *                   `flow.ui.nodes` — traits, password, Google OIDC.
 */
const search = z.object({ flow: z.string().optional() });

const startRegistration = createServerFn({ method: "GET" })
    .inputValidator((d: unknown) => search.parse(d))
    .handler(async ({ data }) => {
        if (data.flow) {
            const flow = await getRegistrationFlow(
                kratosPublic,
                data.flow,
                getCookieHeader(),
            );
            if (flow) return { flow };
            // Expired/foreign flow → fall through and start a fresh one.
        }

        const returnTo = encodeURIComponent(
            `${process.env.PUBLIC_AUTH_ORIGIN}/`,
        );
        throw redirect({
            href: `${process.env.KRATOS_PUBLIC_URL}/self-service/registration/browser?return_to=${returnTo}`,
        });
    });

export const Route = createFileRoute("/registration")({
    validateSearch: search,
    loader: ({ location }) => startRegistration({ data: location.search }),
    component: RegistrationPage,
});

function RegistrationPage() {
    const data = Route.useLoaderData();

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Create your MonsieurTis account</CardTitle>
                <CardDescription>
                    Register with a password or continue with Google.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <FlowForm flow={data.flow} />
                <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <a className="underline" href="/login">
                        Sign in
                    </a>
                </p>
            </CardContent>
        </Card>
    );
}
