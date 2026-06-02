output "auth_host" {
  description = "Public hostname serving Kratos public API + Crocus UI."
  value       = local.auth_host
}

output "id_host" {
  description = "Public hostname serving Hydra OAuth2 endpoints."
  value       = local.id_host
}

output "oauth_client_secrets" {
  description = "Map of OAuth2 client_id → Kubernetes Secret name holding the credentials. Consumed by each app's deployment."
  value       = { for k, s in kubernetes_secret.client_credentials : k => s.metadata[0].name }
}

output "kratos_admin_url" {
  description = "Cluster-internal Kratos admin API URL. NEVER expose publicly."
  value       = local.kratos_admin_svc
}

output "hydra_admin_url" {
  description = "Cluster-internal Hydra admin API URL. NEVER expose publicly."
  value       = local.hydra_admin_svc
}

output "keto_read_url" {
  description = "Cluster-internal Keto read API URL — used by apps for permission checks."
  value       = local.keto_read_svc
}

output "keto_write_url" {
  description = "Cluster-internal Keto write API URL — used by Crocus admin grant flow."
  value       = local.keto_write_svc
}
