import { KratosPublicClient } from "./session";

/**
 * Kratos self-service flow helpers — fetch a browser flow by id so a custom
 * UI can render `flow.ui.nodes` as a plain HTML form posting back to Kratos.
 *
 * The caller must forward the inbound request's Cookie header: Kratos binds
 * each browser flow to a CSRF cookie, and returns 403 when it is missing or
 * doesn't match. A `null` return means "this flow can't be rendered — start
 * a fresh one" (expired, foreign, or unknown flow id); callers should
 * redirect to `/self-service/{kind}/browser` rather than show an error.
 */

/** A message attached to a flow or an individual node (errors, infos). */
export interface KratosUiMessage {
    id: number;
    text: string;
    type: "info" | "error" | "success";
}

/** One element of `flow.ui.nodes` — input, image, link, text or script. */
export interface KratosUiNode {
    type: "input" | "img" | "a" | "text" | "script";
    group:
        | "default"
        | "password"
        | "oidc"
        | "code"
        | "link"
        | "profile"
        | "totp"
        | "webauthn"
        | "lookup_secret";
    attributes: {
        name: string;
        type: string;
        value?: string | number | boolean | null;
        required?: boolean;
        disabled?: boolean;
        autocomplete?: string;
        node_type: string;
    };
    messages: KratosUiMessage[];
    meta: { label?: { id: number; text: string } };
}

/** The renderable part of a self-service flow. */
export interface KratosUiContainer {
    action: string;
    method: string;
    nodes: KratosUiNode[];
    messages?: KratosUiMessage[];
}

/** A Kratos self-service browser flow (subset of fields the UI needs). */
export interface KratosFlow {
    id: string;
    type: "browser" | "api";
    expires_at: string;
    ui: KratosUiContainer;
}

export type KratosFlowKind = "login" | "registration" | "recovery";

export const getSelfServiceFlow = async (
    client: KratosPublicClient,
    kind: KratosFlowKind,
    flowId: string,
    cookieHeader: string,
): Promise<KratosFlow | null> => {
    const f = client.fetch ?? fetch;
    const res = await f(
        `${client.publicUrl}/self-service/${kind}/flows?id=${encodeURIComponent(flowId)}`,
        {
            method: "GET",
            headers: { Cookie: cookieHeader, Accept: "application/json" },
        },
    );

    // 403 → CSRF cookie mismatch, 404 → unknown id, 410 → expired.
    if (res.status === 403 || res.status === 404 || res.status === 410) {
        return null;
    }
    if (!res.ok) {
        throw new Error(`Kratos get ${kind} flow failed (${res.status})`);
    }
    return (await res.json()) as KratosFlow;
};

export const getLoginFlow = (
    client: KratosPublicClient,
    flowId: string,
    cookieHeader: string,
): Promise<KratosFlow | null> =>
    getSelfServiceFlow(client, "login", flowId, cookieHeader);

export const getRegistrationFlow = (
    client: KratosPublicClient,
    flowId: string,
    cookieHeader: string,
): Promise<KratosFlow | null> =>
    getSelfServiceFlow(client, "registration", flowId, cookieHeader);

export const getRecoveryFlow = (
    client: KratosPublicClient,
    flowId: string,
    cookieHeader: string,
): Promise<KratosFlow | null> =>
    getSelfServiceFlow(client, "recovery", flowId, cookieHeader);

/**
 * Resolve the one-shot logout URL for the browser's current session.
 * Visiting the returned URL completes the logout at Kratos and redirects to
 * the configured `default_browser_return_url`. Returns null when there is no
 * active session (nothing to log out of).
 */
export const getLogoutUrl = async (
    client: KratosPublicClient,
    cookieHeader: string,
): Promise<string | null> => {
    const f = client.fetch ?? fetch;
    const res = await f(`${client.publicUrl}/self-service/logout/browser`, {
        method: "GET",
        headers: { Cookie: cookieHeader, Accept: "application/json" },
    });

    if (res.status === 401 || res.status === 404) return null;
    if (!res.ok) {
        throw new Error(`Kratos logout/browser failed (${res.status})`);
    }
    const body = (await res.json()) as { logout_url?: string };
    return body.logout_url ?? null;
};
