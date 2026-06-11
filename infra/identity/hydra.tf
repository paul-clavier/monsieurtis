###############################################################################
# Ory Hydra — OAuth 2.0 / OpenID Connect authorization server.
# Public API → id.<domain>. Admin API → cluster-internal only.
# Hydra delegates login + consent UI to Crocus (https://auth.<domain>).
###############################################################################

resource "kubernetes_secret" "hydra_secrets" {
  metadata {
    name      = "hydra-secrets"
    namespace = kubernetes_namespace.identity.metadata[0].name
  }

  data = {
    dsn           = local.hydra_dsn
    secretsSystem = var.hydra_system_secret
    secretsCookie = var.hydra_system_secret
  }
}

resource "helm_release" "hydra" {
  name       = "hydra"
  namespace  = kubernetes_namespace.identity.metadata[0].name
  repository = "https://k8s.ory.sh/helm/charts"
  chart      = "hydra"
  version    = var.chart_versions.hydra

  depends_on = [kubectl_manifest.postgres_cluster]

  values = [yamlencode({
    hydra = {
      automigration = { enabled = true, type = "initContainer" }
      config        = yamldecode(local.hydra_config)
    }

    secret = {
      enabled      = false
      nameOverride = kubernetes_secret.hydra_secrets.metadata[0].name
    }

    deployment = {
      extraEnv = [
        { name = "DSN", valueFrom = { secretKeyRef = { name = kubernetes_secret.hydra_secrets.metadata[0].name, key = "dsn" } } },
        { name = "SECRETS_SYSTEM", valueFrom = { secretKeyRef = { name = kubernetes_secret.hydra_secrets.metadata[0].name, key = "secretsSystem" } } },
        { name = "SECRETS_COOKIE", valueFrom = { secretKeyRef = { name = kubernetes_secret.hydra_secrets.metadata[0].name, key = "secretsCookie" } } },
      ]

      resources = {
        requests = { cpu = "50m", memory = "96Mi" }
        limits   = { cpu = "300m", memory = "256Mi" }
      }
    }

    service = {
      public = { enabled = true, type = "ClusterIP", port = 4444 }
      admin  = { enabled = true, type = "ClusterIP", port = 4445 }
    }
  })]
}
