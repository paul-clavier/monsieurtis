import { KratosIdentity, KratosSession } from "../types";

/**
 * Kratos session helpers. Two flavours:
 *
 *   - `whoami()` — call Kratos public API with the user's cookies; returns the
 *     active session or null.
 *   - `getIdentity()` — admin API, lookup by ID. Used by Crocus during consent
 *     to read fresh traits without trusting the browser.
 */
export interface KratosPublicClient {
    publicUrl: string;
    fetch?: typeof fetch;
}

export interface KratosAdminClient {
    adminUrl: string;
    fetch?: typeof fetch;
}

export const whoami = async (
    client: KratosPublicClient,
    cookieHeader: string,
): Promise<KratosSession | null> => {
    const f = client.fetch ?? fetch;
    const res = await f(`${client.publicUrl}/sessions/whoami`, {
        method: "GET",
        headers: { Cookie: cookieHeader, Accept: "application/json" },
        credentials: "include",
    });

    if (res.status === 401 || res.status === 403) return null;
    if (!res.ok) {
        throw new Error(`Kratos whoami failed (${res.status})`);
    }
    return (await res.json()) as KratosSession;
};

export const getIdentity = async (
    client: KratosAdminClient,
    identityId: string,
): Promise<KratosIdentity> => {
    const f = client.fetch ?? fetch;
    const res = await f(`${client.adminUrl}/admin/identities/${identityId}`, {
        method: "GET",
        headers: { Accept: "application/json" },
    });

    if (!res.ok) {
        throw new Error(`Kratos getIdentity failed (${res.status})`);
    }
    return (await res.json()) as KratosIdentity;
};
