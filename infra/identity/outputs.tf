output "login_host" {
  description = "Public hostname serving Kratos public API + Crocus UI (human-facing identity)."
  value       = local.login_host
}

output "oauth_host" {
  description = "Public hostname serving Hydra OAuth2 endpoints. This is also the OIDC `iss` claim in issued tokens, and the host that publishes /.well-known/openid-configuration + /.well-known/jwks.json."
  value       = local.oauth_host
}

output "oauth_client_secrets" {
  description = "Map of confidential-client client_id → K8s Secret name (in the identity namespace) holding its credentials. Public (PKCE/SPA) clients have no entry — they hold no secret."
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
