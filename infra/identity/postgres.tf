###############################################################################
# Shared Postgres (CloudNativePG) with three databases: kratos, hydra, keto.
#
# We run a single instance to fit inside the Civo 20 Gi volume quota and keep
# the per-month bill flat. If/when scale or isolation matters, bump
# `instances` — CNPG handles replication and failover natively.
###############################################################################

# The operator lives in its own namespace and watches all namespaces.
resource "helm_release" "cloudnative_pg" {
  name             = "cloudnative-pg"
  namespace        = "cnpg-system"
  create_namespace = true
  repository       = "https://cloudnative-pg.github.io/charts"
  chart            = "cloudnative-pg"
  version          = var.chart_versions.cloudnative_pg
}

# CNPG expects superuser credentials as a kubernetes.io/basic-auth Secret.
resource "kubernetes_secret" "postgres_auth" {
  metadata {
    name      = "postgres-auth"
    namespace = kubernetes_namespace.identity.metadata[0].name
  }

  type = "kubernetes.io/basic-auth"

  data = {
    username = "postgres"
    password = var.postgres_password
  }
}

# The alekc fork is required here for `wait_for` (see versions.tf).
resource "kubectl_manifest" "postgres_cluster" {
  provider = alekc

  yaml_body = yamlencode({
    apiVersion = "postgresql.cnpg.io/v1"
    kind       = "Cluster"
    metadata = {
      name      = "postgres"
      namespace = kubernetes_namespace.identity.metadata[0].name
    }
    spec = {
      instances = 1

      # The Ory services connect as the `postgres` superuser (see locals.tf),
      enableSuperuserAccess = true
      superuserSecret = {
        name = kubernetes_secret.postgres_auth.metadata[0].name
      }

      bootstrap = {
        initdb = {
          postInitSQL = [
            "CREATE DATABASE kratos;",
            "CREATE DATABASE hydra;",
            "CREATE DATABASE keto;",
          ]
        }
      }

      storage = { size = var.postgres_storage_size }

      resources = {
        requests = { cpu = "100m", memory = "256Mi" }
        limits   = { cpu = "500m", memory = "512Mi" }
      }
    }
  })

  wait_for {
    field {
      key   = "status.readyInstances"
      value = "1"
    }
  }

  timeouts {
    create = "10m"
  }

  depends_on = [helm_release.cloudnative_pg]
}
