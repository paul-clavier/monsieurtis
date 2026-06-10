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

/**
 * /recovery — same dual-entry pattern as /registration. See that file for
 * the full explanation.
 */
const search = z.object({ flow: z.string().optional() });

const startRecovery = createServerFn({ method: "GET" })
    .inputValidator((d: unknown) => search.parse(d))
    .handler(async ({ data }) => {
        if (data.flow) return { flow: data.flow };

        const returnTo = encodeURIComponent(
            `${process.env.PUBLIC_AUTH_ORIGIN}/`,
        );
        throw redirect({
            href: `${process.env.KRATOS_PUBLIC_URL}/self-service/recovery/browser?return_to=${returnTo}`,
        });
    });

export const Route = createFileRoute("/recovery")({
    validateSearch: search,
    loader: ({ location }) => startRecovery({ data: location.search }),
    component: RecoveryPage,
});

function RecoveryPage() {
    const data = Route.useLoaderData();

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Reset your password</CardTitle>
                <CardDescription>
                    Flow <span className="font-mono text-xs">{data.flow}</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
                Flow renderer not yet implemented. See README for the v1 status.
            </CardContent>
        </Card>
    );
}
