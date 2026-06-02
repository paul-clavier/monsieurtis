# Resources for the Cloudflare provider to create a tunnel between Traefik and Cloudflare infra.
# See https://app.notion.com/p/Cloudflare-tunnel-372628b1f0de8071a1a1cb67d73afc22?source=copy_link for more

resource "random_id" "tunnel_secret" {
  byte_length = 35
}

resource "cloudflare_zero_trust_tunnel_cloudflared" "monsieurtis" {
  account_id    = var.cloudflare_account_id
  name          = "${var.cluster_name}-civo"
  tunnel_secret = random_id.tunnel_secret.b64_std
  config_src    = "cloudflare"
}

data "cloudflare_zero_trust_tunnel_cloudflared_token" "monsieurtis" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.monsieurtis.id
}

# This config is used to setup the cloudflared pod. Once a request arrives at the pod this config is used to route it to the accurate k3s ingress
# In monsieurtis case, all is routed to traefik which then handles requests
resource "cloudflare_zero_trust_tunnel_cloudflared_config" "monsieurtis" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.monsieurtis.id

  config = {
    ingress = [{
      service = "http://traefik.traefik.svc.cluster.local:80"
      origin_request = {
        http_host_header = ""
      }
    }]
  }
}

# This creates internet-wide DNS records. When user types toto.monsieurtis.com on internet, the DNS record matches it to 
# <tunnel-id>.cfargotunnel.com which is then routed to cloudflare and handled by them. 
# They maintain a mapping of tunnel_id <> cloudflared instances, so requests are properly routed to the cloudflared pods on the k3s instance.
resource "cloudflare_dns_record" "apps" {
  for_each = toset(var.subdomains)

  zone_id = var.cloudflare_zone_id
  name    = each.value
  content = "${cloudflare_zero_trust_tunnel_cloudflared.monsieurtis.id}.cfargotunnel.com"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}
