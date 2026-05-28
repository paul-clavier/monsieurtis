resource "random_id" "tunnel_secret" {
  byte_length = 35
}

resource "cloudflare_zero_trust_tunnel_cloudflared" "mrtis" {
  account_id    = var.cloudflare_account_id
  name          = "${var.cluster_name}-civo"
  tunnel_secret = random_id.tunnel_secret.b64_std
  config_src    = "cloudflare"
}

data "cloudflare_zero_trust_tunnel_cloudflared_token" "mrtis" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.mrtis.id
}

# Catch-all: everything goes to Traefik; Traefik routes by Host header.
resource "cloudflare_zero_trust_tunnel_cloudflared_config" "mrtis" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.mrtis.id

  config = {
    ingress = [{
      service = "http://traefik.traefik.svc.cluster.local:80"
      origin_request = {
        http_host_header = ""
      }
    }]
  }
}

resource "cloudflare_dns_record" "apps" {
  for_each = toset(var.subdomains)

  zone_id = var.cloudflare_zone_id
  name    = each.value
  content = "${cloudflare_zero_trust_tunnel_cloudflared.mrtis.id}.cfargotunnel.com"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}
