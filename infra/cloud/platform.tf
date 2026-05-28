resource "kubernetes_namespace" "traefik" {
  metadata { name = "traefik" }
}

resource "kubernetes_namespace" "cloudflared" {
  metadata { name = "cloudflared" }
}

resource "kubernetes_namespace" "cert_manager" {
  metadata { name = "cert-manager" }
}

resource "helm_release" "traefik" {
  name       = "traefik"
  namespace  = kubernetes_namespace.traefik.metadata[0].name
  repository = "https://traefik.github.io/charts"
  chart      = "traefik"
  version    = var.chart_versions.traefik

  # ClusterIP only — cloudflared reaches Traefik internally. No Civo LB ($10/mo saved).
  set {
    name  = "service.type"
    value = "ClusterIP"
  }
}

resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  namespace  = kubernetes_namespace.cert_manager.metadata[0].name
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  version    = var.chart_versions.cert_manager

  set {
    name  = "crds.enabled"
    value = "true"
  }
}

resource "helm_release" "cloudflared" {
  name       = "cloudflared"
  namespace  = kubernetes_namespace.cloudflared.metadata[0].name
  repository = "https://cloudflare.github.io/helm-charts"
  chart      = "cloudflare-tunnel-remote"
  version    = var.chart_versions.cloudflared

  set {
    name  = "cloudflare.tunnelToken"
    value = data.cloudflare_zero_trust_tunnel_cloudflared_token.mrtis.token
  }

  set {
    name  = "replicaCount"
    value = "2"
  }
}

# Shared rate-limit middleware. Apps reference as `ratelimit@kubernetescrd`
# from their IngressRoute.
resource "kubernetes_manifest" "ratelimit" {
  manifest = {
    apiVersion = "traefik.io/v1alpha1"
    kind       = "Middleware"
    metadata = {
      name      = "ratelimit"
      namespace = kubernetes_namespace.traefik.metadata[0].name
    }
    spec = {
      rateLimit = {
        average = 100
        burst   = 200
      }
    }
  }

  depends_on = [helm_release.traefik]
}
