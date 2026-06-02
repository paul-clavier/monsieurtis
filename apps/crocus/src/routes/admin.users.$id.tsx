import { Button } from "@monsieurtis/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@monsieurtis/ui/components/card";
import { Checkbox } from "@monsieurtis/ui/components/checkbox";
import { Label } from "@monsieurtis/ui/components/label";
import {
    getIdentity,
    grantAppAccess,
    ketoCheck,
    listClients,
    listUserApps,
    revokeAppAccess,
    whoami,
} from "@monsieurtis/ory";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";

import { hydraAdmin, ketoRead, ketoWrite, kratosAdmin, kratosPublic } from "../server/ory";
import { getCookieHeader } from "../server/request";

/**
 * Admin: grant / revoke app access for a Kratos identity.
 *
 * Gate: `crocus-admin:platform#access@user:<viewer>` — only platform admins
 * can see this page. Everyone else is bounced to /denied.
 */
const ensureAdmin = async () => {
    const session = await whoami(kratosPublic, getCookieHeader()).catch(() => null);
    if (!session) throw redirect({ to: "/login" });

    // Admin tuple: `crocus-admin:platform#access@user:<id>`. Seeded by
    // Terraform during the bootstrap apply (see infra/identity/keto.tf).
    const ok = await ketoCheck(ketoRead, {
        namespace: "crocus-admin",
        object: "platform",
        relation: "access",
        subject_id: `user:${session.identity.id}`,
    });

    if (!ok) throw redirect({ to: "/denied", search: { app: "crocus-admin" } });

    return session;
};

const loadAdminUser = createServerFn({ method: "GET" })
    .validator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
    .handler(async ({ data }) => {
        await ensureAdmin();

        const target = await getIdentity(kratosAdmin, data.id);
        const allClients = await listClients(hydraAdmin);
        const userApps = await listUserApps(ketoRead, target.id);

        return {
            user: {
                id: target.id,
                email: target.traits.email,
                first: target.traits.name?.first ?? null,
                last: target.traits.name?.last ?? null,
            },
            apps: allClients.map((c) => ({
                id: c.client_id,
                name: c.client_name ?? c.client_id,
                granted: userApps.includes(c.client_id),
            })),
        };
    });

const toggleAccess = createServerFn({ method: "POST" })
    .validator((d: unknown) =>
        z
            .object({
                user_id: z.string(),
                app_id: z.string(),
                granted: z.boolean(),
            })
            .parse(d),
    )
    .handler(async ({ data }) => {
        await ensureAdmin();

        if (data.granted) {
            await grantAppAccess(ketoWrite, data.user_id, data.app_id);
        } else {
            await revokeAppAccess(ketoWrite, data.user_id, data.app_id);
        }
        return { ok: true };
    });

export const Route = createFileRoute("/admin/users/$id")({
    loader: ({ params }) => loadAdminUser({ data: { id: params.id } }),
    component: AdminUserPage,
});

function AdminUserPage() {
    const data = Route.useLoaderData();
    const toggle = useServerFn(toggleAccess);
    const [pending, setPending] = useState<string | null>(null);
    const [apps, setApps] = useState(data.apps);

    const onToggle = async (appId: string, next: boolean) => {
        setPending(appId);
        try {
            await toggle({ data: { user_id: data.user.id, app_id: appId, granted: next } });
            setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, granted: next } : a)));
        } finally {
            setPending(null);
        }
    };

    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle>
                    {data.user.first ?? ""} {data.user.last ?? ""}
                </CardTitle>
                <CardDescription>
                    {data.user.email} · <span className="font-mono text-xs">{data.user.id}</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="divide-y divide-border/40">
                    {apps.map((a) => (
                        <div key={a.id} className="flex items-center justify-between py-2">
                            <Label htmlFor={`app-${a.id}`} className="cursor-pointer">
                                {a.name}
                            </Label>
                            <Checkbox
                                id={`app-${a.id}`}
                                checked={a.granted}
                                disabled={pending === a.id}
                                onCheckedChange={(checked) => onToggle(a.id, checked === true)}
                            />
                        </div>
                    ))}
                </div>

                {apps.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4">
                        No OAuth clients registered in Hydra yet.
                    </p>
                )}

                <Button asChild variant="ghost" className="mt-4 w-full">
                    <a href="/">Back to launcher</a>
                </Button>
            </CardContent>
        </Card>
    );
}
