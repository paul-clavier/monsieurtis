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

| Helm release | Chart                | Purpose                                                         |
| ------------ | -------------------- | --------------------------------------------------------------- |
| `postgres`   | `bitnami/postgresql` | Backing store. Three DBs: `kratos`, `hydra`, `keto`.            |
| `kratos`     | `ory/kratos`         | Identity service. Public on `login.monsieurtis.com`.            |
| `hydra`      | `ory/hydra`          | OAuth2 / OIDC issuer. Public on `oauth.monsieurtis.com`.        |
| `keto`       | `ory/keto`           | Permission service (ReBAC). Cluster-internal.                   |
| `crocus`     | inline Deployment    | Login / consent / denied UI. Public on `login.monsieurtis.com`. |

Also creates Hydra OAuth2 clients for `linlin`, and runs a **reconcile Job**
that materialises the access policy (`local.owner_email` + `var.user_groups`)
into Keto on every apply — tuples removed from Terraform are deleted from
Keto on the next run.

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

The `login` and `oauth` subdomains are exposed by `infra/cloud` (`var.subdomains`),
not here.

## Bootstrap order

1. First `tofu apply` deploys Postgres, Kratos, Hydra, Keto, Crocus. The
   reconcile Job runs and writes group tuples (`monsieurtis_friends`,
   `linlin_user`), but the owner lookup returns no identity (no one has
   registered yet) and the Job logs "Owner not yet registered — skipping
   owner tuples." That is expected.
2. Register the owner by visiting `https://login.monsieurtis.com/registration`
   and signing in with Google. Kratos creates an identity with
   `traits.email = "plclavier@gmail.com"`.
3. Re-apply (`tofu apply`). The reconcile Job resolves the owner by email
   and writes `crocus-admin:platform#access@user:<id>` plus
   `app:<X>#access@user:<id>` for every gated app — no identity-ID
   juggling required.

## Access policy (declarative)

Permissions live in this Terraform root. There is no admin UI — change
the code, open a PR, `tofu apply`.

- **`local.owner_email`** (hardcoded in `keto.tf`) — single source of truth
  for who the `monsieurtis_owner` is. The reconcile Job translates this
  email into a Kratos identity ID at run time, so changing the email is a
  one-line PR.
- **`var.user_groups`** — map of `team:<name>`. Each entry lists `apps`
  (subset of gated apps, or `["*"]` for all) and `member_ids` (Kratos IDs).
- **`var.registered_apps[*].gated`** — set `false` for public apps so no
  Keto tuples are written about them.

The reconcile Job diffs the desired set against Keto and applies the
delta — adding new tuples, removing ones no longer in Terraform.
