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
# Seed the initial admin tuple.
#
# We use a Kubernetes Job with a `keto` CLI container that POSTs to the local
# Keto write API. Runs once per change to `initial_admin_kratos_id`; idempotent
# (PUT semantics, same tuple → no-op).
#
# Empty `initial_admin_kratos_id` is the bootstrap state — the job is skipped
# entirely so the first apply doesn't fail. Fill it in after the first user
# registers and re-apply.
###############################################################################

locals {
  seed_tuples = var.initial_admin_kratos_id == "" ? [] : concat(
    [
      {
        namespace  = "crocus-admin"
        object     = "platform"
        relation   = "access"
        subject_id = "user:${var.initial_admin_kratos_id}"
      },
    ],
    [
      for app_id, _cfg in var.registered_apps : {
        namespace  = "app"
        object     = app_id
        relation   = "access"
        subject_id = "user:${var.initial_admin_kratos_id}"
      }
    ],
  )
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
    # Job name changes when the admin ID changes, so a re-apply creates a
    # fresh job rather than complaining about an immutable spec.
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
