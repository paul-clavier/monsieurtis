###############################################################################
# Shared Postgres (Bitnami chart) with three databases: kratos, hydra, keto.
#
# We use a single instance to fit inside the Civo 20 Gi volume quota and keep
# the per-month bill flat. If/when scale or isolation matters, split each Ory
# service onto its own release (chart values, not Terraform layout, change).
###############################################################################

resource "kubernetes_secret" "postgres_auth" {
  metadata {
    name      = "postgres-auth"
    namespace = kubernetes_namespace.identity.metadata[0].name
  }

  data = {
    "postgres-password" = var.postgres_password
  }
}

resource "helm_release" "postgres" {
  name       = "postgres"
  namespace  = kubernetes_namespace.identity.metadata[0].name
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "postgresql"
  version    = var.chart_versions.postgresql

  # The Bitnami chart accepts `initdbScripts` — we use it to create the three
  # databases on first boot. The superuser password comes from the Secret above.
  values = [yamlencode({
    auth = {
      existingSecret     = kubernetes_secret.postgres_auth.metadata[0].name
      secretKeys         = { adminPasswordKey = "postgres-password" }
      enablePostgresUser = true
    }

    primary = {
      persistence = {
        enabled = true
        size    = var.postgres_storage_size
      }

      resources = {
        requests = { cpu = "100m", memory = "256Mi" }
        limits   = { cpu = "500m", memory = "512Mi" }
      }

      initdb = {
        scripts = {
          "create-databases.sql" = <<-EOT
            CREATE DATABASE kratos;
            CREATE DATABASE hydra;
            CREATE DATABASE keto;
          EOT
        }
      }
    }
  })]
}
