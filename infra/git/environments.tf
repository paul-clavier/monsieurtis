# Declares the existing `production` environment with no protection rules,
# matching the current UI state. Imported via
# `tofu import github_repository_environment.production monsieurtis:production`.
#
# Both tofu-ci.yml (plan job) and tofu-cd.yml (apply job) reference this
# environment to gate access to deploy secrets.
resource "github_repository_environment" "production" {
  repository  = github_repository.this.name
  environment = "production"
}
