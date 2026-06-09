import { KratosIdentity, KratosSession } from "../types";

/**
 * Kratos session helpers. Two flavours — pick based on *what you're asking*.
 *
 * `whoami(public, cookieHeader)` — "who is on this browser?"
 *   - Endpoint:  GET {publicUrl}/sessions/whoami        (public API, internet-exposed)
 *   - Input:     the user's session cookie, forwarded from the inbound request
 *   - Output:    the active KratosSession, or null on 401/403
 *   - Identity:  the snapshot Kratos stamped into the session at login time —
 *                may be stale if traits changed since.
 *   - Failure modes: cookie missing / expired / revoked → null. Cannot answer
 *                    about anyone other than the cookie's owner.
 *   - Use when:  the caller is acting *as* the user, on their own behalf.
 *
 * `getIdentity(admin, identityId)` — "what are the canonical traits of user X?"
 *   - Endpoint:  GET {adminUrl}/admin/identities/{id}   (admin API, cluster-only)
 *   - Input:     a Kratos identity ID (obtained from a trusted source — e.g.
 *                Hydra's consent.subject, a webhook, a backend record)
 *   - Output:    the canonical KratosIdentity row, always fresh from the DB
 *   - Identity:  reflects the current trait values, including edits made after
 *                the user's session was issued.
 *   - Failure modes: throws on any non-2xx. Works regardless of session state,
 *                    cookie presence, or which browser is on the wire.
 *   - Use when:  the caller is a trusted backend looking up a user by ID, where
 *                the browser's cookie is the wrong source of truth (consent
 *                flow, admin tooling, server-to-server lookups).
 *
 * Robustness: `whoami` is bounded by session lifecycle; `getIdentity` is
 * bounded only by the identity existing. Never use `whoami` when you have an
 * authoritative subject ID from a trusted issuer (Hydra), and never use
 * `getIdentity` from code paths where the *browser's* identity is the
 * question — `getIdentity` will happily return data for anyone if you pass
 * their ID, so the caller is responsible for the authorization decision.
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
