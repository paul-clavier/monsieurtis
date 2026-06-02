# `infra/identity` — Ory stack on k3s

OpenTofu root that deploys the MonsieurTis identity stack (Kratos + Hydra +
Keto + Crocus) into the existing Civo k3s cluster. Managed with `tofu`; state
lives in the shared Civo Object Store bucket (`identity/terraform.tfstate`).

It is a **standalone root**, not a child module. `providers.tf` reads the
cluster's kubeconfig live from Civo via `data "civo_kubernetes_cluster"` (keyed
on `var.cluster_name`) and configures the kubernetes/helm providers from it — so
identity never reads `infra/cloud`'s state. Deploy `infra/cloud` first; the
cluster must exist before identity can plan.

## What it deploys

| Helm release | Chart                | Purpose                                                                |
| ------------ | -------------------- | ---------------------------------------------------------------------- |
| `postgres`   | `bitnami/postgresql` | Backing store. Three DBs: `kratos`, `hydra`, `keto`.                   |
| `kratos`     | `ory/kratos`         | Identity service. Public on `auth.monsieurtis.com`.                    |
| `hydra`      | `ory/hydra`          | OAuth2 / OIDC. Public on `id.monsieurtis.com`.                         |
| `keto`       | `ory/keto`           | Permission service (ReBAC). Cluster-internal.                          |
| `crocus`     | inline Deployment    | Login / consent / denied / admin UI. Public on `auth.monsieurtis.com`. |

Also creates Hydra OAuth2 clients for `linlin` and `harley`, and seeds the
initial Keto admin tuple.

## Usage

Locally, supply secrets via `terraform.tfvars` (gitignored) or `TF_VAR_*` env
vars, then:

```bash
export CIVO_TOKEN=...             # read by the civo provider (kubeconfig lookup)
export AWS_ACCESS_KEY_ID=...      # Civo Object Store key (state backend)
export AWS_SECRET_ACCESS_KEY=...
tofu init
tofu plan
tofu apply
```

`CIVO_TOKEN` is supplied via env, not a tofu variable. Required tofu inputs
without defaults: `domain`, `postgres_password`, `kratos_cookie_secret`,
`kratos_cipher_secret`, `hydra_system_secret`, `google_oauth_client_id`,
`google_oauth_client_secret`. `cluster_name` defaults to `monsieurtis` and must match
`infra/cloud`. In CI/CD these resolve from 1Password.

The `auth` and `id` subdomains are exposed by `infra/cloud` (`var.subdomains`),
not here.

## Bootstrap order

1. First `terraform apply` deploys Postgres, Kratos, Hydra, Keto, Crocus.
2. Register the **first user** manually by visiting `https://auth.monsieurtis.com/registration`.
3. Grab that user's Kratos identity ID:
    ```bash
    kubectl exec -n identity deploy/kratos -- kratos list identities --format=json | jq '.identities[0].id'
    ```
4. Set `initial_admin_kratos_id = "<id>"` in `terraform.tfvars` and re-apply.
   This seeds the admin tuple in Keto and grants access to `linlin` + `harley`.
5. From then on, manage user access via the Crocus admin UI at
   `https://auth.monsieurtis.com/admin/users`.
