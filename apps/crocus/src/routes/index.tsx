import { listUserApps, whoami } from "@monsieurtis/ory";
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

import { ketoRead, kratosPublic } from "../server/ory";
import { getCookieHeader } from "../server/request";

/**
 * Post-login landing. Lists the apps the user can use. Each tile is a
 * direct link to the app — clicking it kicks off a fresh OAuth flow at the
 * app's side, which loops back through Hydra → Crocus consent.
 */
const loadLauncher = createServerFn({ method: "GET" }).handler(async () => {
    const cookieHeader = getCookieHeader();
    const session = await whoami(kratosPublic, cookieHeader).catch(() => null);

    if (!session) {
        throw redirect({ to: "/login" });
    }

    const apps = await listUserApps(ketoRead, session.identity.id).catch(
        () => [],
    );

    return {
        email: session.identity.traits.email,
        firstName: session.identity.traits.name?.first ?? null,
        apps,
    };
});

export const Route = createFileRoute("/")({
    loader: () => loadLauncher(),
    component: Launcher,
});

function Launcher() {
    const data = Route.useLoaderData();

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>
                    Welcome{data.firstName ? `, ${data.firstName}` : ""}
                </CardTitle>
                <CardDescription>{data.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {data.apps.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Your account doesn&apos;t have access to any apps yet.
                        Ask an administrator.
                    </p>
                ) : (
                    data.apps.map((a) => (
                        <Button
                            asChild
                            key={a}
                            variant="outline"
                            className="w-full justify-start"
                        >
                            <a href={`https://${a}.monsieurtis.com`}>{a}</a>
                        </Button>
                    ))
                )}
                <Button asChild variant="ghost" className="w-full">
                    <a href="/logout">Sign out</a>
                </Button>
            </CardContent>
        </Card>
    );
}
