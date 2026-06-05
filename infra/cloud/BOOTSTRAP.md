# Bootstrap Cloud project

End-to-end guide to bring up Monsieur Tis `infra/cloud` project from nothing: external accounts, credentials, Tofu state backend, then the Civo cluster + Cloudflare tunnel + Tailscale exit node.

---

## Part 1 — Prerequisites

### 1. External accounts

- [ ] **Civo** (cloud provider) — `dashboard.civo.com`. Add payment method, request quota for ~3 instances + 1 k3s cluster + Object Store in `FRA1` if defaults are tight.
- [ ] **Cloudflare** (DNS + tunnel) — own the apex `monsieurtis.com` zone, with the zone active.
- [ ] **Tailscale** (operator network) — sign up at `login.tailscale.com` with `plclavier@gmail.com`.
- [ ] **1Password** — Individual plan is enough; needs the `MonsieurTis` vault.
- [ ] **GitHub** — repo with Actions enabled, ability to create environment named `production`.

### 2. Tailscale onboarding

- [ ] Sign in with `plclavier@gmail.com`. The wizard asks for **two devices** to complete onboarding.
- [ ] Add device #1: install Tailscale on your laptop (`brew install --cask tailscale`).
- [ ] Add device #2: install the Tailscale app on your phone, sign in with the same Google account. (Removable afterwards.)
- [ ] Settings → OAuth clients → **Generate OAuth client**:
    - Scopes: `auth_keys:write`, `policy_file:write`, `devices:write`.
    - Tags: **`tag:register` only.** This is a registrar tag that *owns* the
      device tags (`tag:ci`, `tag:monsieurtis`) in the ACL, so the client may
      mint keys carrying them. Do **not** put the device tags directly on the
      client. (Requires `tag:register` to already exist in the deployed ACL —
      run `infra/bootstrap` first; see the tag model in
      [infra/bootstrap/README.md](infra/bootstrap/README.md).)
    - Capture `client_id` and `client_secret` — shown once.
- [ ] Note your **tailnet name** (top-left in the admin console).

### 3. Cloudflare API token

- [ ] Profile → API Tokens → **Create token** with these scopes on `monsieurtis.com`:
    - Account → Cloudflare Tunnel → Edit
    - Zone → DNS → Edit
    - Zone → Zone → Read
- [ ] Capture **Account ID** (right sidebar of any zone overview) and **Zone ID** (zone overview page).

### 4. SSH key for the exit-node VPS

- [ ] Generate a dedicated key:
    ```bash
    ssh-keygen -t ed25519 -f ~/.ssh/monsieurtis -C "monsieurtis"
    ```
    Keep the private key safe; the public key goes into 1Password.

### 5. 1Password vault items

Create these items in the `MonsieurTis` vault (Password type, value in the `password` field, or for the SSH key in `notesPlain`):

| Title                                          | Value                                      |
| ---------------------------------------------- | ------------------------------------------ |
| `civo.CIVO_TOKEN`                              | Civo Personal Token (dashboard → Security) |
| `civo.object-store.tofu.AWS_ACCESS_KEY_ID`     | filled in after bootstrap (step 8)         |
| `civo.object-store.tofu.AWS_SECRET_ACCESS_KEY` | filled in after bootstrap (step 8)         |
| `cloudflare.CLOUDFLARE_API_TOKEN`              | from step 3                                |
| `cloudflare.CLOUDFLARE_ACCOUNT_ID`             | from step 3                                |
| `cloudflare.CLOUDFLARE_ZONE_ID`                | from step 3                                |
| `tailscale.TAILSCALE_OAUTH_CLIENT_ID`          | from step 2                                |
| `tailscale.TAILSCALE_OAUTH_CLIENT_SECRET`      | from step 2                                |
| `tailscale.TAILSCALE_TAILNET`                  | tailnet name from step 2                   |
| `admin.ADMIN_SSH_PUBLIC_KEY`                   | contents of `~/.ssh/monsieurtis.pub`       |

> **Naming rule:** the sync script (`scripts/sync-1password-with-git.sh`) matches a GitHub secret `FOO_BAR` against vault items titled exactly `FOO_BAR` or ending in `.FOO_BAR`. The suffix after the last `.` must be unique across the vault.

### 6. GitHub repository

- [ ] Settings → Environments → New environment: **`production`**. Optionally add yourself as a required reviewer so applies pause for approval.
- [ ] Settings → Actions → General: ensure Actions are enabled and `Read and write permissions` is granted to `GITHUB_TOKEN`.

### 7. Bootstrap the state backend (one-time, runs locally)

Provisions the Civo Object Store bucket that holds every other root's state. Walkthrough in [infra/bootstrap/README.md](infra/bootstrap/README.md). Short version:

```bash
cd infra/bootstrap
export CIVO_TOKEN=$(op read "op://MonsieurTis/civo.CIVO_TOKEN/password")
tofu init                                          # local state
tofu apply
# Capture credentials BEFORE backend migration:
op item edit "civo.object-store.tofu.AWS_ACCESS_KEY_ID" \
  password="$(tofu output -raw access_key_id)"
op item edit "civo.object-store.tofu.AWS_SECRET_ACCESS_KEY" \
  password="$(tofu output -raw secret_access_key)"
export AWS_ACCESS_KEY_ID=$(tofu output -raw access_key_id)
export AWS_SECRET_ACCESS_KEY=$(tofu output -raw secret_access_key)
tofu init -migrate-state                           # state → bucket
```

### 8. Sync 1Password → GitHub secrets

```bash
eval $(op signin)
gh auth login                                      # if not already
make sync-secrets
```

Expect ~10 secrets synced. If anything reports `[missing]` or `[ambiguous]`, fix vault titles to match the [naming rule](#5-1password-vault-items) above and re-run.

### 9. Refresh provider lockfile

The lockfile must include `linux_amd64` hashes so `ubuntu-latest` runners can `tofu init -lockfile=readonly`.

```bash
cd infra/cloud
tofu providers lock -platform=linux_amd64 -platform=darwin_arm64
```

Commit the updated `infra/cloud/.terraform.lock.hcl`.

---

## Part 2 — What's in `/infra`

### Directory layout

```
infra/
├── bootstrap/    # Civo Object Store bucket holding tofu state. One-time, local-state then migrated.
└── cloud/        # Everything that lives "in production": k3s cluster, tunnel, platform, exit node.
```

`infra/identity/` will hold the Kratos + Hydra + Postgres stack on the cluster. Out of scope for this setup.

### `infra/bootstrap/`

State backend **and** tailnet ACL, applied once by an operator. Two chicken-and-egg
problems solved here: (a) the state bucket is created with local state and then
migrates its own state into itself, and (b) the ACL must declare any tag a CI run
will request _before_ the workflow that requests it runs — owning the ACL here
forces the order. Never touched by CI/CD.

Key files:

- [`main.tf`](infra/bootstrap/main.tf) — `civo_object_store` + `civo_object_store_credential`.
- [`tailscale.tf`](infra/bootstrap/tailscale.tf) — `tailscale_acl` (tag owners, autoApprovers, ssh).
- [`outputs.tf`](infra/bootstrap/outputs.tf) — exposes the AWS-style keys for the S3 backend in other roots.
- [`backend.tf`](infra/bootstrap/backend.tf) — points the bootstrap root at itself once migrated.

### `infra/cloud/`

The single Tofu root for everything that needs to be running for `monsieurtis.com` to serve traffic. Applied on every push to the `infra_cloud_main` branch via [tofu-cd.yml](.github/workflows/tofu-cd.yml).

| File                                                     | Purpose                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`versions.tf`](infra/cloud/versions.tf)                 | Pinned providers: civo, cloudflare, kubernetes, helm, tailscale, random, local.                                                                                                                                                                                                                                                       |
| [`providers.tf`](infra/cloud/providers.tf)               | Provider config. `kubernetes` and `helm` read kubeconfig live from `civo_kubernetes_cluster.main`. `tailscale` reads OAuth credentials from env.                                                                                                                                                                                      |
| [`backend.tf`](infra/cloud/backend.tf)                   | S3 backend pointing at the Civo Object Store bucket from `bootstrap`.                                                                                                                                                                                                                                                                 |
| [`variables.tf`](infra/cloud/variables.tf)               | Inputs: region, cluster sizing, exit-node sizing, SSH pubkey, Cloudflare creds, domain, subdomains, helm chart versions.                                                                                                                                                                                                              |
| [`cluster.tf`](infra/cloud/cluster.tf)                   | `civo_firewall.cluster` (default-deny) + `civo_firewall_rule.kube_api` (pinned to the exit node's `/32`) + `civo_kubernetes_cluster.main` (k3s, cilium CNI).                                                                                                                                                                          |
| [`platform.tf`](infra/cloud/platform.tf)                 | Helm releases: Traefik (ClusterIP only), cert-manager (CRDs enabled), cloudflared (2 replicas, registers to the tunnel using its token). Shared `ratelimit` Traefik middleware.                                                                                                                                                       |
| [`cloudflare.tf`](infra/cloud/cloudflare.tf)             | `cloudflare_zero_trust_tunnel_cloudflared` + catch-all ingress to Traefik + per-subdomain proxied CNAMEs in the zone.                                                                                                                                                                                                                 |
| [`network.tf`](infra/cloud/network.tf)                   | **Operator-access path.** `tailscale_tailnet_key` (single-use, 1h, tagged `exit-node`), `civo_ssh_key`, `civo_firewall` (default-deny except UDP/41641 for Tailscale direct connections), `civo_instance` exit-node VPS with cloud-init. The tailnet ACL itself is in [`infra/bootstrap/tailscale.tf`](infra/bootstrap/tailscale.tf). |
| [`cloud-init.sh.tftpl`](infra/cloud/cloud-init.sh.tftpl) | First-boot script on the VPS: enables IP forwarding, installs Tailscale, registers with `--advertise-exit-node --ssh`. The ACL's `autoApprovers` makes it usable immediately.                                                                                                                                                         |
| [`outputs.tf`](infra/cloud/outputs.tf)                   | `kubeconfig` (sensitive), `cluster_id`, `firewall_id`, `tunnel_id`, `exit_node_public_ip`. Also writes `./kubeconfig` (mode 0600, gitignored) for local debugging.                                                                                                                                                                    |

### How the firewall + Tailscale fit together

1. `civo_instance.exit_node` is provisioned and gets a public IPv4.
2. Cloud-init installs Tailscale on the VPS; it registers using the tofu-generated auth key and is auto-approved as an exit node via the ACL.
3. `civo_firewall_rule.kube_api` allowlists `${exit_node.public_ip}/32` on the cluster firewall. Nothing else reaches `:6443`.
4. On the laptop: `tailscale up --exit-node=monsieurtis-exit`. All laptop traffic egresses from the VPS's IP, which is the only one the cluster firewall accepts.
5. `kubectl` works only while the exit node is selected. Without it, requests time out — that's the firewall doing its job.

### `scripts/`

- [`sync-1password-with-git.sh`](scripts/sync-1password-with-git.sh) — scans `.github/workflows/` for `${{ secrets.NAME }}`, matches each against a 1Password vault item whose title is `NAME` or ends in `.NAME`, reads the `password` field, uploads via `gh secret set`. Logs missing / ambiguous matches but never aborts mid-sync.

### `.github/workflows/`

- [`tofu-ci.yml`](.github/workflows/tofu-ci.yml) — PRs to `main` touching `infra/cloud/**` (or `infra/identity/**`) run fmt, validate, tflint, trivy, and `tofu plan`. Plan output posted to the PR as a sticky comment. Fork PRs are skipped (no secrets reach a fork).
- [`tofu-cd.yml`](.github/workflows/tofu-cd.yml) — push to `infra_cloud_main` (or `infra_identity_main`) runs `tofu init/plan/apply` against the matching root. Environment-gated (`production`) so applies can require approval.

Both workflows use `${{ secrets.X }}` directly (no 1Password runtime dependency). Project-specific secrets are gated by ternaries so cloud secrets never enter an identity runner's env (and vice versa).

---

## Deployment

After Part 1 is done:

```bash
git checkout -b infra/cloud-setup
# commit any pending changes; refresh lockfile if needed
git push -u origin infra/cloud-setup
gh pr create --base main --title "feat: cloud + network"
# CI runs plan; review in the PR sticky comment; merge to main

git checkout main && git pull
git checkout -b infra_cloud_main
git push -u origin infra_cloud_main
# tofu-cd.yml fires; ~9 min total
```

After CD completes, grab the exit-node IP from the workflow logs, then:

```bash
tailscale up --exit-node=monsieurtis-exit --exit-node-allow-lan-access
civo kubernetes config monsieurtis --save --merge --switch
kubectl get nodes                                  # 2 Ready
kubectl get pods -A                                # traefik, cert-manager, cloudflared Running
```

If `kubectl get nodes` hangs with the exit node **off**, the firewall is doing its job.

---

## Tear-down / disaster recovery

To rebuild from scratch:

1. (Optional) `tofu destroy` from `infra/cloud` — removes cluster, VPS, tunnel.
2. (Optional) Manually delete the Civo Object Store bucket if also tearing down state.
3. Follow Part 1 from the top.

The OAuth client and SSH key from prior installs can be reused — no need to regenerate unless they were compromised.

## How to add civo k3s cluster to kubectl

Route through the exit node (the only IP the firewall allows to reach :6443)

```sh
tailscale up --exit-node=monsieurtis-exit --exit-node-allow-lan-access
```

Pull the kubeconfig from Civo and merge it into ~/.kube/config

```sh
civo kubernetes config monsieurtis --save
```
