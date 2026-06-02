data "civo_kubernetes_version" "default" {
  filter {
    key    = "type"
    values = ["k3s"]
  }
  filter {
    key    = "default"
    values = ["true"]
  }
}


# Default-deny firewall. Only the kube API rule below punches a hole; all
# application traffic enters the cluster outbound via cloudflared.
resource "civo_firewall" "cluster" {
  name                 = "${var.cluster_name}-fw"
  create_default_rules = false

  ingress_rule {
    label      = "k8s-api"
    protocol   = "tcp"
    port_range = "6443"
    cidr       = ["${civo_instance.exit_node.public_ip}/32"]
    action     = "allow"
  }
}

resource "civo_kubernetes_cluster" "main" {
  name               = var.cluster_name
  firewall_id        = civo_firewall.cluster.id
  cluster_type       = "k3s"
  kubernetes_version = data.civo_kubernetes_version.default.versions[0].label
  cni                = "cilium"

  pools {
    label      = "default"
    size       = var.node_size
    node_count = var.node_count
  }

  applications = ""
}
