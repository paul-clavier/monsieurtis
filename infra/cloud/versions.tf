terraform {
  required_version = ">= 1.6"

  required_providers {
    civo       = { source = "civo/civo", version = "~> 1.1" }
    cloudflare = { source = "cloudflare/cloudflare", version = "~> 5.0" }
    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.34" }
    helm       = { source = "hashicorp/helm", version = "~> 2.16" }
    kubectl    = { source = "gavinbunney/kubectl", version = "~> 1.19" }
    local      = { source = "hashicorp/local", version = "~> 2.5" }
    random     = { source = "hashicorp/random", version = "~> 3.6" }
    tailscale  = { source = "tailscale/tailscale", version = "~> 0.17" }
  }
}
