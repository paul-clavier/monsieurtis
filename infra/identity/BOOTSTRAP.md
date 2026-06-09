# Bootstrap Identity project

End-to-end guide to bring up `infra/identity` (Ory Kratos + Hydra + Keto + Crocus on the Civo k3s cluster) from nothing: external accounts, secrets, then the first apply.

Assumes [infra/cloud](../cloud/BOOTSTRAP.md) is already bootstrapped — the k3s cluster, state backend (Civo Object Store), Cloudflare DNS, and Tailscale exit node must all exist before identity can plan.

---

## Part 1 — Prerequisites

### 1. External accounts

- [ ] **Civo, Cloudflare, Tailscale, 1Password, GitHub** — already set up via [infra/cloud/BOOTSTRAP.md](../cloud/BOOTSTRAP.md). The shared secrets (`CIVO_TOKEN`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) are reused here, so this guide does not re-create them.
- [ ] **Google account `tis.monsieurtis@gmail.com`** — the canonical brand mailbox. Used to sign into Google Cloud and Resend, and as the destination for `support@monsieurtis.com` forwards (see step 2).
- [ ] **Google Cloud** — project owned by `tis.monsieurtis@gmail.com`, with the OAuth consent screen configured (step 3). Free tier is fine; the OAuth APIs are free regardless.
- [ ] **Resend** — `resend.com`. Free tier (3,000/month, 100/day) does **not** require a credit card. Sign up with `tis.monsieurtis@gmail.com` for consistency.

### 2. Email infrastructure for `support@monsieurtis.com`

Owning `monsieurtis.com` on Cloudflare gives us DNS, not email. To get a working `support@monsieurtis.com` address — both for human-readable contact and as the From address on Kratos verification / recovery emails — we stitch together a free stack:

```
Inbound:  support@monsieurtis.com  ──►  Cloudflare Email Routing  ──►  tis.monsieurtis@gmail.com
Outbound: Kratos  (or Gmail "Send mail as")  ──►  Resend SMTP  ──►  recipient
```

- [ ] **Create the Google account `tis.monsieurtis@gmail.com`** at `accounts.google.com`. This is the only "real" mailbox; everything else funnels into it.
- [ ] **Roll out Cloudflare Email Routing** — managed in Terraform in [infra/cloud/cloudflare.tf](../cloud/cloudflare.tf) (resources `cloudflare_email_routing_settings`, `_dns`, `_address`, `_rule`, `_catch_all`). Defaults forward `support@monsieurtis.com` and a catch-all to `tis.monsieurtis@gmail.com`. Open a PR against `infra/cloud`, merge, and let `tofu-cd` apply.
- [ ] **Verify the destination mailbox** — after the first apply, Cloudflare emails `tis.monsieurtis@gmail.com` a confirmation link. Click it, otherwise forwarding silently drops every message. Status should flip to "Verified" under Cloudflare → Email → Email Routing → Destination addresses.
- [ ] **Sign up for Resend** with `tis.monsieurtis@gmail.com`.
- [ ] **Associate `monsieurtis.com` with Resend**:
    - Resend → **Domains → Add domain → `monsieurtis.com`**. Resend gives you SPF / DKIM / DMARC DNS records.
    - Add them in Cloudflare DNS (proxied **off** — these are mail records, not HTTP).
    - ⚠️ **SPF merge**: `cloudflare_email_routing_dns` already added an SPF record (`v=spf1 include:_spf.mx.cloudflare.net ~all`). A domain may only have one SPF `TXT` record — edit the existing one in the Cloudflare dashboard to merge Resend's include, e.g. `v=spf1 include:_spf.mx.cloudflare.net include:_spf.resend.com ~all`. (Terraform does not own the record contents, so no drift.)
    - Wait for Resend's domain status to flip to **Verified** (< 5 min once DNS propagates).
- [ ] (Optional) Configure Gmail **"Send mail as"** inside `tis.monsieurtis@gmail.com` using Resend SMTP (`smtp.resend.com:465`, username `resend`, password = a Resend API key from step 4). Lets you reply _from_ `support@monsieurtis.com` directly inside Gmail.

### 3. Google OAuth 2.0 client

Kratos uses Google as a social sign-in provider.

- [ ] Google Cloud Console → **APIs & Services → OAuth consent screen**: configure an External app (or Internal if you have a Workspace). Use `tis.monsieurtis@gmail.com` as the User support email and Developer contact — this is what users see on the consent screen (displaying `support@monsieurtis.com` there would require a Google Group or Workspace). Publish it once you're happy with the consent screen — unpublished apps are limited to 100 test users.
- [ ] **APIs & Services → Credentials → Create credentials → OAuth client ID**:
    - Application type: **Web application**
    - Authorized redirect URI: `https://login.monsieurtis.com/self-service/methods/oidc/callback/google`
- [ ] Capture **Client ID** and **Client secret** — the secret is shown once.

### 4. Resend API key for Kratos SMTP

With `monsieurtis.com` verified in Resend (step 2), create the API key Kratos will use as its SMTP transport:

- [ ] Resend → **API Keys → Create API key**, scope `Sending access`, domain `monsieurtis.com`. Capture the key (shown once); it starts with `re_`.
- [ ] The Kratos SMTP DSN format is:
    ```
    smtps://resend:<RESEND_API_KEY>@smtp.resend.com:465
    ```
    (Resend's SMTP gateway expects the literal username `resend` and the API key as the password.)

### 5. Generate Ory random secrets

All four must be cryptographically random. Generate them once and store them in 1Password — losing `kratos_cipher_secret` after the first apply makes existing identity recovery codes / verification tokens undecodable.

```bash
# Cookie signing — >=32 chars
openssl rand -base64 32

# Cipher — exactly 32 bytes (AES-256)
openssl rand -hex 16

# Hydra system secret — >=16 chars
openssl rand -base64 32

# Postgres superuser password
openssl rand -base64 24
```

### 6. 1Password vault items

Add to the existing `MonsieurTis` vault (Password type, value in the `password` field). The sync script ([scripts/sync-1password-with-git.sh](../../scripts/sync-1password-with-git.sh)) matches each GitHub secret `FOO` against a vault item titled `FOO` or `prefix.FOO` (suffix after the last dot must be unique).

| Title                               | Value                                                 |
| ----------------------------------- | ----------------------------------------------------- |
| `ory.ORY_POSTGRES_PASSWORD`         | postgres password from step 5                         |
| `ory.KRATOS_COOKIE_SECRET`          | cookie secret from step 5                             |
| `ory.KRATOS_CIPHER_SECRET`          | cipher secret from step 5 (exactly 32 chars)          |
| `ory.HYDRA_SYSTEM_SECRET`           | hydra secret from step 5                              |
| `google.GOOGLE_OAUTH_CLIENT_ID`     | from step 3                                           |
| `google.GOOGLE_OAUTH_CLIENT_SECRET` | from step 3                                           |
| `resend.SMTP_CONNECTION_URI`        | `smtps://resend:<RESEND_API_KEY>@smtp.resend.com:465` |

### 7. Sync 1Password → GitHub secrets

```bash
eval $(op signin)
make sync-secrets
```

Expect the seven new secrets above to show up alongside the shared ones already synced for cloud. Resolve any `[missing]` / `[ambiguous]` reports before continuing.

### 8. Refresh the provider lockfile

`tofu init -lockfile=readonly` in CI needs `linux_amd64` hashes.

```bash
cd infra/identity
tofu providers lock -platform=linux_amd64 -platform=darwin_arm64
```

Commit the updated [infra/identity/.terraform.lock.hcl](.terraform.lock.hcl).

---

## Part 2 — Deploy

```bash
# 1) Open a PR to main with the workflow change + lockfile + any identity edits.
git checkout -b infra/identity-setup
git push -u origin infra/identity-setup
gh pr create --base main --title "feat: bootstrap identity"
# tofu-ci.yml posts a sticky `tofu plan` comment. Review, merge.

# 2) Fast-forward the deploy branch.
git checkout main && git pull
git checkout -b infra_identity_main         # or: git switch infra_identity_main
git push -u origin infra_identity_main
# tofu-cd.yml fires on push; the `production` environment can require approval.
```

The apply takes ~6–8 minutes (Postgres PVC creation + four Helm releases + cert issuance).

### Post-deploy sanity checks

Route through the exit node first (only IP the cluster firewall accepts):

```bash
tailscale up --exit-node=monsieurtis-exit --exit-node-allow-lan-access

kubectl -n identity get pods               # postgres + kratos + hydra + keto + crocus, all Running
kubectl -n identity get ingress            # login.monsieurtis.com, oauth.monsieurtis.com

# End-to-end mail check: trigger a verification flow from login.monsieurtis.com/registration
# and watch the Resend dashboard logs.
```

### Seed the owner

After the first apply, no owner identity exists yet (the reconcile Job
logs "Owner not yet registered — skipping owner tuples"). To finish
bootstrap:

1. Visit `https://login.monsieurtis.com/registration` and sign in with
   Google using the email hardcoded as `local.owner_email` in
   `infra/identity/keto.tf`.
2. Re-run `tofu apply`. The reconcile Job resolves the owner by email and
   writes the owner tuples (Crocus admin + every gated app).

---

## Tear-down

```bash
cd infra/identity
tofu destroy
```

Drops the four Helm releases and the namespace. Postgres data goes with the PVC unless it was retained — back up beforehand if any identities are worth keeping.

Resend, Google OAuth client, and 1Password items survive `tofu destroy` and can be reused on the next bootstrap.
