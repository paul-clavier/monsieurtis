# `infra/bootstrap` — Tofu state backend + tailnet ACL

One-time, operator-run root that provisions the Civo Object Store bucket holding
the state for every other root (`bootstrap/`, `cloud/`, `identity/`) **and** the
tailnet ACL (tag definitions + access policy). It is **not** part of CI/CD.

Two reasons resources live here rather than in `cloud/`:

- **State backend**: chicken-and-egg — needs to exist before any other root can
  init against it.
- **Tailnet ACL**: chicken-and-egg with CI — a CI run cannot mint a Tailscale
  key for a tag the deployed ACL does not yet declare (nor for a tag the
  registrar is not yet allowed to assign). Owning the ACL here means the
  operator re-applies before pushing workflow changes that depend on a new tag.

Bootstrap runs with local state first, then migrates its own state into the
bucket it just created (self-hosted).

## Tailnet tag model

The OAuth client used by CI and by `infra/cloud` holds a single **registrar**
tag, `tag:register`, and nothing else. The device tags it needs to stamp are
owned _by_ that registrar tag in `tagOwners`:

```hcl
"tag:register"    = ["autogroup:admin"]              # the OAuth client's only tag
"tag:monsieurtis" = ["autogroup:admin", "tag:register"]  # exit-node VPS
"tag:ci"          = ["autogroup:admin", "tag:register"]  # ephemeral CI runners
```

Why the indirection rather than putting `tag:ci`/`tag:monsieurtis` on the client
directly: an OAuth client is a _tagged, non-human_ identity, so it is not a
member of `autogroup:admin` and may only assign a tag that is owned by one of
its own tags (Tailscale's ["apply a tag from another
tag"](https://tailscale.com/docs/features/tags#apply-a-tag-from-another-tag)
rule; see also tailscale#15456). Routing all delegation through `tag:register`
means:

- the OAuth client config never changes — grant a new capability by adding one
  `tagOwners` line (`"tag:foo" = ["tag:register"]`), not by re-tagging the client;
- the device tags own nothing, so a compromised runner (`tag:ci`) cannot
  register or retag further devices — least privilege.

`autogroup:admin` is kept on the device tags so an operator can still assign them
by hand in the console.

## Run order

```bash
cd infra/bootstrap

# 1. First apply with LOCAL state. Both providers read credentials from env.
export CIVO_TOKEN=...
export TAILSCALE_OAUTH_CLIENT_ID=...
export TAILSCALE_OAUTH_CLIENT_SECRET=...
export TAILSCALE_TAILNET=plclavier@gmail.com
tofu init
tofu apply

# 2. Capture the bucket credentials NOW, while state is still local. Once
#    backend.tf exists, `tofu output` stops working until the backend is
#    initialised, so you must read the keys before creating it.
#    Export them as the AWS_* vars the s3 backend reads, and stash both in
#    1Password (op://infra/civo-state/access_key_id, .../secret_access_key).
export AWS_ACCESS_KEY_ID=$(tofu output -raw access_key_id)
export AWS_SECRET_ACCESS_KEY=$(tofu output -raw secret_access_key)

# 3. Now create backend.tf (below) and migrate the local state into the bucket.
#    The AWS_* vars from step 2 are already in your env. Answer "yes" when
#    prompted to copy the existing state.
tofu init -migrate-state
```

The `backend.tf` to create in step 3:

```hcl
terraform {
  backend "s3" {
    bucket                      = "tf-state-monsieurtis"
    key                         = "bootstrap/terraform.tfstate"
    region                      = "FRA1"
    endpoints                   = { s3 = "https://objectstore.fra1.civo.com" }
    use_path_style              = true
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
  }
}
```

## Rerun

Once the initial run has migrated state into the bucket, subsequent applies
(e.g. adding a tag to the ACL, bumping a provider) are straightforward — the
only twist is that the s3 backend needs the bucket credentials in env _before_
`tofu init` can read remote state, so you can no longer derive them from
`tofu output`. Pull them from 1Password instead:

```bash
cd infra/bootstrap

export CIVO_TOKEN=$(op read "op://MonsieurTis/civo.CIVO_TOKEN/password")
export TAILSCALE_OAUTH_CLIENT_ID=$(op read "op://MonsieurTis/tailscale.TAILSCALE_OAUTH_CLIENT_ID/password")
export TAILSCALE_OAUTH_CLIENT_SECRET=$(op read "op://MonsieurTis/tailscale.TAILSCALE_OAUTH_CLIENT_SECRET/password")
export TAILSCALE_TAILNET=plclavier@gmail.com
export AWS_ACCESS_KEY_ID=$(op read "op://MonsieurTis/civo.object-store.tofu.AWS_ACCESS_KEY_ID/password")
export AWS_SECRET_ACCESS_KEY=$(op read "op://MonsieurTis/civo.object-store.tofu.AWS_SECRET_ACCESS_KEY/password")

tofu init
tofu apply
```

This script can be found at `./run.sh`

## Notes

- The Civo Object Store minimum size is 500 GB (`max_size_gb`); state files are
  tiny but you pay for the floor.
- If `init`/`plan` fails with a checksum error against Civo's Ceph endpoint, set
  `AWS_REQUEST_CHECKSUM_CALCULATION=when_required` and
  `AWS_RESPONSE_CHECKSUM_VALIDATION=when_required`.
- Keep this bucket in the same region as the cluster (`FRA1`).
