output "repository_node_id" {
  description = "Node ID of the managed repository. Useful when wiring this repo into other GitHub APIs (e.g. GraphQL)."
  value       = github_repository.this.node_id
}

output "deployment_ruleset_id" {
  description = "ID of the ruleset protecting *_main deployment branches."
  value       = github_repository_ruleset.deployment_branches.id
}
