# Reads GITHUB_TOKEN from the environment. The token must be a fine-grained PAT
# with Administration:write, Contents:read, Metadata:read on the target repo.
provider "github" {
  owner = var.github_owner
}
