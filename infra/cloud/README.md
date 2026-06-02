# `infra/cloud` — Civo k3s + Cloudflare Tunnel + Tailscale Exit Node

Provisions the Civo-hosted k3s cluster, the Cloudflare tunnel that fronts it,
the in-cluster platform (Traefik, cert-manager, cloudflared, ratelimit
middleware), and the Tailscale exit-node VPS that gates kube API access.

Managed with [OpenTofu](https://opentofu.org/) (Terraform-compatible fork).
Install via `brew install opentofu` and use the `tofu` CLI.

First-time setup (accounts, credentials, 1Password items, state backend) is
documented in [BOOTSTRAP.md](./BOOTSTRAP.md). This README assumes that
groundwork is done.

## Layout

| File                  | Purpose                                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| _Common_              |                                                                           |
| `versions.tf`         | Required OpenTofu + provider versions                                     |
| `providers.tf`        | civo, cloudflare, tailscale, kubernetes, helm wiring                      |
| `backend.tf`          | S3-compatible state backend on Civo Object Store                          |
| `variables.tf`        | Inputs (see table below)                                                  |
| `outputs.tf`          | kubeconfig + IDs (cluster, firewall, tunnel, exit-node IP)                |
| _Infra_               |                                                                           |
| `cluster.tf`          | Default-deny firewall + kube API rule (pinned to exit node) + k3s cluster |
| `network.tf`          | Tailscale ACL + preauth key + exit-node VPS (Debian 12) + its firewall    |
| `cloud-init.sh.tftpl` | First-boot script that installs Tailscale and joins the tailnet           |
| `platform.tf`         | Traefik, cert-manager, cloudflared, `ratelimit` middleware                |
| `cloudflare.tf`       | Tunnel, tunnel token, catch-all config, per-subdomain CNAMEs              |

## Required `terraform.tfvars`

```hcl
cloudflare_api_token  = "..."  # dash.cloudflare.com/profile/api-tokens
cloudflare_account_id = "..."
cloudflare_zone_id    = "..."
admin_ssh_public_key  = "ssh-ed25519 AAAA... monsieurtis"  # break-glass key on the exit node
```

Provider credentials live in env vars (not tofu variables):

```bash
export CIVO_TOKEN=...                      # dashboard.civo.com/security
export TAILSCALE_OAUTH_CLIENT_ID=...       # tailscale → Settings → OAuth clients
export TAILSCALE_OAUTH_CLIENT_SECRET=...
export TAILSCALE_TAILNET=...               # admin console, top-left
export AWS_ACCESS_KEY_ID=...               # Civo Object Store key (state backend)
export AWS_SECRET_ACCESS_KEY=...
```

Optional overrides: `civo_region`, `cluster_name`, `node_size`, `node_count`,
`exit_node_size`, `domain`, `subdomains`, `chart_versions`.

The Cloudflare API token needs:

- `Account → Cloudflare Tunnel → Edit`
- `Zone → DNS → Edit` on the apex
- `Zone → Zone → Read` on the apex

The Tailscale OAuth client needs scopes `auth_keys:write`, `policy_file:write`,
`devices:write`, with tag `tag:monsieurtis`.

## Apply

State lives in the shared Civo Object Store bucket (`cloud/terraform.tfstate`),
provisioned by [`infra/bootstrap`](../bootstrap). With the env vars above
exported and `terraform.tfvars` filled in:

```bash
tofu init
tofu plan
tofu apply
```

Once applied, `./kubeconfig` is written (mode 0600, gitignored). `infra/identity`
does **not** need this file — it reads the kubeconfig live from Civo via a
`civo_kubernetes_cluster` data source.

## Kube API access

There is no user-supplied CIDR. The kube API firewall rule is pinned to the
public `/32` of `civo_instance.exit_node`, the Tailscale exit-node VPS
provisioned here. Reaching `:6443` from a laptop requires:

1. The laptop is on the tailnet (`tailscale up`).
2. The laptop selects the exit node (`tailscale up --exit-node=monsieurtis-exit`).

The exit node's own firewall is also default-deny except UDP/41641 (Tailscale
direct connections) — no public SSH. Admin access to the VPS goes through
Tailscale SSH; `admin_ssh_public_key` is a break-glass fallback via the Civo
console.

The ACL in `network.tf` sets `autoApprovers.exitNode = ["tag:monsieurtis"]`, so
the VPS is usable as an exit node the moment it registers — no admin click in
the Tailscale console.

The kube API firewall rule label is `k8s-api` so the `/32` can be updated in
place (e.g. if the exit node is rebuilt) without recreating the cluster.

## Adding a subdomain

1. Append it to `var.subdomains` in `terraform.tfvars`.
2. `tofu apply` — creates the proxied CNAME.
3. In the cluster, create an `IngressRoute` matching `Host(\`<sub>.monsieurtis.com\`)`.
Reference the shared rate-limit middleware as `ratelimit@kubernetescrd` if
   desired.

cloudflared doesn't need to be touched — the catch-all rule forwards every
hostname to Traefik, which does the actual host-based routing.

## Verification (post-apply)

- `civo quota show` reflects the limits set via the dashboard
- `KUBECONFIG=./kubeconfig kubectl get nodes` → `node_count` nodes `Ready`
  (only works while the laptop has the exit node selected)
- `kubectl get pods -A` → `traefik`, `cert-manager`, `cloudflared` `Running`
- `kubectl logs -n cloudflared -l app.kubernetes.io/name=cloudflared` shows
  8× `Registered tunnel connection` (2 replicas × 4 conns)
- Cloudflare → Zero Trust → Networks → Tunnels → `<cluster_name>-civo` Healthy
- Each entry in `var.subdomains` has a proxied CNAME in the Cloudflare zone
- `kubectl get middleware -n traefik ratelimit` exists
- Tailscale admin console → `monsieurtis-exit` appears, tagged `tag:monsieurtis`,
  advertising exit-node routes (auto-approved)

## CI/CD

- PRs to `main` touching `infra/` run `tofu-ci.yml` (fmt, validate, tflint,
  trivy, and a `tofu plan` posted as a PR comment).
- Merging `main` into `infra_cloud_main` applies this root via `tofu-cd.yml`.

CI/CD secrets come from 1Password. Runners reach the kube API only via the
exit-node `/32`, so the runner itself must be on the tailnet with the exit
node selected (or run on the exit node).

## Out of scope

- Civo dashboard steps: quota request, billing alert, virtual card (see
  [BOOTSTRAP.md](./BOOTSTRAP.md))
- Cluster workloads beyond the platform helm releases — apps are deployed by
  their own modules (e.g. [`infra/identity`](../identity))
