# Civo Side-Projects Setup — Summary

A reference for setting up a k3s cluster on Civo with Cloudflare Tunnel, Traefik,
and Terraform-managed IaC for personal/side projects.

> Goal: cheap (≤$15/mo), no surprise costs, hard cap on spend, zero public ports
> on the cluster, multiple subdomains routed to multiple services.

---

## TL;DR — Decisions made

| Decision               | Choice                                                              | Why                                                                              |
| ---------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Provider               | **Civo (FRA1 region)**                                              | Managed k3s, $5.43/mo/node, free egress, low default quotas → effective hard cap |
| Cluster spec           | **1 node, `g4s.kube.small`** (1 vCPU / 2 GB / 50 GB)                | Smallest viable for k3s + Traefik + cert-manager + 1–2 apps                      |
| Public traffic ingress | **Cloudflare Tunnel (cloudflared)**, not Civo LB                    | Saves $10/mo, no public IP exposure, structurally DDoS-resistant                 |
| In-cluster routing     | **Traefik** (catch-all from cloudflared)                            | Adding apps = create IngressRoute; no tunnel/DNS changes                         |
| Admin access (kubectl) | **Tailscale exit node on a tiny VPS** (recommended)                 | Survives ISP IP rotation, no public kube API exposure                            |
| Cost cap               | **Civo quota lowered to ~$13/mo equivalent** + virtual card         | Hard ceiling on resources; software-enforced                                     |
| Subdomains             | All **1-level** (e.g. `api-foo.mrtis.com`, not `api.foo.mrtis.com`) | Cloudflare's free Universal SSL only covers 1-level subdomains                   |

**Estimated monthly cost: $5.43** (single node, no LB, no extras).

---

## 1. Civo signup & UI walkthrough

### 1.1 Sign up

Go to https://dashboard.civo.com/signup. New accounts get **$250 in credit valid
for the first month**, so initial experimentation is effectively free.

If flagged for manual verification, expect 1–2 days. Don't wait until the night
you want to deploy.

### 1.2 Add payment method (use a virtual card)

Civo requires a card on file before any resource can be created. Their docs say
they don't support prepaid/virtual cards, but **Revolut and Wise virtual cards
work in practice** because they're issued as standard debit cards.

Recommendation: use a virtual card with a **monthly limit of €30**. This is your
last line of defence against runaway billing — even if every other safeguard
fails, the card will refuse the charge.

UI path: **Account → Billing → Payment methods → Add card**.

### 1.3 Set the region to FRA1

Bottom-left of the dashboard sidebar — the region dropdown. From Paris:

- **FRA1 (Frankfurt)**: ~10 ms latency ✅ choose this
- LON1 (London): ~15 ms
- NYC1 (New York): too far

This becomes the default for all resources you create via UI or API.

### 1.4 Lock down quota — the hard spend cap

This is the single most important step for "no surprise" billing.

UI path: **Account → Quota** (https://dashboard.civo.com/quota).

Click "Request quota change" and ask Civo support for **exactly these limits**:

| Resource                     | Limit                        |
| ---------------------------- | ---------------------------- |
| Instances / Kubernetes nodes | 2                            |
| CPU cores                    | 2                            |
| RAM                          | 4 GB                         |
| Volumes                      | 2                            |
| Total volume size            | 20 GB                        |
| Object stores                | 1 (or 0)                     |
| Load balancers               | 0 (we use Cloudflare Tunnel) |
| Reserved IPs                 | 0                            |

Suggested ticket text:

> Side-project account, please lower my quota to the values above. I want a
> hard ceiling on resources I can deploy, not the default. Thank you.

Civo support typically responds within a day. Once applied, **you cannot
exceed roughly $13/mo** no matter what — leaked credentials, runaway Terraform,
malicious actor — because the API will reject any resource creation past the
quota.

### 1.5 Set a billing alert (soft layer)

UI path: **Account → Billing → Alerts**. Set threshold at **$10**. Sends email
when crossed. This is an early-warning, not a cap — the quota above is the
actual ceiling.

### 1.6 Generate an API key for Terraform

UI path: https://dashboard.civo.com/security (or **Account → Security**).

Either use the default key Civo creates on signup, or click "Create new" with
a name like `terraform-side-projects` so you can revoke it independently.

Reveal the token (eye icon), copy it, store it in a password manager:

```bash
# pass-style
pass insert civo/api-token

# 1Password CLI
op item create --category=password --title="Civo API" password="<paste>"

# Plain env file (gitignored)
mkdir -p ~/.config/civo
echo 'CIVO_TOKEN="<paste>"' > ~/.config/civo/env
chmod 600 ~/.config/civo/env
```

**Treat this token like a root password** — anyone with it can deploy resources
up to your quota.

### 1.7 (Optional) Install the Civo CLI for sanity checks

```bash
curl -sL https://civo.com/get | sh
# or
brew tap civo/tools && brew install civo

civo apikey save side-projects <your-token>
civo apikey current side-projects
civo region use FRA1

civo quota show                              # confirm lowered limits
civo sizes ls --filter type=kubernetes       # confirm g4s.kube.small exists
civo kubernetes versions ls
```

If `civo quota show` matches what support set, you're correctly configured.

---

## 2. Cost control & DDoS protection

### 2.1 Cost layers (defense in depth)

Three independent safeguards. Any one failing, the others still hold:

1. **Civo quota** (hard, software-enforced) — caps at ~$13/mo regardless
2. **Billing alert at $10** (notification only)
3. **Virtual card with €30/mo limit** (last resort — bank refuses charge)

None of the four major providers (Civo, OVH, Hetzner, GKE) offer a native "stop
spending at €X" hard cap. The combination above gives you an effective one.

### 2.2 Why no Civo LoadBalancer

A Civo Load Balancer costs **$10/month** per 10K concurrent requests. For a
side project with low traffic, this triples the bill. We avoid it by using
Cloudflare Tunnel instead — the cluster has no public IP and no inbound ports
open.

### 2.3 DDoS protection layers (with Cloudflare Tunnel)

In order of where attacks are stopped:

1. **No public IP on origin.** With cloudflared, the cluster has zero open
   inbound ports. Cannot be DDoSed at the network layer because there is
   nothing to send packets to.
2. **Cloudflare edge.** Free tier includes always-on L3/L4 DDoS mitigation,
   basic L7 protection, and unmetered bandwidth.
3. **Cloudflare WAF (free tier).** Basic ruleset; OWASP rules require Pro
   ($20/mo).
4. **Cloudflare rate limiting (free tier).** 10K req/month threshold for free
   rules.
5. **Traefik rate limiting middleware** (in-cluster, after Cloudflare):
    ```yaml
    apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata: { name: ratelimit, namespace: traefik }
    spec:
        rateLimit:
            average: 100 # req/sec averaged
            burst: 200 # absolute ceiling
    ```
6. **Application-level**: auth, fail2ban-style banning if exposing login
   endpoints.

### 2.4 What happens during a DDoS

With this architecture, a DDoS attack:

- Reaches Cloudflare edge (free, unlimited bandwidth — costs you $0)
- Is absorbed by Cloudflare's network capacity
- Never reaches your tunnel or your origin
- **Cannot generate any cost on Civo** (Civo egress is free anyway, but more
  importantly, no traffic ever enters Civo's network)

This is the "structurally DDoS-resistant" claim. The tunnel design makes
runaway-cost scenarios mechanically impossible.

---

## 3. Architecture overview

```
   User browser
       │
       │ 1. DNS lookup (foo.mrtis.com → CNAME to <tunnel-id>.cfargotunnel.com)
       ▼
   Cloudflare Edge (proxy + DDoS shield + TLS termination)
       │
       │ 2. routes through pre-established outbound tunnel
       ▼
   ╔═══════════════════════════════════════════════════════════╗
   ║ Civo region FRA1                                          ║
   ║                                                           ║
   ║   ┌──────────────────┐                                    ║
   ║   │ cloudflared pod  │ ◀── persistent QUIC connections    ║
   ║   │ (2 replicas)     │     opened OUTBOUND from cluster   ║
   ║   └────────┬─────────┘                                    ║
   ║            │ 3. catch-all → traefik ClusterIP             ║
   ║            ▼                                              ║
   ║   ┌──────────────────┐                                    ║
   ║   │ Traefik          │                                    ║
   ║   └────────┬─────────┘                                    ║
   ║            │ 4. matches Host(`foo.mrtis.com`)             ║
   ║            ▼                                              ║
   ║   ┌──────────────────┐                                    ║
   ║   │ foo Service      │                                    ║
   ║   └────────┬─────────┘                                    ║
   ║            ▼                                              ║
   ║   ┌──────────────────┐                                    ║
   ║   │ foo Pod          │                                    ║
   ║   └──────────────────┘                                    ║
   ║                                                           ║
   ║ Cluster firewall:                                         ║
   ║  - INBOUND from internet: NOTHING                         ║
   ║  - OUTBOUND: HTTPS (443) + QUIC (7844) to Cloudflare      ║
   ╚═══════════════════════════════════════════════════════════╝
```

Key property: **the cluster is outbound-only**. Both app traffic (cloudflared)
and admin access (Tailscale) initiate from inside outward. No unsolicited
inbound connections accepted from the public internet.

---

## 4. Terraform setup

### 4.1 Project layout

```
civo-side-projects/
├── provider.tf       # provider config + kubeconfig wiring
├── variables.tf      # inputs
├── cluster.tf        # firewall + cluster + node pool
├── platform.tf       # cert-manager, Traefik, cloudflared via Helm
├── cloudflare.tf     # tunnel + DNS records
├── outputs.tf        # kubeconfig output
├── terraform.tfvars  # gitignored — holds tokens
└── .gitignore        # kubeconfig, terraform.tfvars, .terraform/
```

### 4.2 `provider.tf`

```hcl
terraform {
  required_version = ">= 1.6"

  required_providers {
    civo       = { source = "civo/civo",            version = "~> 1.1" }
    cloudflare = { source = "cloudflare/cloudflare", version = "~> 4.40" }
    helm       = { source = "hashicorp/helm",       version = "~> 2.16" }
    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.34" }
    local      = { source = "hashicorp/local",      version = "~> 2.5" }
  }
}

provider "civo" {
  token  = var.civo_token
  region = var.civo_region
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Decode kubeconfig once, reuse for kubernetes + helm providers
locals {
  kubeconfig = yamldecode(civo_kubernetes_cluster.main.kubeconfig)
  cluster    = local.kubeconfig.clusters[0].cluster
  user       = local.kubeconfig.users[0].user
}

provider "kubernetes" {
  host                   = local.cluster.server
  client_certificate     = base64decode(local.user["client-certificate-data"])
  client_key             = base64decode(local.user["client-key-data"])
  cluster_ca_certificate = base64decode(local.cluster["certificate-authority-data"])
}

provider "helm" {
  kubernetes {
    host                   = local.cluster.server
    client_certificate     = base64decode(local.user["client-certificate-data"])
    client_key             = base64decode(local.user["client-key-data"])
    cluster_ca_certificate = base64decode(local.cluster["certificate-authority-data"])
  }
}
```

### 4.3 `variables.tf`

```hcl
variable "civo_token"            { type = string, sensitive = true }
variable "civo_region"           { type = string, default = "FRA1" }
variable "cluster_name"          { type = string, default = "side-projects" }
variable "node_size"             { type = string, default = "g4s.kube.small" }
variable "node_count"            { type = number, default = 1 }
variable "cloudflare_api_token"  { type = string, sensitive = true }
variable "cloudflare_account_id" { type = string }
variable "cloudflare_zone_id"    { type = string }
variable "domain"                { type = string, default = "mrtis.com" }
variable "subdomains"            { type = list(string), default = ["foo", "api-foo", "bar", "baz"] }
```

### 4.4 `cluster.tf`

```hcl
data "civo_kubernetes_version" "stable" {
  filter { key = "type", values = ["stable"] }
}

# Locked-down firewall. With Cloudflare Tunnel, NO inbound rules needed.
# The default-deny posture is the point.
resource "civo_firewall" "cluster" {
  name                 = "${var.cluster_name}-fw"
  create_default_rules = false
}

resource "civo_kubernetes_cluster" "main" {
  name               = var.cluster_name
  firewall_id        = civo_firewall.cluster.id
  cluster_type       = "k3s"
  kubernetes_version = data.civo_kubernetes_version.stable.versions[0].label
  cni                = "flannel"   # use "cilium" if you want NetworkPolicies

  pools {
    label      = "default"
    size       = var.node_size
    node_count = var.node_count
  }

  applications = ""   # disable Civo marketplace; manage everything via Helm
}
```

### 4.5 `platform.tf`

```hcl
resource "kubernetes_namespace" "traefik"      { metadata { name = "traefik" } }
resource "kubernetes_namespace" "cloudflared"  { metadata { name = "cloudflared" } }
resource "kubernetes_namespace" "cert_manager" { metadata { name = "cert-manager" } }

resource "helm_release" "traefik" {
  name       = "traefik"
  namespace  = kubernetes_namespace.traefik.metadata[0].name
  repository = "https://traefik.github.io/charts"
  chart      = "traefik"
  version    = "33.0.0"

  # ClusterIP service (not LoadBalancer) — cloudflared reaches it internally
  set { name = "service.type", value = "ClusterIP" }
}

resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  namespace  = kubernetes_namespace.cert_manager.metadata[0].name
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  version    = "v1.16.1"

  set { name = "crds.enabled", value = "true" }
}

resource "helm_release" "cloudflared" {
  name       = "cloudflared"
  namespace  = kubernetes_namespace.cloudflared.metadata[0].name
  repository = "https://cloudflare.github.io/helm-charts"
  chart      = "cloudflare-tunnel-remote"

  set {
    name  = "cloudflare.tunnelToken"
    value = cloudflare_zero_trust_tunnel_cloudflared_token.mrtis.token
  }

  set { name = "replicaCount", value = "2" }   # HA tunnel
}
```

### 4.6 `cloudflare.tf`

```hcl
resource "random_id" "tunnel_secret" {
  byte_length = 35
}

resource "cloudflare_zero_trust_tunnel_cloudflared" "mrtis" {
  account_id    = var.cloudflare_account_id
  name          = "mrtis-civo"
  tunnel_secret = random_id.tunnel_secret.b64_std
  config_src    = "cloudflare"
}

resource "cloudflare_zero_trust_tunnel_cloudflared_token" "mrtis" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.mrtis.id
}

# Single catch-all rule: send everything to Traefik, let Traefik do the routing
resource "cloudflare_zero_trust_tunnel_cloudflared_config" "mrtis" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.mrtis.id

  config = {
    ingress = [{
      service = "http://traefik.traefik.svc.cluster.local:80"
      origin_request = {
        http_host_header = ""   # pass through the original Host header
      }
    }]
  }
}

# One CNAME per subdomain — for_each makes adding new ones a one-line change
resource "cloudflare_dns_record" "apps" {
  for_each = toset(var.subdomains)

  zone_id = var.cloudflare_zone_id
  name    = each.value
  content = "${cloudflare_zero_trust_tunnel_cloudflared.mrtis.id}.cfargotunnel.com"
  type    = "CNAME"
  proxied = true   # required for tunnel to work
  ttl     = 1      # 1 = "auto" when proxied
}
```

### 4.7 `outputs.tf`

```hcl
output "kubeconfig" {
  value     = civo_kubernetes_cluster.main.kubeconfig
  sensitive = true
}

resource "local_sensitive_file" "kubeconfig" {
  content         = civo_kubernetes_cluster.main.kubeconfig
  filename        = "${path.module}/kubeconfig"
  file_permission = "0600"
}
```

### 4.8 Bootstrap

```bash
cat > terraform.tfvars <<EOF
civo_token            = "<from dashboard.civo.com/security>"
cloudflare_api_token  = "<from dash.cloudflare.com/profile/api-tokens>"
cloudflare_account_id = "<from any zone overview page on Cloudflare>"
cloudflare_zone_id    = "<from mrtis.com zone overview page>"
EOF
chmod 600 terraform.tfvars

cat > .gitignore <<EOF
terraform.tfvars
kubeconfig
.terraform/
*.tfstate
*.tfstate.backup
EOF

terraform init
terraform plan
terraform apply       # ~2 minutes total: ~90s cluster, then helm releases
```

### 4.9 Cloudflare API token scopes

When creating the Cloudflare API token at
https://dash.cloudflare.com/profile/api-tokens, use the "Custom token" template
with these scopes:

| Permission                           | Resource     |
| ------------------------------------ | ------------ |
| `Account → Cloudflare Tunnel → Edit` | Your account |
| `Zone → DNS → Edit`                  | `mrtis.com`  |
| `Zone → Zone → Read`                 | `mrtis.com`  |

---

## 5. kubectl access

### 5.1 The challenge

Civo's kube API endpoint (`https://<public-ip>:6443`) is **publicly reachable
on the internet by default**. Authentication via the kubeconfig is the only
wall. Threats:

- Automated scanners (TeamTNT, Kinsing, Hildegard) probe `:6443` across the
  internet looking for misconfigured clusters
- Pre-auth CVEs in `kube-apiserver` are occasional
- A leaked kubeconfig + reachable API = full cluster compromise (crypto miners,
  secrets exfiltration, RBAC backdoors, host escape via privileged pods)

### 5.2 Mitigation: lock the API to your IP via firewall

In `cluster.tf`, add a rule allowing port 6443 only from your IP. **But**
your home IP almost certainly rotates (most French ISPs do).

### 5.3 Recommended: Tailscale exit node

Run [Tailscale](https://tailscale.com) on your laptop and on a tiny VPS
(Hetzner CX22 ~€4/mo or OVH Starter ~€4/mo) configured as a Tailscale exit
node. The VPS gets a static public IP. Your laptop's outbound traffic to the
kube API egresses through that VPS.

Effect:

- Civo firewall only needs to allow the VPS IP — never changes
- A stolen laptop without your Tailscale auth cannot reach the kube API
- Tailscale's free tier (100 devices, 3 users) covers this fully

```hcl
# In cluster.tf, add this rule
resource "civo_firewall_rule" "kube_api_via_tailscale" {
  firewall_id = civo_firewall.cluster.id
  protocol    = "tcp"
  start_port  = "6443"
  end_port    = "6443"
  cidr        = ["<your-tailscale-vps-ip>/32"]
  direction   = "ingress"
  action      = "allow"
  label       = "k8s-api"
}
```

### 5.4 Alternative: auto-update firewall rule script

If you don't want a separate VPS, this script updates the firewall rule
to your current IP. Run it whenever `kubectl` times out:

```bash
#!/usr/bin/env bash
# ~/bin/civo-fix-myip
set -euo pipefail

CIVO_TOKEN="$(pass show civo/api-token)"
FIREWALL_ID="<from terraform output>"
RULE_LABEL="k8s-api"
NEW_IP="$(curl -s ifconfig.me)/32"

RULE_ID=$(civo firewall rule ls "$FIREWALL_ID" -o json \
  | jq -r ".[] | select(.label == \"$RULE_LABEL\") | .id")

[ -n "$RULE_ID" ] && civo firewall rule remove "$FIREWALL_ID" "$RULE_ID"

civo firewall rule create "$FIREWALL_ID" \
  --protocol tcp --startport 6443 --endport 6443 \
  --cidr "$NEW_IP" --direction ingress --action allow \
  --label "$RULE_LABEL"

echo "Updated kube-api firewall to $NEW_IP"
```

### 5.5 Connecting kubectl

Terraform writes the kubeconfig to `./kubeconfig` (gitignored). Use it:

```bash
export KUBECONFIG=$PWD/kubeconfig
kubectl get nodes              # should show 1 node "Ready"
kubectl get pods -A            # k3s system + traefik + cert-manager + cloudflared
```

To merge into your default kubeconfig:

```bash
KUBECONFIG=~/.kube/config:$PWD/kubeconfig kubectl config view --flatten > ~/.kube/config-new
mv ~/.kube/config-new ~/.kube/config
kubectl config use-context side-projects
```

### 5.6 Defense-in-depth checklist

Even with the firewall locked:

1. Don't commit kubeconfigs (already in `.gitignore`)
2. Don't use `cluster-admin` for apps. Create a `deploy` ServiceAccount with
   minimal RBAC for CI
3. Enable NetworkPolicies (use `cni = "cilium"` in `cluster.tf`)
4. Audit anonymous access: `kubectl auth can-i --list --as=system:anonymous`
   should return basically nothing
5. Set Pod Security admission on namespaces:
   `pod-security.kubernetes.io/enforce: baseline`

---

## 6. Cloudflare domain → pods

### 6.1 What cloudflared is

A small Go daemon that runs **inside your cluster** and opens **persistent
outbound connections** to Cloudflare's edge (4 connections by default, over
QUIC/UDP 7844, falling back to HTTPS/TCP 443).

When a user requests `foo.mrtis.com`:

1. Browser resolves the CNAME to `<tunnel-id>.cfargotunnel.com`, which points
   at Cloudflare's edge
2. Browser does TLS to Cloudflare (CF-issued cert, since `foo.mrtis.com` is
   covered by free Universal SSL)
3. Cloudflare routes the request through one of the open tunnel connections
4. cloudflared receives, forwards to in-cluster Traefik via the catch-all
   ingress rule
5. Traefik matches on `Host(\`foo.mrtis.com\`)`, routes to the Service, then Pod
6. Response goes back the same path

### 6.2 Why outbound-only matters

The cluster's firewall doesn't need any inbound rules for this to work.
Every firewall and NAT allows outbound by default. cloudflared exploits this
asymmetry: connection initiated from inside, used bidirectionally afterwards.

Same fundamental mechanism as SSH `-R` reverse tunnels, ngrok, frp, Tailscale.
Different branding, identical pattern.

### 6.3 Cloudflare-side token

Generate at the Cloudflare Zero Trust dashboard (handled by Terraform in
`cloudflare.tf`). Stored in a Kubernetes Secret, mounted as env var to the
cloudflared pod.

Treat as bearer auth — anyone with the token can establish a tunnel claiming
to be you. Rotate via `cloudflare_zero_trust_tunnel_cloudflared_token` resource
recreation if leaked.

### 6.4 Watching the tunnel

```bash
kubectl logs -n cloudflared -l app.kubernetes.io/name=cloudflared --tail=50

# Successful boot looks like:
# Connection <id> registered with protocol: quic
# Registered tunnel connection ... (4 lines, one per replica × 4 conns)
```

The Cloudflare Zero Trust dashboard (Networks → Tunnels) also shows tunnel
health and per-connection POP locations.

---

## 7. Subdomains

### 7.1 The Universal SSL constraint

Cloudflare's free Universal SSL covers:

- ✅ Apex: `mrtis.com`
- ✅ 1-level subdomains: `foo.mrtis.com`, `api-foo.mrtis.com`, `bar.mrtis.com`
- ❌ 2-level subdomains: `api.foo.mrtis.com`, `staging.api.mrtis.com`

A 2-level subdomain through cloudflared will fail TLS handshake at the edge
with `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`.

Workarounds (ranked):

| Option                                                        | Cost                              | Verdict                            |
| ------------------------------------------------------------- | --------------------------------- | ---------------------------------- |
| Flatten: `api.foo.mrtis.com` → `api-foo.mrtis.com`            | $0                                | ✅ recommended                     |
| Path-based: `foo.mrtis.com/api` instead of separate subdomain | $0                                | ✅ also good (see 7.4)             |
| Advanced Certificate Manager add-on                           | $10/mo + Pro plan $20/mo = $30/mo | ❌ not worth it                    |
| DNS-only (gray cloud) + Traefik handles cert                  | $0                                | ❌ loses Cloudflare proxy benefits |
| Business plan with Custom Hostnames                           | $200/mo                           | ❌ lol no                          |

### 7.2 Pattern: cloudflared catch-all + Traefik routes by Host

Single cloudflared ingress rule sends everything to Traefik. Traefik matches
on `Host` header.

Adding a new app = create one IngressRoute manifest, append to `subdomains`
list in tfvars, `terraform apply`. No tunnel config changes.

### 7.3 IngressRoute per app

```yaml
# foo/ingressroute.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
    name: foo
    namespace: foo
spec:
    entryPoints:
        - web
    routes:
        - match: Host(`foo.mrtis.com`)
          kind: Rule
          services:
              - name: foo
                port: 80
          middlewares:
              - name: ratelimit
                namespace: traefik
```

Repeat for `api-foo`, `bar`, `baz` with their own match strings, namespaces,
service names.

### 7.4 Path-based as alternative to subdomain

For tightly-coupled API + frontend, prefer one hostname with paths:

```yaml
spec:
    routes:
        - match: Host(`foo.mrtis.com`) && PathPrefix(`/api`)
          kind: Rule
          services:
              - name: api-foo
                port: 8080
          middlewares:
              - name: strip-api-prefix
              - name: api-cors
        - match: Host(`foo.mrtis.com`)
          kind: Rule
          services:
              - name: foo
                port: 80
```

Benefits: no second-level subdomain SSL problem, no CORS preflight (same
origin), simpler DNS.

### 7.5 Adding a fifth app, end-to-end

```bash
# 1. Update Terraform
# Edit terraform.tfvars: subdomains = ["foo", "api-foo", "bar", "baz", "qux"]
terraform apply       # creates the new CNAME

# 2. Deploy the app
kubectl apply -f qux/    # Deployment + Service + IngressRoute

# 3. Test
curl -I https://qux.mrtis.com
```

Traefik picks up the new IngressRoute via CRD watcher within ~5 seconds.
cloudflared doesn't need to know — it forwards everything regardless.

### 7.6 Shared middlewares

Define once in the `traefik` namespace, reference from any IngressRoute:

```yaml
---
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata: { name: ratelimit, namespace: traefik }
spec:
    rateLimit:
        average: 100
        burst: 200
---
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata: { name: api-cors, namespace: traefik }
spec:
    headers:
        accessControlAllowOriginList:
            - https://foo.mrtis.com
        accessControlAllowMethods: [GET, POST]
        accessControlMaxAge: 100
```

---

## 8. Verification checklist

After `terraform apply` completes:

- [ ] `civo quota show` displays the lowered values
- [ ] Virtual card with €30/mo limit is the active payment method
- [ ] Billing alert at $10 is configured
- [ ] `terraform.tfvars`, `kubeconfig`, `.terraform/` all gitignored
- [ ] `kubectl get nodes` shows 1 node Ready
- [ ] `kubectl get pods -A` shows traefik, cert-manager, cloudflared all Running
- [ ] `kubectl logs -n cloudflared -l app.kubernetes.io/name=cloudflared` shows
      "Registered tunnel connection" 8 times (2 replicas × 4 connections)
- [ ] Cloudflare dashboard → Zero Trust → Networks → Tunnels shows tunnel as
      Healthy
- [ ] DNS records visible in Cloudflare zone overview, all proxied (orange
      cloud)
- [ ] Test a deployment + IngressRoute responds at `https://foo.mrtis.com`
- [ ] Civo firewall has zero inbound rules from `0.0.0.0/0`
- [ ] Kube API rule limited to Tailscale VPS IP or your auto-update script
      target

---

## 9. Things to remember later

- **Total cost should be exactly $5.43/mo** for the single node, plus optionally
  ~€4/mo if you spin up a Hetzner/OVH VPS as Tailscale exit node
- If anything pushes the bill above $10, the billing alert fires before quota
  is hit
- New apps: append to `subdomains` list, write IngressRoute, deploy. Three
  files, no infra changes.
- Multi-arch images aren't needed — `g4s.kube.small` is x86_64
- k3s upgrades happen via `civo_kubernetes_cluster.kubernetes_version` —
  bump the version to trigger a managed upgrade
- Cloudflare API token rotates: regenerate in dashboard, update tfvars,
  `terraform apply` to roll the tunnel token
- Civo support is responsive (~24h) for quota changes
