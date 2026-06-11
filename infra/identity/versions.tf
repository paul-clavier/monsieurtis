terraform {
  required_version = ">= 1.6"

  required_providers {
    civo       = { source = "civo/civo", version = "~> 1.1" }
    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.34" }
    helm       = { source = "hashicorp/helm", version = "~> 3.0" }
    kubectl    = { source = "gavinbunney/kubectl", version = "~> 1.19" }
    # Maintained fork of gavinbunney/kubectl, used (via explicit `provider =`)
    # only where we need `wait_for`, which gavinbunney lacks. Existing
    # kubectl_manifest resources stay on gavinbunney until a one-time
    # `tofu state replace-provider` migrates them all to the fork.
    alekc  = { source = "alekc/kubectl", version = "~> 2.4" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
}
