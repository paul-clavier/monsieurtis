provider "civo" {
  region = var.civo_region
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

locals {
  kubeconfig = yamldecode(civo_kubernetes_cluster.main.kubeconfig)
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
