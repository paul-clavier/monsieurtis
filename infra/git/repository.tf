# Adopts the existing repo via `tofu import github_repository.this monsieurtis`.
# `archive_on_destroy` is a safety net: a `tofu destroy` archives the repo
# instead of deleting it, which is reversible.
resource "github_repository" "this" {
  name       = var.repository_name
  visibility = "public"

  allow_squash_merge          = true
  allow_rebase_merge          = true
  allow_merge_commit          = false
  allow_auto_merge            = false
  allow_update_branch         = false
  delete_branch_on_merge      = true
  web_commit_signoff_required = false

  squash_merge_commit_title   = "PR_TITLE"
  squash_merge_commit_message = "COMMIT_MESSAGES"

  has_issues      = false
  has_projects    = false
  has_wiki        = false
  has_discussions = false

  archive_on_destroy = true
}
