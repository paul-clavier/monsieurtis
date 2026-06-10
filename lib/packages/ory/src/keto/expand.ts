import { AppId, ketoUserSubject } from "../types";
import { KetoCheckClient } from "./check";

/**
 * Keto query — list relation tuples matching a partial pattern.
 *
 * Used by Crocus's app launcher: "which apps can this user reach?".
 * Calls `GET /relation-tuples` filtered by subject_id + relation.
 */
export interface KetoQueryInput {
    namespace?: string;
    object?: string;
    relation?: string;
    subject_id?: string;
}

interface KetoQueryResponse {
    relation_tuples: Array<{
        namespace: string;
        object: string;
        relation: string;
        subject_id?: string;
    }>;
    next_page_token?: string;
}

export const ketoQuery = async (
    client: KetoCheckClient,
    input: KetoQueryInput,
): Promise<KetoQueryResponse["relation_tuples"]> => {
    const params = new URLSearchParams();
    if (input.namespace) params.set("namespace", input.namespace);
    if (input.object) params.set("object", input.object);
    if (input.relation) params.set("relation", input.relation);
    if (input.subject_id) params.set("subject_id", input.subject_id);

    const f = client.fetch ?? fetch;
    const res = await f(
        `${client.readUrl}/relation-tuples?${params.toString()}`,
        {
            method: "GET",
            headers: { Accept: "application/json" },
        },
    );

    if (!res.ok) {
        throw new Error(`Keto query failed with HTTP ${res.status}`);
    }

    const body = (await res.json()) as KetoQueryResponse;
    return body.relation_tuples;
};

/** List every app this Kratos identity has `access` to. */
export const listUserApps = async (
    client: KetoCheckClient,
    kratosIdentityId: string,
): Promise<AppId[]> => {
    const tuples = await ketoQuery(client, {
        namespace: "app",
        relation: "access",
        subject_id: ketoUserSubject(kratosIdentityId),
    });
    return tuples.map((t) => t.object);
};
