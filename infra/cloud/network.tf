# Tailscale exit node — the only address the kube API firewall accepts.
# See `civo_firewall_rule.kube_api` in cluster.tf for the pinning.

################################
#       TAILNET CONFIG.        #
################################

# Single-use, preauthorized key consumed by the VPS during cloud-init.
# It is used so the VPS can join the tailscale network.
# Short expiry because the VPS reads it within seconds of boot; if the
# Tofu state file ever leaks, the window of exposure is bounded.
resource "tailscale_tailnet_key" "exit_node" {
  reusable      = false
  ephemeral     = false
  preauthorized = true
  description   = "${var.cluster_name}-exit bootstrap key"
  tags          = ["tag:monsieurtis"]
  expiry        = 3600
}

# `autoApprovers.exitNode` means devices tagged `tag:monsieurtis` are usable
# as exit nodes the moment they register — no admin console click-through.
resource "tailscale_acl" "policy" {
  acl = jsonencode({
    tagOwners = {
      "tag:monsieurtis" = ["autogroup:admin"]
    }
    autoApprovers = {
      exitNode = ["tag:monsieurtis"]
    }
    acls = [
      { action = "accept", src = ["autogroup:member"], dst = ["*:*"] }
    ]
    ssh = [
      {
        action = "accept"
        src    = ["autogroup:member"]
        dst    = ["tag:monsieurtis"]
        users  = ["autogroup:nonroot", "root"]
      }
    ]
  })
}

################################
#         EXIT NODE.           #
################################

resource "civo_ssh_key" "admin" {
  name       = "${var.cluster_name}-admin"
  public_key = var.admin_ssh_public_key
}

# Default-deny except UDP/41641 for Tailscale direct connections. Without
# this, peers fall back to DERP relays — works but slower. No public SSH;
# admin access goes through Tailscale SSH on the tailnet.
resource "civo_firewall" "exit_node" {
  name                 = "${var.cluster_name}-exit-fw"
  create_default_rules = false
}

resource "civo_firewall_rule" "exit_node_tailscale" {
  firewall_id = civo_firewall.exit_node.id
  protocol    = "udp"
  start_port  = "41641"
  end_port    = "41641"
  cidr        = ["0.0.0.0/0"]
  direction   = "ingress"
  action      = "allow"
  label       = "tailscale"
}

data "civo_disk_image" "debian" {
  filter {
    key    = "name"
    values = ["debian-12"]
  }
}

resource "civo_instance" "exit_node" {
  hostname    = "${var.cluster_name}-exit"
  size        = var.exit_node_size
  disk_image  = element(data.civo_disk_image.debian.diskimages, 0).id
  firewall_id = civo_firewall.exit_node.id
  sshkey_id   = civo_ssh_key.admin.id
  notes       = "Tailscale exit node — gates kube API access."

  script = templatefile("${path.module}/cloud-init.sh.tftpl", {
    tailscale_auth_key = tailscale_tailnet_key.exit_node.key
  })

  # cloud-init only runs once on first boot; do not recreate the VPS
  # when the (single-use) auth key rotates in state.
  lifecycle {
    ignore_changes = [script]
  }
}
