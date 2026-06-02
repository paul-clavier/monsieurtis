/**
 * Shared types used across the Ory helpers.
 *
 * Naming follows the entity convention in `.claude/rules/convention-entity.md`:
 * canonical row + compositional intersections.
 */

/** A Keto relation tuple — the unit of permission storage. */
export interface RelationTuple {
    namespace: string;
    object: string;
    relation: string;
    /** Either `subject_id` (a string like `user:<id>`) or `subject_set` (a relation on another object). We use `subject_id` form everywhere for v1. */
    subject_id: string;
}

/** A Kratos identity as it appears in the admin API response (subset of fields we use). */
export interface KratosIdentity {
    id: string;
    schema_id: string;
    traits: {
        email: string;
        name?: { first?: string; last?: string };
    };
    state?: "active" | "inactive";
    created_at?: string;
    updated_at?: string;
}

/** A Kratos session as returned by `/sessions/whoami`. */
export interface KratosSession {
    id: string;
    active: boolean;
    expires_at: string;
    identity: KratosIdentity;
}

/** A Hydra OAuth2 client (subset). */
export interface HydraClient {
    client_id: string;
    client_name?: string;
    redirect_uris?: string[];
    grant_types?: string[];
    scope?: string;
}

/**
 * Canonical app identifier — matches the `client_id` registered with Hydra
 * and the `object` in Keto tuples `app:<id>#access@user:<kratos-id>`.
 */
export type AppId = string;

/** Kratos identity ID, prefixed `user:` to form a Keto subject. */
export const ketoUserSubject = (kratosIdentityId: string): string =>
    `user:${kratosIdentityId}`;
