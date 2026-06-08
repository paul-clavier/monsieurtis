###############################################################################
# Ory Keto — permission server (Zanzibar-style ReBAC).
# Stores relation tuples like `app:linlin#access@user:<kratos-id>` and serves
# fast `check` queries. Both read and write APIs are cluster-internal only.
###############################################################################

resource "kubernetes_secret" "keto_secrets" {
  metadata {
    name      = "keto-secrets"
    namespace = kubernetes_namespace.identity.metadata[0].name
  }

  data = {
    dsn = local.keto_dsn
  }
}

resource "helm_release" "keto" {
  name       = "keto"
  namespace  = kubernetes_namespace.identity.metadata[0].name
  repository = "https://k8s.ory.sh/helm/charts"
  chart      = "keto"
  version    = var.chart_versions.keto

  depends_on = [helm_release.postgres]

  values = [yamlencode({
    keto = {
      automigration = { enabled = true, type = "initContainer" }
      config        = yamldecode(local.keto_config)
    }

    secret = {
      enabled      = false
      nameOverride = kubernetes_secret.keto_secrets.metadata[0].name
    }

    deployment = {
      extraEnv = [
        { name = "DSN", valueFrom = { secretKeyRef = { name = kubernetes_secret.keto_secrets.metadata[0].name, key = "dsn" } } },
      ]

      resources = {
        requests = { cpu = "30m", memory = "64Mi" }
        limits   = { cpu = "200m", memory = "128Mi" }
      }
    }

    service = {
      read  = { type = "ClusterIP" }
      write = { type = "ClusterIP" }
    }
  })]
}

###############################################################################
# Seed Zanzibar tuples.
#
# Tuples are declared in `config/keto-tuples.yaml.tftpl` (one row per
# Zanzibar relation). A Kubernetes Job mounts the rendered list as JSON and
# PUTs each row against Keto's local write API. PUT semantics make the Job
# idempotent — re-applies and partial failures converge to the same state.
#
# Empty `initial_admin_kratos_id` is the bootstrap state: the YAML references
# `${admin_id}`, so before that variable is set the seed Job is skipped
# entirely. Fill it in after the first user registers and re-apply.
###############################################################################

locals {
  seed_tuples = var.initial_admin_kratos_id == "" ? [] : yamldecode(templatefile(
    "${path.module}/config/keto-tuples.yaml.tftpl",
    { admin_id = var.initial_admin_kratos_id },
  )).tuples
}

resource "kubernetes_config_map" "keto_seed" {
  count = length(local.seed_tuples) == 0 ? 0 : 1

  metadata {
    name      = "keto-seed-tuples"
    namespace = kubernetes_namespace.identity.metadata[0].name
  }

  data = {
    "tuples.json" = jsonencode(local.seed_tuples)
  }
}

resource "kubernetes_job" "keto_seed" {
  count = length(local.seed_tuples) == 0 ? 0 : 1

  metadata {
    # Job name is suffixed with a hash of the tuples, so any change to the
    # YAML (or admin ID) spawns a fresh Job rather than complaining about
    # an immutable spec.
    name      = "keto-seed-${substr(sha256(jsonencode(local.seed_tuples)), 0, 10)}"
    namespace = kubernetes_namespace.identity.metadata[0].name
  }

  spec {
    backoff_limit = 3

    template {
      metadata {}

      spec {
        restart_policy = "OnFailure"

        container {
          name = "seed"
          # alpine ships neither curl nor jq by default, but adding them at
          # startup is faster than maintaining a custom image. PUT semantics on
          # Keto's write API make every row idempotent — partial failures and
          # re-runs converge to the same state.
          image = "alpine:3.20"

          command = ["/bin/sh", "-c"]
          args = [
            <<-EOT
              set -eu
              apk add --no-cache --quiet curl jq
              jq -c '.[]' /seed/tuples.json | while read -r row; do
                ns=$(echo "$row" | jq -r '.namespace')
                obj=$(echo "$row" | jq -r '.object')
                rel=$(echo "$row" | jq -r '.relation')
                sub=$(echo "$row" | jq -r '.subject_id')
                echo "Writing $ns:$obj#$rel@$sub"
                curl -fsS -X PUT \
                  -H 'Content-Type: application/json' \
                  -d "{\"namespace\":\"$ns\",\"object\":\"$obj\",\"relation\":\"$rel\",\"subject_id\":\"$sub\"}" \
                  ${local.keto_write_svc}/admin/relation-tuples
              done
            EOT
          ]

          volume_mount {
            name       = "seed"
            mount_path = "/seed"
          }
        }

        volume {
          name = "seed"
          config_map {
            name = kubernetes_config_map.keto_seed[0].metadata[0].name
          }
        }
      }
    }
  }

  wait_for_completion = true

  depends_on = [helm_release.keto]
}
