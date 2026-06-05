# Reads TAILSCALE_OAUTH_CLIENT_ID / TAILSCALE_OAUTH_CLIENT_SECRET / TAILSCALE_TAILNET
# from the operator's environment when applied locally.
provider "tailscale" {}


# Uses TAILSCALE_OAUTH_CLIENT_ID / TAILSCALE_OAUTH_CLIENT_SECRET / TAILSCALE_TAILNET under the hood
resource "tailscale_acl" "policy" {
  overwrite_existing_content = true

  acl = jsonencode({
    tagOwners = {
      # Registrar identity: the ONLY tag held by the CI/bootstrap OAuth client.
      # An OAuth client is a *tagged* (non-human) identity and is NOT a member of
      # autogroup:admin, so it can only assign a tag that is owned by one of its
      # own tags (see tailscale#15456 and
      # https://tailscale.com/docs/features/tags#apply-a-tag-from-another-tag).
      # A dedicated registrar tag — which owns the device tags below — lets the
      # client mint keys carrying those tags, while the device tags themselves
      # own nothing: a compromised runner cannot register or retag further
      # devices (least privilege).
      "tag:register" = ["autogroup:admin"]
      "tag:monsieurtis" = ["autogroup:admin", "tag:register"]
      "tag:ci" = ["autogroup:admin", "tag:register"]
    }
    autoApprovers = {
      # `autoApprovers.exitNode` means devices tagged `tag:monsieurtis` are
      # usable as exit nodes the moment they register — no admin click-through.
      exitNode = ["tag:monsieurtis"]
    }
    acls = [
      { action = "accept", src = ["autogroup:member"], dst = ["*:*"] },
      { action = "accept", src = ["tag:ci"], dst = ["*:*"] }
    ]
    ssh = [
      {
        action = "accept"
        src    = ["autogroup:member"]
        dst    = ["tag:monsieurtis"]
        users  = ["autogroup:nonroot", "root"]
      }
    ]
  })
}
