terraform {
  required_version = ">= 1.6"

  required_providers {
    civo       = { source = "civo/civo", version = "~> 1.1" }
    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.34" }
    helm       = { source = "hashicorp/helm", version = "~> 2.16" }
    random     = { source = "hashicorp/random", version = "~> 3.6" }
  }
}
