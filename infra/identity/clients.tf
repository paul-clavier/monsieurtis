###############################################################################
# Hydra OAuth2 client registration.
#
# We avoid the unofficial `oryd/hydra` Terraform provider (not on registry, and
# adds a maintenance burden) and instead use Hydra's admin API directly from a
# Kubernetes Job. PUT is idempotent so the job re-runs safely on every config
# change (job name embeds a config hash).
#
# Two client flavors, selected per entry in `var.registered_apps`:
#   - public        SPA / mobile. `token_endpoint_auth_method = "none"`, no
#                   client_secret minted, PKCE enforced by Hydra. Nothing to
#                   mount in-cluster — the browser drives the flow itself.
#   - confidential  Server-side app. A random client_secret is generated and
#                   stored in a K8s Secret `hydra-client-<id>` for the app to
#                   mount when calling Hydra's token endpoint.
###############################################################################

locals {
  confidential_apps = { for k, cfg in var.registered_apps : k => cfg if cfg.type == "confidential" }
}

resource "random_password" "client_secret" {
  for_each = local.confidential_apps

  length  = 48
  special = false
}

resource "kubernetes_secret" "client_credentials" {
  for_each = local.confidential_apps

  metadata {
    name      = "hydra-client-${each.key}"
    namespace = kubernetes_namespace.identity.metadata[0].name

    labels = {
      "monsieurtis.com/client-id" = each.key
    }
  }

  data = {
    client_id     = each.key
    client_secret = random_password.client_secret[each.key].result
    issuer_url    = "https://${local.oauth_host}"
  }
}

# Render the list of clients as a ConfigMap so the registration Job can iterate.
resource "kubernetes_config_map" "client_specs" {
  metadata {
    name      = "hydra-client-specs"
    namespace = kubernetes_namespace.identity.metadata[0].name
  }

  data = {
    "clients.json" = jsonencode([
      for client_id, cfg in var.registered_apps : merge(
        {
          client_id                  = client_id
          client_name                = client_id
          redirect_uris              = cfg.redirect_uris
          scope                      = cfg.scopes
          grant_types                = ["authorization_code", "refresh_token"]
          response_types             = ["code"]
          token_endpoint_auth_method = cfg.type == "public" ? "none" : "client_secret_basic"
        },
        cfg.type == "confidential" ? {
          client_secret = random_password.client_secret[client_id].result
        } : {}
      )
    ])
  }
}

resource "kubernetes_job" "register_clients" {
  metadata {
    # Re-run only when the client specs actually change.
    name      = "hydra-clients-${substr(sha256(kubernetes_config_map.client_specs.data["clients.json"]), 0, 10)}"
    namespace = kubernetes_namespace.identity.metadata[0].name
  }

  spec {
    backoff_limit = 3

    template {
      metadata {}

      spec {
        restart_policy = "OnFailure"

        container {
          name  = "register"
          image = "alpine:3.20"

          command = ["/bin/sh", "-c"]
          args = [
            <<-EOT
              set -eu
              apk add --no-cache --quiet curl jq
              jq -c '.[]' /spec/clients.json | while read -r body; do
                client_id=$(echo "$body" | jq -r '.client_id')

                # Upsert: try to update; on 404 fall through to create.
                status=$(curl -fsS -o /tmp/out -w '%%{http_code}' -X PUT \
                  -H 'Content-Type: application/json' \
                  -d "$body" \
                  ${local.hydra_admin_svc}/admin/clients/$client_id || echo failed)

                if [ "$status" = "failed" ] || [ "$status" = "404" ]; then
                  echo "Creating client $client_id"
                  curl -fsS -X POST \
                    -H 'Content-Type: application/json' \
                    -d "$body" \
                    ${local.hydra_admin_svc}/admin/clients
                else
                  echo "Updated client $client_id (HTTP $status)"
                fi
              done
            EOT
          ]

          volume_mount {
            name       = "spec"
            mount_path = "/spec"
          }
        }

        volume {
          name = "spec"
          config_map {
            name = kubernetes_config_map.client_specs.metadata[0].name
          }
        }
      }
    }
  }

  wait_for_completion = true

  depends_on = [helm_release.hydra]
}
