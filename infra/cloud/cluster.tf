data "civo_kubernetes_version" "stable" {
  filter {
    key    = "type"
    values = ["stable"]
  }
}

# Default-deny firewall. Only the kube API rule below punches a hole; all
# application traffic enters the cluster outbound via cloudflared.
resource "civo_firewall" "cluster" {
  name                 = "${var.cluster_name}-fw"
  create_default_rules = false
}

resource "civo_firewall_rule" "kube_api" {
  firewall_id = civo_firewall.cluster.id
  protocol    = "tcp"
  start_port  = "6443"
  end_port    = "6443"
  cidr        = [var.kube_api_allowed_cidr]
  direction   = "ingress"
  action      = "allow"
  label       = "k8s-api"
}

resource "civo_kubernetes_cluster" "main" {
  name               = var.cluster_name
  firewall_id        = civo_firewall.cluster.id
  cluster_type       = "k3s"
  kubernetes_version = data.civo_kubernetes_version.stable.versions[0].label
  cni                = "cilium"

  pools {
    label      = "default"
    size       = var.node_size
    node_count = var.node_count
  }

  applications = ""
}
