import { HydraClient } from "../types";

/**
 * Hydra admin helpers. Used by:
 *   - Crocus consent handler (`getLoginRequest`, `acceptLoginRequest`,
 *     `getConsentRequest`, `acceptConsentRequest`)
 *   - Crocus admin UI (`listClients` to populate the per-user grant matrix)
 */
export interface HydraAdminClient {
    adminUrl: string;
    fetch?: typeof fetch;
}

const hydra = (client: HydraAdminClient) => client.fetch ?? fetch;

export interface OAuth2LoginRequest {
    challenge: string;
    client: HydraClient;
    requested_scope: string[];
    subject: string;
    skip: boolean;
}

export interface OAuth2ConsentRequest {
    challenge: string;
    client: HydraClient;
    requested_scope: string[];
    subject: string;
    skip: boolean;
}

export interface CompletedRequest {
    redirect_to: string;
}

export const getLoginRequest = async (
    client: HydraAdminClient,
    loginChallenge: string,
): Promise<OAuth2LoginRequest> => {
    const res = await hydra(client)(
        `${client.adminUrl}/admin/oauth2/auth/requests/login?login_challenge=${encodeURIComponent(loginChallenge)}`,
    );
    if (!res.ok) throw new Error(`getLoginRequest failed (${res.status})`);
    return (await res.json()) as OAuth2LoginRequest;
};

export const acceptLoginRequest = async (
    client: HydraAdminClient,
    loginChallenge: string,
    body: { subject: string; remember?: boolean; remember_for?: number },
): Promise<CompletedRequest> => {
    const res = await hydra(client)(
        `${client.adminUrl}/admin/oauth2/auth/requests/login/accept?login_challenge=${encodeURIComponent(loginChallenge)}`,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        },
    );
    if (!res.ok) throw new Error(`acceptLoginRequest failed (${res.status})`);
    return (await res.json()) as CompletedRequest;
};

export const getConsentRequest = async (
    client: HydraAdminClient,
    consentChallenge: string,
): Promise<OAuth2ConsentRequest> => {
    const res = await hydra(client)(
        `${client.adminUrl}/admin/oauth2/auth/requests/consent?consent_challenge=${encodeURIComponent(consentChallenge)}`,
    );
    if (!res.ok) throw new Error(`getConsentRequest failed (${res.status})`);
    return (await res.json()) as OAuth2ConsentRequest;
};

export const acceptConsentRequest = async (
    client: HydraAdminClient,
    consentChallenge: string,
    body: {
        grant_scope: string[];
        grant_access_token_audience?: string[];
        session?: { id_token?: Record<string, unknown>; access_token?: Record<string, unknown> };
        remember?: boolean;
        remember_for?: number;
    },
): Promise<CompletedRequest> => {
    const res = await hydra(client)(
        `${client.adminUrl}/admin/oauth2/auth/requests/consent/accept?consent_challenge=${encodeURIComponent(consentChallenge)}`,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        },
    );
    if (!res.ok) throw new Error(`acceptConsentRequest failed (${res.status})`);
    return (await res.json()) as CompletedRequest;
};

export const listClients = async (client: HydraAdminClient): Promise<HydraClient[]> => {
    const res = await hydra(client)(`${client.adminUrl}/admin/clients`);
    if (!res.ok) throw new Error(`listClients failed (${res.status})`);
    return (await res.json()) as HydraClient[];
};
