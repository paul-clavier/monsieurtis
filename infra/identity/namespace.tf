resource "kubernetes_namespace" "identity" {
  metadata {
    name = var.namespace

    labels = {
      "app.kubernetes.io/part-of" = "identity"
    }
  }
}
