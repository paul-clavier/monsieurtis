###############################################################################
# Ory Kratos — identity management (login, registration, recovery, sessions).
# Public API → auth.<domain> (via Traefik IngressRoute, see ingress.tf).
# Admin API → cluster-internal only.
###############################################################################

resource "kubernetes_secret" "kratos_secrets" {
  metadata {
    name      = "kratos-secrets"
    namespace = kubernetes_namespace.identity.metadata[0].name
  }

  data = {
    dsn               = local.kratos_dsn
    secretsDefault    = var.kratos_cookie_secret
    secretsCookie     = var.kratos_cookie_secret
    secretsCipher     = var.kratos_cipher_secret
    smtpConnectionURI = var.smtp_connection_uri

    # Used by Kratos `oidc` method when looking up Google provider credentials.
    googleClientID     = var.google_oauth_client_id
    googleClientSecret = var.google_oauth_client_secret
  }
}

resource "helm_release" "kratos" {
  name       = "kratos"
  namespace  = kubernetes_namespace.identity.metadata[0].name
  repository = "https://k8s.ory.sh/helm/charts"
  chart      = "kratos"
  version    = var.chart_versions.kratos

  depends_on = [helm_release.postgres]

  values = [yamlencode({
    # Run the auto-migration init container before each pod start.
    kratos = {
      development   = false
      automigration = { enabled = true, type = "initContainer" }
      config        = yamldecode(local.kratos_config)

      identitySchemas = {
        "identity.schema.json" = local.identity_schema
      }
    }

    # Wire the secret keys above to env vars that Kratos picks up automatically.
    secret = {
      enabled      = false
      nameOverride = kubernetes_secret.kratos_secrets.metadata[0].name
    }

    deployment = {
      extraEnv = [
        { name = "DSN", valueFrom = { secretKeyRef = { name = kubernetes_secret.kratos_secrets.metadata[0].name, key = "dsn" } } },
        { name = "SECRETS_DEFAULT", valueFrom = { secretKeyRef = { name = kubernetes_secret.kratos_secrets.metadata[0].name, key = "secretsDefault" } } },
        { name = "SECRETS_COOKIE", valueFrom = { secretKeyRef = { name = kubernetes_secret.kratos_secrets.metadata[0].name, key = "secretsCookie" } } },
        { name = "SECRETS_CIPHER", valueFrom = { secretKeyRef = { name = kubernetes_secret.kratos_secrets.metadata[0].name, key = "secretsCipher" } } },
        { name = "COURIER_SMTP_CONNECTION_URI", valueFrom = { secretKeyRef = { name = kubernetes_secret.kratos_secrets.metadata[0].name, key = "smtpConnectionURI" } } },
        { name = "SELFSERVICE_METHODS_OIDC_CONFIG_PROVIDERS_0_CLIENT_ID", valueFrom = { secretKeyRef = { name = kubernetes_secret.kratos_secrets.metadata[0].name, key = "googleClientID" } } },
        { name = "SELFSERVICE_METHODS_OIDC_CONFIG_PROVIDERS_0_CLIENT_SECRET", valueFrom = { secretKeyRef = { name = kubernetes_secret.kratos_secrets.metadata[0].name, key = "googleClientSecret" } } },
      ]

      resources = {
        requests = { cpu = "50m", memory = "96Mi" }
        limits   = { cpu = "300m", memory = "256Mi" }
      }
    }

    service = {
      admin  = { enabled = true, type = "ClusterIP" }
      public = { enabled = true, type = "ClusterIP" }
    }
  })]
}
