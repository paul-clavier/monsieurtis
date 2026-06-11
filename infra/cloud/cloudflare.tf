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
  name    = "${each.value}.${var.domain}"
  content = "${cloudflare_zero_trust_tunnel_cloudflared.monsieurtis.id}.cfargotunnel.com"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

################################
#         ZONE SECURITY        #
################################

# Full (Strict): Cloudflare <-> origin is encrypted and the origin cert is validated.
# Safe here because the tunnel terminates at cfargotunnel.com with a valid Cloudflare cert.
resource "cloudflare_zone_setting" "ssl" {
  zone_id    = var.cloudflare_zone_id
  setting_id = "ssl"
  value      = "strict"
}

# Redirect plain HTTP to HTTPS at the edge.
resource "cloudflare_zone_setting" "always_use_https" {
  zone_id    = var.cloudflare_zone_id
  setting_id = "always_use_https"
  value      = "on"
}

# HSTS: instruct browsers to only use HTTPS for this domain. Note that `preload` +
# `include_subdomains` is a one-way commitment once browsers cache it -- any subdomain
# that ever needs to serve plain HTTP must be excluded before enabling these.
resource "cloudflare_zone_setting" "hsts" {
  zone_id    = var.cloudflare_zone_id
  setting_id = "security_header"
  value = {
    strict_transport_security = {
      enabled            = true
      max_age            = 31536000
      include_subdomains = true
      preload            = true
      nosniff            = true
    }
  }
}

################################
#       EMAIL ROUTING.         #
################################
# Inbound mail at `*@<var.domain>` lands on Cloudflare's MX servers and is forwarded to a
# verified Gmail. Lets us own `support@monsieurtis.com` (and any future alias) for free
# without running an SMTP/IMAP server. Sending is delegated to Resend, configured in
# `infra/identity` since it's tied to Kratos.

# Initializes the zone's email routing settings entry.
resource "cloudflare_email_routing_settings" "monsieurtis" {
  zone_id = var.cloudflare_zone_id
}

# Provisions Cloudflare's MX + SPF DNS records on the zone, which activates Email Routing.
# The auto-managed SPF (`v=spf1 include:_spf.mx.cloudflare.net ~all`) must be merged with
# Resend's `include:_spf.resend.com` in the Cloudflare dashboard once Resend is added — TF
# does not manage the record contents directly.
# `name` is intentionally unset: it is only for the subdomain feature, the API never echoes
# it back on read, and setting it to the apex causes a perpetual diff whose PATCH fails with
# 404 "Subdomain not found" (the PATCH endpoint is subdomain-only).
resource "cloudflare_email_routing_dns" "monsieurtis" {
  zone_id = var.cloudflare_zone_id

  depends_on = [cloudflare_email_routing_settings.monsieurtis]
}

# Verified destination mailbox. First apply triggers a confirmation email to
# `var.email_routing_destination` — the link must be clicked manually before forwarding
# starts (Cloudflare silently drops mail to unverified destinations).
resource "cloudflare_email_routing_address" "destination" {
  account_id = var.cloudflare_account_id
  email      = var.email_routing_destination
}

# Per-alias forwarding rules: `<key>@<var.domain>` → <value>.
resource "cloudflare_email_routing_rule" "aliases" {
  for_each = var.email_routing_aliases

  zone_id  = var.cloudflare_zone_id
  name     = "Forward ${each.key}@${var.domain}"
  enabled  = true
  priority = 0

  matchers = [{
    type  = "literal"
    field = "to"
    value = "${each.key}@${var.domain}"
  }]

  actions = [{
    type  = "forward"
    value = [each.value]
  }]

  depends_on = [
    cloudflare_email_routing_dns.monsieurtis,
    cloudflare_email_routing_address.destination,
  ]
}

# Catch-all: any `*@<var.domain>` not matched by an alias rule falls back here.
resource "cloudflare_email_routing_catch_all" "monsieurtis" {
  count = var.email_routing_catch_all == null ? 0 : 1

  zone_id = var.cloudflare_zone_id
  name    = "Catch-all"
  enabled = true

  matchers = [{
    type = "all"
  }]

  actions = [{
    type  = "forward"
    value = [var.email_routing_catch_all]
  }]

  depends_on = [
    cloudflare_email_routing_dns.monsieurtis,
    cloudflare_email_routing_address.destination,
  ]
}
