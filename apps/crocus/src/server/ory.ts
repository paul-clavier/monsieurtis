/**
 * Server-only Ory clients. Imported exclusively from `createServerFn`
 * handlers — *never* from a component body, or admin URLs would leak into
 * the client bundle.
 *
 * URLs come from env vars set by the Kubernetes Deployment (see
 * `infra/identity/crocus.tf`):
 *
 *   KRATOS_PUBLIC_URL   → https://login.monsieurtis.com          (browser-visible)
 *   KRATOS_ADMIN_URL    → http://kratos-admin.identity.svc (in-cluster only)
 *   HYDRA_ADMIN_URL     → http://hydra-admin.identity.svc:4445
 *   KETO_READ_URL       → http://keto-read.identity.svc:80
 *   PUBLIC_AUTH_ORIGIN  → https://login.monsieurtis.com
 *
 * Crocus is read-only against Keto — permission changes are managed
 * declaratively in `infra/identity/variables.tf` (`user_groups` + the
 * reconcile Job). No KETO_WRITE_URL is wired here.
 */

import type { KetoCheckClient } from "@monsieurtis/ory";

const required = (name: string): string => {
    const v = process.env[name];
    if (!v) throw new Error(`Missing required env var ${name}`);
    return v;
};

export const oryConfig = {
    kratosPublicUrl: required("KRATOS_PUBLIC_URL"),
    kratosAdminUrl: required("KRATOS_ADMIN_URL"),
    hydraAdminUrl: required("HYDRA_ADMIN_URL"),
    ketoReadUrl: required("KETO_READ_URL"),
    publicAuthOrigin: required("PUBLIC_AUTH_ORIGIN"),
} as const;

export const ketoRead: KetoCheckClient = { readUrl: oryConfig.ketoReadUrl };
export const kratosPublic = { publicUrl: oryConfig.kratosPublicUrl };
export const kratosAdmin = { adminUrl: oryConfig.kratosAdminUrl };
export const hydraAdmin = { adminUrl: oryConfig.hydraAdminUrl };
