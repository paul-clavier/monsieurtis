###############################################################################
# Crocus — the login / consent / denied / admin / launcher UI.
#
# Containerised TanStack Start app from `apps/crocus`. Image is built and
# pushed externally (CI); this Terraform only references the image tag.
###############################################################################

resource "kubernetes_deployment" "crocus" {
  metadata {
    name      = "crocus"
    namespace = kubernetes_namespace.identity.metadata[0].name

    labels = {
      "app.kubernetes.io/name" = "crocus"
    }
  }

  spec {
    replicas = 1

    selector {
      match_labels = { "app.kubernetes.io/name" = "crocus" }
    }

    template {
      metadata {
        labels = { "app.kubernetes.io/name" = "crocus" }
      }

      spec {
        container {
          name  = "crocus"
          image = var.crocus_image

          port {
            name           = "http"
            container_port = 3000
          }

          # All admin URLs are in-cluster — secrets never leave the namespace.
          env {
            name  = "KRATOS_PUBLIC_URL"
            value = "https://${local.login_host}"
          }
          env {
            name  = "KRATOS_ADMIN_URL"
            value = local.kratos_admin_svc
          }
          env {
            name  = "HYDRA_ADMIN_URL"
            value = local.hydra_admin_svc
          }
          env {
            name  = "KETO_READ_URL"
            value = local.keto_read_svc
          }
          env {
            name  = "PUBLIC_AUTH_ORIGIN"
            value = "https://${local.login_host}"
          }

          resources {
            requests = { cpu = "30m", memory = "96Mi" }
            limits   = { cpu = "300m", memory = "256Mi" }
          }

          liveness_probe {
            http_get {
              path = "/healthz"
              port = "http"
            }
            initial_delay_seconds = 15
            period_seconds        = 20
          }

          readiness_probe {
            http_get {
              path = "/healthz"
              port = "http"
            }
            initial_delay_seconds = 5
            period_seconds        = 5
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "crocus" {
  metadata {
    name      = "crocus"
    namespace = kubernetes_namespace.identity.metadata[0].name
  }

  spec {
    selector = { "app.kubernetes.io/name" = "crocus" }

    port {
      name        = "http"
      port        = 80
      target_port = "http"
    }

    type = "ClusterIP"
  }
}
