output "kubeconfig" {
  description = "Kubeconfig for the cluster. Feed into the identity module or merge into ~/.kube/config."
  value       = civo_kubernetes_cluster.main.kubeconfig
  sensitive   = true
}

output "cluster_id" {
  description = "Civo cluster ID. Useful for CLI commands and CI/CD lookups."
  value       = civo_kubernetes_cluster.main.id
}

output "firewall_id" {
  description = "Civo firewall ID. The kube_api rule is pinned to `civo_instance.exit_node.public_ip`."
  value       = civo_firewall.cluster.id
}

output "tunnel_id" {
  description = "Cloudflare tunnel ID. Subdomain CNAMEs already point at <tunnel_id>.cfargotunnel.com."
  value       = cloudflare_zero_trust_tunnel_cloudflared.monsieurtis.id
}

output "exit_node_public_ip" {
  description = "Public IPv4 of the Tailscale exit node — the only address the kube API firewall accepts."
  value       = civo_instance.exit_node.public_ip
}

resource "local_sensitive_file" "kubeconfig" {
  content         = civo_kubernetes_cluster.main.kubeconfig
  filename        = "${path.module}/kubeconfig"
  file_permission = "0600"
}
