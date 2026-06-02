variable "civo_region" {
  description = "Civo region the cluster lives in."
  type        = string
  default     = "FRA1"
}

variable "cluster_name" {
  description = "Name of the managed k3s cluster as shown in the Civo dashboard. Must match infra/cloud's cluster_name."
  type        = string
  default     = "monsieurtis"
}

variable "namespace" {
  description = "Kubernetes namespace for the identity stack."
  type        = string
  default     = "identity"
}

variable "domain" {
  description = "Base apex domain (e.g. monsieurtis.com). Subdomains derived: auth.<domain>, id.<domain>."
  type        = string
}

variable "postgres_password" {
  description = "Password for the postgres `postgres` superuser. Used by all three Ory services."
  type        = string
  sensitive   = true
}

variable "postgres_storage_size" {
  description = "PVC size for the shared Postgres. Must fit inside the Civo volume quota."
  type        = string
  default     = "5Gi"
}

variable "kratos_cookie_secret" {
  description = "Kratos session cookie signing secret (>=32 chars)."
  type        = string
  sensitive   = true
}

variable "kratos_cipher_secret" {
  description = "Kratos cipher secret for secret rotation (>=32 chars, exactly 32 for AES-256)."
  type        = string
  sensitive   = true
}

variable "hydra_system_secret" {
  description = "Hydra system secret for JWK/cookie encryption (>=16 chars)."
  type        = string
  sensitive   = true
}

variable "google_oauth_client_id" {
  description = "Google Cloud OAuth 2.0 client ID, used by Kratos as a social OIDC provider."
  type        = string
  sensitive   = true
}

variable "google_oauth_client_secret" {
  description = "Google Cloud OAuth 2.0 client secret."
  type        = string
  sensitive   = true
}

variable "smtp_connection_uri" {
  description = "SMTP DSN for Kratos courier (e.g. smtps://user:pass@host:465). Use `smtp://mailslurper.identity.svc:1025?disable_starttls=true` for dev."
  type        = string
  default     = "smtp://mailslurper.identity.svc.cluster.local:1025?disable_starttls=true"
  sensitive   = true
}

variable "smtp_from_address" {
  description = "From address used on outgoing identity emails."
  type        = string
  default     = "no-reply@monsieurtis.com"
}

variable "crocus_image" {
  description = "Container image for the Crocus app (login/consent UI). Built+pushed from apps/crocus."
  type        = string
  default     = "ghcr.io/monsieurtis/crocus:latest"
}

variable "initial_admin_kratos_id" {
  description = "Kratos identity ID of the first admin. Leave empty on first apply (no admin tuple seeded); fill in after the first user registers and re-apply."
  type        = string
  default     = ""
}

variable "registered_apps" {
  description = "OAuth2 clients to register in Hydra. The `redirect_uris` are app callback URLs."
  type = map(object({
    redirect_uris = list(string)
    scopes        = optional(string, "openid offline_access profile email")
  }))
  default = {
    linlin = {
      redirect_uris = ["https://api-linlin.monsieurtis.com/auth/callback"]
    }
    harley = {
      redirect_uris = ["https://harley.monsieurtis.com/auth/callback"]
    }
  }
}

# Chart versions are pinned to avoid surprise upgrades.
variable "chart_versions" {
  description = "Helm chart versions for the identity stack."
  type = object({
    postgresql = string
    kratos     = string
    hydra      = string
    keto       = string
  })
  default = {
    postgresql = "16.7.30"
    kratos     = "0.59.1"
    hydra      = "0.62.0"
    keto       = "0.45.0"
  }
}
