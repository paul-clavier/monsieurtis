terraform {
  required_version = ">= 1.6"

  required_providers {
    civo      = { source = "civo/civo", version = "~> 1.1" }
    tailscale = { source = "tailscale/tailscale", version = "~> 0.17" }
  }
}
