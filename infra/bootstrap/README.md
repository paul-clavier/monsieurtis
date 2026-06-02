# `infra/bootstrap` — Tofu state backend + tailnet ACL

One-time, operator-run root that provisions the Civo Object Store bucket holding
the state for every other root (`bootstrap/`, `cloud/`, `identity/`) **and** the
tailnet ACL (tag definitions + access policy). It is **not** part of CI/CD.

Two reasons resources live here rather than in `cloud/`:

- **State backend**: chicken-and-egg — needs to exist before any other root can
  init against it.
- **Tailnet ACL**: chicken-and-egg with CI — a CI run cannot mint a Tailscale
  key for a tag the deployed ACL does not yet declare. Owning the ACL here
  means the operator re-applies before pushing workflow changes that depend
  on a new tag.

Bootstrap runs with local state first, then migrates its own state into the
bucket it just created (self-hosted).

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

## Notes

- The Civo Object Store minimum size is 500 GB (`max_size_gb`); state files are
  tiny but you pay for the floor.
- If `init`/`plan` fails with a checksum error against Civo's Ceph endpoint, set
  `AWS_REQUEST_CHECKSUM_CALCULATION=when_required` and
  `AWS_RESPONSE_CHECKSUM_VALIDATION=when_required`.
- Keep this bucket in the same region as the cluster (`FRA1`).
