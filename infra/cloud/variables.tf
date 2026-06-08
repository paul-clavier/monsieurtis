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
  default     = "monsieurtis"
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

################################
#          NETWORK.            #
################################
# The Tailscale exit node VPS that fronts the kube API: its public /32 is the
# only address `civo_firewall.cluster` lets past. Admin access from a laptop
# rides the tailnet (Tailscale SSH; no public port 22 on the VPS), and
# `kubectl` works only while the exit node is selected on the client side
# (`tailscale up --exit-node=monsieurtis-exit`).
variable "exit_node_size" {
  description = "Civo instance size for the Tailscale exit node. Smallest g4 works — Tailscale uses ~50 MB RAM idle."
  type        = string
  default     = "g4s.xsmall"
}

variable "admin_ssh_public_key" {
  description = "SSH public key authorized on the exit node. Tailscale SSH is the primary access path; this is a break-glass fallback for the Civo console."
  type        = string
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
  default     = ["login", "oauth", "linlin", "api-linlin", "harley"]
}

################################
#       EMAIL ROUTING.         #
################################
# Cloudflare Email Routing accepts inbound mail at `*@<var.domain>` on Cloudflare's MX
# servers and forwards each message to a verified destination mailbox. Outbound sending
# is handled separately by Resend (see infra/identity/BOOTSTRAP.md).
variable "email_routing_destination" {
  description = "Destination mailbox that receives forwarded mail. Confirmed once via the verification email Cloudflare sends after the first apply — forwarding silently drops mail until then."
  type        = string
  default     = "tis.monsieurtis@gmail.com"
}

variable "email_routing_aliases" {
  description = "Map of `local-part` → forwarded address. Each entry creates a Cloudflare Email Routing rule that forwards `<local>@<var.domain>` to the given address."
  type        = map(string)
  default = {
    support = "tis.monsieurtis@gmail.com"
  }
}

variable "email_routing_catch_all" {
  description = "Destination for the catch-all rule, applied to any `*@<var.domain>` not matched by `email_routing_aliases`. Set to `null` to disable the catch-all."
  type        = string
  default     = "tis.monsieurtis@gmail.com"
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
    cloudflared  = "0.1.2"
  }
}
