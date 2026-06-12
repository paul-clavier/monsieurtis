import { listUserApps, whoami } from "@monsieurtis/ory";
import { Button } from "@monsieurtis/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@monsieurtis/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ShieldOff } from "lucide-react";
import { z } from "zod";

import { ketoRead, kratosPublic } from "../server/ory";
import { getCookieHeader } from "../server/request";

/**
 * The canonical "you don't have access to <app>" page.
 *
 * Entry points:
 *   - Consent handler: `redirect('/denied?app=linlin')` when Keto says no.
 *   - Receiving app guard: `302 https://auth.<domain>/denied?app=linlin&from=...`
 *     (NestJS KetoAccessGuard, TanStack <RequireAppAccess />).
 *
 * Shows the user what apps they *can* access — a friendly fallback that
 * keeps them inside the SSO instead of dumping them on an error page.
 */
const deniedSearch = z.object({
    app: z.string().min(1),
    from: z.string().optional(),
});

const loadDenied = createServerFn({ method: "GET" }).handler(async () => {
    // Kratos session cookie lives on auth.<domain>; we're served from the same
    // origin so the browser always sends it along.
    const cookieHeader = getCookieHeader();

    const session = await whoami(kratosPublic, cookieHeader).catch(() => null);
    if (!session) return { availableApps: [] as string[] };

    const apps = await listUserApps(ketoRead, session.identity.id).catch(
        () => [],
    );
    return { availableApps: apps };
});

export const Route = createFileRoute("/denied")({
    validateSearch: deniedSearch,
    loader: async () => loadDenied(),
    component: DeniedPage,
});

function DeniedPage() {
    const { app } = Route.useSearch();
    const { availableApps } = Route.useLoaderData();

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <ShieldOff className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <CardTitle>No access to {app}</CardTitle>
                <CardDescription>
                    Your MonsieurTis account doesn&apos;t have permission to use
                    this app. Ask an administrator if you need access.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {availableApps.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Apps you can use</p>
                        <div className="flex flex-col gap-2">
                            {availableApps.map((a) => (
                                <Button
                                    asChild
                                    key={a}
                                    variant="outline"
                                    className="justify-start"
                                >
                                    <a
                                        href={`https://${a}.monsieurtis.com`}
                                        target="_top"
                                    >
                                        {a}
                                    </a>
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                <Button asChild variant="ghost" className="w-full">
                    <Link to="/">Back to launcher</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full">
                    <a href="/logout">Sign out</a>
                </Button>
            </CardContent>
        </Card>
    );
}
