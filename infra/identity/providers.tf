provider "civo" {
  region = var.civo_region
}

# Fetch the cluster's kubeconfig live from Civo rather than reading cloud's
# state. Identity only needs to know the cluster exists by name, keeping the two
# roots loosely coupled (cloud's secrets never enter this pipeline).
data "civo_kubernetes_cluster" "main" {
  name = var.cluster_name
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
  kubernetes = {
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

# alekc fork — same connection, see versions.tf for why both exist.
provider "alekc" {
  host                   = local.cluster.server
  client_certificate     = base64decode(local.user["client-certificate-data"])
  client_key             = base64decode(local.user["client-key-data"])
  cluster_ca_certificate = base64decode(local.cluster["certificate-authority-data"])
  load_config_file       = false
}
