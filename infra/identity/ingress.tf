###############################################################################
# Traefik IngressRoutes — public exposure for the identity stack.
#
# Two hostnames, both fronted by Cloudflare Tunnel → Traefik:
#
#   auth.<domain>:
#     - Kratos public for the well-known/self-service/sessions paths.
#     - Crocus for everything else (login UI, consent UI, /denied, /admin, /).
#
#   id.<domain>:
#     - Hydra public (OAuth2 endpoints + .well-known/openid-configuration).
#
# Admin APIs (kratos-admin, hydra-admin, keto-*) are never exposed.
###############################################################################

resource "kubernetes_manifest" "ingress_auth" {
  manifest = {
    apiVersion = "traefik.io/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "auth"
      namespace = kubernetes_namespace.identity.metadata[0].name
    }
    spec = {
      entryPoints = ["web"]
      routes = [
        # Kratos public — self-service endpoints, well-known, sessions.
        {
          match    = "Host(`${local.auth_host}`) && (PathPrefix(`/self-service`) || PathPrefix(`/sessions`) || PathPrefix(`/.well-known`) || PathPrefix(`/schemas`) || PathPrefix(`/health`))"
          kind     = "Rule"
          priority = 100
          services = [{
            name      = "kratos-public"
            port      = 80
            namespace = kubernetes_namespace.identity.metadata[0].name
          }]
        },
        # Everything else on auth.<domain> → Crocus.
        {
          match    = "Host(`${local.auth_host}`)"
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

resource "kubernetes_manifest" "ingress_id" {
  manifest = {
    apiVersion = "traefik.io/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "id"
      namespace = kubernetes_namespace.identity.metadata[0].name
    }
    spec = {
      entryPoints = ["web"]
      routes = [{
        match = "Host(`${local.id_host}`)"
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
