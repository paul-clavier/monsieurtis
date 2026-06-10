import { AppId, ketoUserSubject } from "../types";

/**
 * Keto permission check.
 *
 * Calls `GET /relation-tuples/check` against Keto's READ API. Returns true iff
 * the tuple exists (directly or by transitive expansion of subject sets).
 *
 * Designed to be called from a request hot path — Keto serves checks in
 * sub-millisecond from in-cluster DNS.
 */
export interface KetoCheckInput {
    namespace: string;
    object: string;
    relation: string;
    subject_id: string;
}

export interface KetoCheckClient {
    /** Base URL of Keto's read API, e.g. `http://keto-read.identity.svc:80`. */
    readUrl: string;
    /** Optional fetch override — useful for tests or non-Node runtimes. */
    fetch?: typeof fetch;
}

export const ketoCheck = async (
    client: KetoCheckClient,
    input: KetoCheckInput,
): Promise<boolean> => {
    const params = new URLSearchParams({
        namespace: input.namespace,
        object: input.object,
        relation: input.relation,
        subject_id: input.subject_id,
    });

    const f = client.fetch ?? fetch;
    const res = await f(
        `${client.readUrl}/relation-tuples/check?${params.toString()}`,
        {
            method: "GET",
            headers: { Accept: "application/json" },
        },
    );

    if (res.status === 200) {
        const body = (await res.json()) as { allowed: boolean };
        return body.allowed === true;
    }
    if (res.status === 403) {
        // Keto returns 403 with `{ allowed: false }` for negative answers.
        return false;
    }

    throw new Error(`Keto check failed with HTTP ${res.status}`);
};

/**
 * Convenience: does this Kratos identity have access to this app?
 * Wraps `ketoCheck` with the canonical `app:<id>#access@user:<kratos-id>` shape.
 */
export const canAccessApp = (
    client: KetoCheckClient,
    kratosIdentityId: string,
    appId: AppId,
): Promise<boolean> =>
    ketoCheck(client, {
        namespace: "app",
        object: appId,
        relation: "access",
        subject_id: ketoUserSubject(kratosIdentityId),
    });
