# Protects every branch matching `*_main` (e.g. infra_cloud_main,
# infra_identity_main, infra_git_main). The default branch `main` is
# intentionally NOT covered.
#
# `ci-gate` is the single aggregator job in tofu-ci.yml that fans matrix
# results into one stable check name. Requiring the per-project matrix names
# (`lint (cloud)`, `plan (identity)`, …) would break merges where
# detect-changes skipped a project.
resource "github_repository_ruleset" "deployment_branches" {
  name        = "deployment-branches"
  repository  = github_repository.this.name
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["refs/heads/*_main"]
      exclude = []
    }
  }

  rules {
    non_fast_forward = true
    deletion         = true

    pull_request {
      required_approving_review_count   = 0
      dismiss_stale_reviews_on_push     = true
      require_code_owner_review         = false
      require_last_push_approval        = false
      required_review_thread_resolution = false
    }

    required_status_checks {
      strict_required_status_checks_policy = false

      required_check {
        context = "ci-gate"
      }
    }
  }
}
