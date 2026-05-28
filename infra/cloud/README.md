# `infra/cloud` — Civo k3s + Cloudflare Tunnel

Provisions the Civo-hosted k3s cluster, the Cloudflare tunnel that fronts it,
and the in-cluster platform (Traefik, cert-manager, cloudflared, ratelimit
middleware). See [`CIVO.md`](../../CIVO.md) for the full design rationale.

Managed with [OpenTofu](https://opentofu.org/) (Terraform-compatible fork).
Install via `brew install opentofu` and use the `tofu` CLI.

## Layout

| File            | Purpose                                                          |
| --------------- | ---------------------------------------------------------------- |
| `versions.tf`   | Required OpenTofu + provider versions                            |
| `providers.tf`  | civo, cloudflare, kubernetes, helm wiring                        |
| `variables.tf`  | Inputs (see table below)                                         |
| `cluster.tf`    | Default-deny firewall + kube API rule + k3s cluster (cilium CNI) |
| `platform.tf`   | Traefik, cert-manager, cloudflared, `ratelimit` middleware       |
| `cloudflare.tf` | Tunnel, tunnel token, catch-all config, per-subdomain CNAMEs     |
| `outputs.tf`    | kubeconfig + IDs (cluster, firewall, tunnel)                     |

## Required `terraform.tfvars`

```hcl
cloudflare_api_token  = "..."  # dash.cloudflare.com/profile/api-tokens
cloudflare_account_id = "..."
cloudflare_zone_id    = "..."
kube_api_allowed_cidr = "77.133.250.78/32"  # single admin/Tailscale IP; /0 is rejected
```

The Civo token is supplied via the `CIVO_TOKEN` env var (not a tofu variable):
`export CIVO_TOKEN=...` (dashboard.civo.com/security).

Optional overrides: `civo_region`, `cluster_name`, `node_size`, `node_count`,
`domain`, `subdomains`, `chart_versions`.

The Cloudflare API token needs:

- `Account → Cloudflare Tunnel → Edit`
- `Zone → DNS → Edit` on the apex
- `Zone → Zone → Read` on the apex

## Bootstrap

State lives in the shared Civo Object Store bucket (`cloud/terraform.tfstate`),
provisioned by [`infra/bootstrap`](../bootstrap). Create that bucket first, then:

```bash
export AWS_ACCESS_KEY_ID=...      # Civo Object Store key (state backend)
export AWS_SECRET_ACCESS_KEY=...
tofu init
tofu plan
tofu apply
```

Once applied, `./kubeconfig` is written (mode 0600, gitignored). `infra/identity`
does **not** need this file — it reads the kubeconfig live from Civo via a
`civo_kubernetes_cluster` data source.

## kube API access

`kube_api_allowed_cidr` is **required** — there is no default, so an apply
fails until you declare exactly who may reach the kube API on `:6443`. A
`validation` block rejects any `/0` mask, so the API can never be opened to the
whole internet by accident. Set it to a single `/32` (your admin IP, or a
Tailscale exit node's static IP once that exists — see [`CIVO.md`](../../CIVO.md) §5.3).
Everything else inbound stays denied by the default-deny firewall; all app
traffic enters outbound-only through cloudflared. The firewall rule label is
`k8s-api` so the `/32` can be updated in place (e.g. via CI/CD) without
recreating the cluster.

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
- `KUBECONFIG=./kubeconfig kubectl get nodes` → 2 nodes `Ready`
- `kubectl get pods -A` → `traefik`, `cert-manager`, `cloudflared` `Running`
- `kubectl logs -n cloudflared -l app.kubernetes.io/name=cloudflared` shows
  8× `Registered tunnel connection` (2 replicas × 4 conns)
- Cloudflare → Zero Trust → Networks → Tunnels → `<cluster_name>-civo` Healthy
- Each entry in `var.subdomains` has a proxied CNAME in the Cloudflare zone
- `kubectl get middleware -n traefik ratelimit` exists

## CI/CD

- PRs to `main` touching `infra/` run `tofu-ci.yml` (fmt, validate, tflint,
  trivy, and a `tofu plan` posted as a PR comment).
- Merging `main` into `infra_cloud_main` applies this root via `tofu-cd.yml`.

CI/CD secrets come from 1Password; runners reach the cluster only while
`kube_api_allowed_cidr` stays open (see above).

## Out of scope

- Tailscale exit-node VPS provisioning
- Civo dashboard steps: quota request, billing alert, virtual card
