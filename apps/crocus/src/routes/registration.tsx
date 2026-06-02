import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@monsieurtis/ui/components/card";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * /registration handles two states:
 *
 *   No `?flow=…`  → user clicked "Register"; bounce to Kratos to initialise a
 *                   browser flow. Kratos will redirect back here with `?flow=`.
 *
 *   `?flow=…`     → Kratos initialised a flow whose `ui_url` is /registration.
 *                   For v1 we render a placeholder; future polish renders the
 *                   flow's UI nodes inline using @monsieurtis/ui form components.
 */
const search = z.object({ flow: z.string().optional() });

const startRegistration = createServerFn({ method: "GET" })
    .validator((d: unknown) => search.parse(d))
    .handler(async ({ data }) => {
        if (data.flow) return { flow: data.flow }; // render the placeholder

        const returnTo = encodeURIComponent(`${process.env.PUBLIC_AUTH_ORIGIN}/`);
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
                    Flow <span className="font-mono text-xs">{data.flow}</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
                The Kratos flow renderer is not yet implemented in Crocus. For now, complete
                registration by submitting forms directly to Kratos at <code>/self-service</code>.
                See <a className="underline" href="/login">/login</a> when you&apos;re done.
            </CardContent>
        </Card>
    );
}
