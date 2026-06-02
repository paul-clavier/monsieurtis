import { AppId, ketoUserSubject } from "../types";
import { RelationTuple } from "../types";

/**
 * Keto write helpers — used by the Crocus admin grant flow and by the seed Job.
 *
 * The write API lives on a different port from the read API. Routes are
 * idempotent (PUT) for single tuples and transactional (PATCH) for batches.
 */
export interface KetoWriteClient {
    writeUrl: string;
    fetch?: typeof fetch;
}

export const ketoPutTuple = async (
    client: KetoWriteClient,
    tuple: RelationTuple,
): Promise<void> => {
    const f = client.fetch ?? fetch;
    const res = await f(`${client.writeUrl}/admin/relation-tuples`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(tuple),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Keto PUT failed (${res.status}): ${text}`);
    }
};

export const ketoDeleteTuple = async (
    client: KetoWriteClient,
    tuple: RelationTuple,
): Promise<void> => {
    const params = new URLSearchParams({
        namespace: tuple.namespace,
        object: tuple.object,
        relation: tuple.relation,
        "subject_id": tuple.subject_id,
    });

    const f = client.fetch ?? fetch;
    const res = await f(`${client.writeUrl}/admin/relation-tuples?${params.toString()}`, {
        method: "DELETE",
    });

    // 404 is fine — tuple didn't exist, we're at the desired state.
    if (!res.ok && res.status !== 404) {
        const text = await res.text();
        throw new Error(`Keto DELETE failed (${res.status}): ${text}`);
    }
};

/** Grant access to an app for a Kratos identity. Idempotent. */
export const grantAppAccess = (
    client: KetoWriteClient,
    kratosIdentityId: string,
    appId: AppId,
): Promise<void> =>
    ketoPutTuple(client, {
        namespace: "app",
        object: appId,
        relation: "access",
        subject_id: ketoUserSubject(kratosIdentityId),
    });

/** Revoke access. Idempotent — succeeds whether the tuple existed or not. */
export const revokeAppAccess = (
    client: KetoWriteClient,
    kratosIdentityId: string,
    appId: AppId,
): Promise<void> =>
    ketoDeleteTuple(client, {
        namespace: "app",
        object: appId,
        relation: "access",
        subject_id: ketoUserSubject(kratosIdentityId),
    });
