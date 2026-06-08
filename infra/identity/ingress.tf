###############################################################################
# Traefik IngressRoutes — public exposure for the identity stack.
#
# Two hostnames, both fronted by Cloudflare Tunnel → Traefik:
#
#   login.<domain>:
#     - Kratos public for the well-known/self-service/sessions paths.
#     - Crocus for everything else (login UI, consent UI, /denied, /admin, /).
#
#   oauth.<domain>:
#     - Hydra public (OAuth2 endpoints + .well-known/openid-configuration).
#       This is the OIDC issuer URL.
#
# Admin APIs (kratos-admin, hydra-admin, keto-*) are never exposed.
###############################################################################

resource "kubernetes_manifest" "ingress_login" {
  manifest = {
    apiVersion = "traefik.io/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "login"
      namespace = kubernetes_namespace.identity.metadata[0].name
    }
    spec = {
      entryPoints = ["web"]
      routes = [
        # Kratos public — self-service endpoints, well-known, sessions.
        {
          match    = "Host(`${local.login_host}`) && (PathPrefix(`/self-service`) || PathPrefix(`/sessions`) || PathPrefix(`/.well-known`) || PathPrefix(`/schemas`) || PathPrefix(`/health`))"
          kind     = "Rule"
          priority = 100
          services = [{
            name      = "kratos-public"
            port      = 80
            namespace = kubernetes_namespace.identity.metadata[0].name
          }]
        },
        # Everything else on login.<domain> → Crocus.
        {
          match    = "Host(`${local.login_host}`)"
          kind     = "Rule"
          priority = 10
          services = [{
            name      = "crocus"
            port      = 80
            namespace = kubernetes_namespace.identity.metadata[0].name
          }]
        },
      ]
    }
  }

  depends_on = [
    helm_release.kratos,
    kubernetes_service.crocus,
  ]
}

resource "kubernetes_manifest" "ingress_oauth" {
  manifest = {
    apiVersion = "traefik.io/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "oauth"
      namespace = kubernetes_namespace.identity.metadata[0].name
    }
    spec = {
      entryPoints = ["web"]
      routes = [{
        match = "Host(`${local.oauth_host}`)"
        kind  = "Rule"
        services = [{
          name      = "hydra-public"
          port      = 4444
          namespace = kubernetes_namespace.identity.metadata[0].name
        }]
      }]
    }
  }

  depends_on = [helm_release.hydra]
}
