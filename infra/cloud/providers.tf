provider "civo" {
  region = var.civo_region
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Reads TAILSCALE_OAUTH_CLIENT_ID / TAILSCALE_OAUTH_CLIENT_SECRET / TAILSCALE_TAILNET
# from the environment.
provider "tailscale" {}

# Re-read the cluster via a data source instead of using the resource's own
# `kubeconfig` attribute. Civo returns from cluster creation as soon as the
# row is committed, sometimes before the control plane has materialised a
# kubeconfig — the resource attribute then comes back as an empty string
# and `yamldecode` blows up. A data source is a fresh GET, evaluated after
# the resource is fully created, by which point the kubeconfig is populated.
#
# `depends_on` is mandatory: without it the data source would try to read
# during plan, before the cluster exists, and return nothing.
data "civo_kubernetes_cluster" "main" {
  name       = civo_kubernetes_cluster.main.name
  depends_on = [civo_kubernetes_cluster.main]
}

locals {
  kubeconfig = yamldecode(data.civo_kubernetes_cluster.main.kubeconfig)
  cluster    = local.kubeconfig.clusters[0].cluster
  user       = local.kubeconfig.users[0].user
}

provider "kubernetes" {
  host                   = local.cluster.server
  client_certificate     = base64decode(local.user["client-certificate-data"])
  client_key             = base64decode(local.user["client-key-data"])
  cluster_ca_certificate = base64decode(local.cluster["certificate-authority-data"])
}

provider "helm" {
  kubernetes {
    host                   = local.cluster.server
    client_certificate     = base64decode(local.user["client-certificate-data"])
    client_key             = base64decode(local.user["client-key-data"])
    cluster_ca_certificate = base64decode(local.cluster["certificate-authority-data"])
  }
}

# `load_config_file = false` prevents the provider from falling back to
# ~/.kube/config when the inline config is unknown at plan time.
provider "kubectl" {
  host                   = local.cluster.server
  client_certificate     = base64decode(local.user["client-certificate-data"])
  client_key             = base64decode(local.user["client-key-data"])
  cluster_ca_certificate = base64decode(local.cluster["certificate-authority-data"])
  load_config_file       = false
}
