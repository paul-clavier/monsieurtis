# Reads TAILSCALE_OAUTH_CLIENT_ID / TAILSCALE_OAUTH_CLIENT_SECRET / TAILSCALE_TAILNET
# from the operator's environment when applied locally.
provider "tailscale" {}

# Owned by `bootstrap` (operator-applied) rather than `cloud` (CI-applied) so
# that adding a new tag here does not chicken-and-egg with the CI runner that
# needs that tag to reach the cluster: a CI run cannot mint a key for a tag
# the deployed ACL does not yet declare. Operator re-runs `tofu apply` here
# and new tags become usable on the next CI/CD job.
resource "tailscale_acl" "policy" {
  # This repo is the source of truth for the tailnet ACL; opt into stomping
  # any out-of-band edits made via the Tailscale admin console.
  overwrite_existing_content = true

  acl = jsonencode({
    tagOwners = {
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
      # CI runners egress via the exit node; allow them to reach anything.
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
