# Reads TAILSCALE_OAUTH_CLIENT_ID / TAILSCALE_OAUTH_CLIENT_SECRET / TAILSCALE_TAILNET
# from the operator's environment when applied locally.
provider "tailscale" {}


# Uses TAILSCALE_OAUTH_CLIENT_ID / TAILSCALE_OAUTH_CLIENT_SECRET / TAILSCALE_TAILNET under the hood
resource "tailscale_acl" "policy" {
  overwrite_existing_content = true

  acl = jsonencode({
    tagOwners = {
      # Tag used for the Civo exit-node VPS
      "tag:monsieurtis" = ["autogroup:admin"]
      # Applied to ephemeral GitHub Actions runners that route egress through
      # the tag:monsieurtis exit node to reach the cluster API.
      "tag:ci" = ["autogroup:admin"]
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
