# `infra/git` — GitHub repo settings

Manages the `paul-clavier/monsieurtis` repo's settings as code: PR/merge
preferences, the branch ruleset that protects the `*_main` deployment branches,
and the `production` environment used by `tofu-ci.yml` / `tofu-cd.yml`.

Managed with [OpenTofu](https://opentofu.org/). Install via `brew install
opentofu` and use the `tofu` CLI.

## Layout

| File              | Purpose                                                            |
| ----------------- | ------------------------------------------------------------------ |
| `versions.tf`     | Required OpenTofu + provider versions                              |
| `providers.tf`    | github provider; reads `GITHUB_TOKEN` from env, owner from var     |
| `backend.tf`      | S3-compatible state backend on Civo Object Store                   |
| `variables.tf`    | `github_owner`, `repository_name`                                  |
| `repository.tf`   | `github_repository` — captures PR/merge preferences                |
| `ruleset.tf`      | `github_repository_ruleset` — protects `refs/heads/*_main`         |
| `environments.tf` | `github_repository_environment "production"` (no protection rules) |
| `outputs.tf`      | repository node id + ruleset id                                    |

## Provider auth

Reads `GITHUB_TOKEN` from the environment. The token must be a **fine-grained
PAT** on `paul-clavier/monsieurtis` with:

- `Administration: write` (rulesets, environments)
- `Contents: read`
- `Metadata: read`

```bash
export GITHUB_TOKEN=$(op read op://infra/github/tf-token)
```

State backend creds come from the same Civo Object Store as the other roots:

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
```

## First-time bootstrap

The repo and the `production` environment already exist. Adopt them before the
first apply so Terraform reconciles rather than tries to create.

```bash
cd infra/git
tofu init
tofu import github_repository.this monsieurtis
tofu import github_repository_environment.production monsieurtis:production
tofu plan       # expect: ruleset created, delete_branch_on_merge → true
tofu apply
```

Then create the deployment branch so future changes flow through `tofu-cd`:

```bash
git checkout -b infra_git_main
git push -u origin infra_git_main
```

`infra_git_main` is itself covered by the `*_main` ruleset, so the deployment
branch is protected by what it deploys.

## What the ruleset enforces

The `deployment-branches` ruleset targets `refs/heads/*_main` and:

- Blocks force-push (`non_fast_forward`)
- Blocks branch deletion (`deletion`)
- Requires a PR to merge (0 approvals; CI is the gate)
- Requires the `ci-gate` check from `tofu-ci.yml` to be green

The default branch `main` is intentionally **not** covered.

## PR preferences

Encoded in `repository.tf`. The only intentional change from current state is
`delete_branch_on_merge = true` — branches that have been merged are deleted
automatically.

## CI/CD

- PRs to `main` or `*_main` touching `infra/git/**` run `tofu-ci.yml`
  (fmt, validate, tflint, trivy, `tofu plan` posted as a PR comment).
- Merging into `infra_git_main` applies this root via `tofu-cd.yml`.

The PAT is stored as the repo secret `GH_TF_TOKEN` and exposed to the workflow
as `GITHUB_TOKEN` only when the `git` project is in scope.

## Out of scope

- Managing Actions secret **values**. They stay in the GitHub UI.
- Required reviewers / deployment branch policy on the `production`
  environment. Worth revisiting when a second admin joins the repo.
