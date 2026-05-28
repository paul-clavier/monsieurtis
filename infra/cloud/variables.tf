################################
#             CIVO.            #
################################
variable "civo_region" {
  description = "Civo region code (FRA1, LON1, NYC1, ...)."
  type        = string
  default     = "FRA1"
}

variable "cluster_name" {
  description = "Name of the managed k3s cluster as shown in the Civo dashboard."
  type        = string
  default     = "mrtis"
}

variable "node_size" {
  description = "Civo node size. `g4s.kube.small` is the smallest viable option (1 vCPU / 2 GB / 50 GB)."
  type        = string
  default     = "g4s.kube.small"
}

variable "node_count" {
  description = "Number of nodes in the default pool. Must fit inside the Civo instance quota."
  type        = number
  default     = 2
}

variable "kube_api_allowed_cidr" {
  description = "CIDR allowed to reach the kube API on port 6443. Required (no default) so every environment must consciously declare who can reach the API. Set a single admin/Tailscale /32 — never a /0, which would expose the API to the whole internet."
  type        = string

  validation {
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/(3[0-2]|[12]?[0-9])$", var.kube_api_allowed_cidr)) && tonumber(split("/", var.kube_api_allowed_cidr)[1]) > 0
    error_message = "kube_api_allowed_cidr must be a valid IPv4 CIDR with a non-zero prefix (e.g. 77.133.250.78/32). A /0 mask exposes the kube API to the entire internet."
  }
}

################################
#         CLOUDFLARE.          #
################################
variable "cloudflare_api_token" {
  description = "Cloudflare API token with scopes: Account → Cloudflare Tunnel → Edit, Zone → DNS → Edit, Zone → Zone → Read."
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID (visible on any zone overview page)."
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for the apex domain."
  type        = string
}

variable "domain" {
  description = "Apex domain managed in Cloudflare. Only 1-level subdomains are covered by free Universal SSL."
  type        = string
  default     = "monsieurtis.com"
}

variable "subdomains" {
  description = "Subdomains to expose through the Cloudflare tunnel. Each becomes a proxied CNAME under `var.domain`."
  type        = list(string)
  default     = ["auth", "id", "linlin", "api-linlin", "harley"]
}

variable "chart_versions" {
  description = "Pinned Helm chart versions for the cluster platform."
  type = object({
    traefik      = string
    cert_manager = string
    cloudflared  = string
  })
  default = {
    traefik      = "33.0.0"
    cert_manager = "v1.16.1"
    cloudflared  = "0.3.2"
  }
}
