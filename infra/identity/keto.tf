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
# Reconcile Zanzibar tuples — declarative source of truth.
#
# Two inputs shape the desired tuple set:
#
#   - local.owner_email     → hardcoded. The reconcile Job resolves the Kratos
#                             identity for this email at run time and writes:
#                               crocus-admin:platform#access@user:<id>
#                               app:<X>#access@user:<id>      (one per gated app)
#
#   - var.user_groups       → team membership + per-app access (plan-time):
#                               team:<group>#member@user:<X>          (per member)
#                               app:<X>#access@team:<group>#member    (per group×app)
#
# A Kubernetes Job LISTs current tuples in the managed namespaces (app, team,
# crocus-admin), unions the static desired set (from a ConfigMap) with the
# owner tuples it derives at run time, diffs against current, then PUTs the
# missing rows and DELETEs the extras. Removing a row from Terraform — or
# changing the owner email — converges Keto on the next apply.
#
# Bootstrap: on the very first apply, the owner has not yet registered.
# The lookup returns no identity, the Job skips owner tuples (with a log
# line) and reconciles the group tuples. Register via Google at
# login.monsieurtis.com and re-apply; the next reconcile picks the owner
# up automatically.
###############################################################################

locals {
  owner_email = "plclavier@gmail.com"

  gated_apps = sort([for k, v in var.registered_apps : k if v.gated])

  membership_tuples = flatten([
    for name, g in var.user_groups : [
      for uid in g.member_ids : {
        namespace  = "team"
        object     = name
        relation   = "member"
        subject_id = "user:${uid}"
      }
    ]
  ])

  group_app_tuples = flatten([
    for name, g in var.user_groups : [
      for app in(contains(g.apps, "*") ? local.gated_apps : g.apps) : {
        namespace = "app"
        object    = app
        relation  = "access"
        subject_set = {
          namespace = "team"
          object    = name
          relation  = "member"
        }
      }
    ]
  ])

  # Owner tuples are NOT in this list — they depend on a run-time Kratos
  # lookup. The Job appends them after resolving the owner's identity.
  desired_tuples = concat(local.membership_tuples, local.group_app_tuples)
}

resource "kubernetes_config_map" "keto_reconcile_desired" {
  metadata {
    name      = "keto-reconcile-desired"
    namespace = kubernetes_namespace.identity.metadata[0].name
  }

  data = {
    "desired.json" = jsonencode(local.desired_tuples)
  }
}

resource "kubernetes_job" "keto_reconcile" {
  metadata {
    # Job name suffixed by a hash of every input that shapes the reconcile
    # outcome: the static desired set, the owner email, and the list of
    # gated apps that the owner gets access to. Any change to any of them
    # spawns a fresh Job rather than colliding with the immutable spec.
    name      = "keto-reconcile-${substr(sha256(jsonencode({
      desired     = local.desired_tuples
      owner_email = local.owner_email
      owner_apps  = local.gated_apps
    })), 0, 10)}"
    namespace = kubernetes_namespace.identity.metadata[0].name
  }

  # Cross-variable validation: every app referenced in user_groups.apps must
  # be "*" or a key of a gated registered_app. Public apps cannot appear —
  # they are unrestricted by construction. The check runs at plan time.
  lifecycle {
    precondition {
      condition = alltrue([
        for g in values(var.user_groups) : alltrue([
          for app in g.apps :
          app == "*" || try(var.registered_apps[app].gated, false)
        ])
      ])
      error_message = "user_groups.apps may only reference \"*\" or the key of a gated entry in registered_apps."
    }
  }

  spec {
    backoff_limit = 3

    template {
      metadata {}

      spec {
        restart_policy = "OnFailure"

        container {
          name = "reconcile"
          # alpine + curl + jq is faster to maintain than a custom image.
          # Operations are idempotent on Keto's write API (PUT and DELETE
          # both converge), so partial failures and re-runs are safe.
          image = "alpine:3.20"

          env {
            name  = "KETO_READ"
            value = local.keto_read_svc
          }
          env {
            name  = "KETO_WRITE"
            value = local.keto_write_svc
          }
          env {
            name  = "KRATOS_ADMIN"
            value = local.kratos_admin_svc
          }
          env {
            name  = "OWNER_EMAIL"
            value = local.owner_email
          }
          env {
            name  = "OWNER_APPS_JSON"
            value = jsonencode(local.gated_apps)
          }

          command = ["/bin/sh", "-c"]
          args = [
            <<-EOT
              set -eu
              apk add --no-cache --quiet curl jq

              # Canonical projection of a tuple → stable, sortable JSON key.
              # Keeps namespace/object/relation + exactly one of subject_id or
              # subject_set; jq -S sorts keys for byte-identical comparison.
              CANON='{namespace, object, relation} +
                     (if .subject_id then {subject_id}
                      else {subject_set: (.subject_set | {namespace, object, relation})}
                      end)'

              # --- Resolve owner Kratos ID by trait email.
              # We list identities and match by traits.email rather than using
              # the credentials_identifier filter — the latter only matches
              # password identifiers, not OIDC subjects, so it would miss
              # users who registered via Google. per_page=1000 is plenty at
              # our scale; revisit pagination when the identity count nears
              # this cap.
              owner_id=""
              if [ -n "$OWNER_EMAIL" ]; then
                owner_id=$(curl -fsS "$KRATOS_ADMIN/admin/identities?per_page=1000" \
                  | jq -r --arg e "$OWNER_EMAIL" '.[] | select(.traits.email == $e) | .id' \
                  | head -n1)
              fi

              # --- Build full desired set: static (group) tuples + owner tuples
              # derived from the resolved ID. If the owner has not registered
              # yet, only the static set is reconciled.
              if [ -n "$owner_id" ]; then
                echo "Owner resolved: $OWNER_EMAIL → $owner_id"
                jq --arg id "$owner_id" --argjson apps "$OWNER_APPS_JSON" '
                  . + [{namespace:"crocus-admin", object:"platform", relation:"access", subject_id:"user:\($id)"}]
                    + ($apps | map({namespace:"app", object:., relation:"access", subject_id:"user:\($id)"}))
                ' /reconcile/desired.json > /tmp/desired.full.json
              else
                echo "Owner $OWNER_EMAIL not yet registered — skipping owner tuples."
                cp /reconcile/desired.json /tmp/desired.full.json
              fi

              jq -cS ".[] | $CANON" /tmp/desired.full.json | sort > /tmp/desired.sorted

              # --- Current set: paginate every managed namespace, project,
              # canonicalize, dedupe, sort.
              : > /tmp/current.raw
              for ns in app team crocus-admin; do
                page_token=""
                while true; do
                  url="$KETO_READ/relation-tuples?namespace=$ns&page_size=1000"
                  [ -n "$page_token" ] && url="$url&page_token=$page_token"
                  resp=$(curl -fsS "$url")
                  echo "$resp" | jq -c '.relation_tuples[]' >> /tmp/current.raw
                  page_token=$(echo "$resp" | jq -r '.next_page_token // ""')
                  [ -z "$page_token" ] && break
                done
              done
              jq -cS "$CANON" < /tmp/current.raw | sort -u > /tmp/current.sorted

              comm -23 /tmp/desired.sorted /tmp/current.sorted > /tmp/to_add.jsonl
              comm -13 /tmp/desired.sorted /tmp/current.sorted > /tmp/to_remove.jsonl

              added=$(wc -l < /tmp/to_add.jsonl | tr -d ' ')
              removed=$(wc -l < /tmp/to_remove.jsonl | tr -d ' ')
              echo "Reconcile plan: +$added / -$removed"

              # --- Apply PUTs.
              while IFS= read -r row; do
                [ -z "$row" ] && continue
                echo "+ $row"
                curl -fsS -X PUT \
                  -H 'Content-Type: application/json' \
                  -d "$row" \
                  "$KETO_WRITE/admin/relation-tuples" > /dev/null
              done < /tmp/to_add.jsonl

              # --- Apply DELETEs. curl -G --data-urlencode handles colons /
              # spaces in tuple values. Both subject_id and subject_set
              # variants share the namespace/object/relation params; only the
              # subject form differs.
              while IFS= read -r row; do
                [ -z "$row" ] && continue
                echo "- $row"
                ns=$(echo "$row" | jq -r '.namespace')
                obj=$(echo "$row" | jq -r '.object')
                rel=$(echo "$row" | jq -r '.relation')
                if echo "$row" | jq -e '.subject_id' > /dev/null; then
                  sub=$(echo "$row" | jq -r '.subject_id')
                  curl -fsS -G -X DELETE \
                    --data-urlencode "namespace=$ns" \
                    --data-urlencode "object=$obj" \
                    --data-urlencode "relation=$rel" \
                    --data-urlencode "subject_id=$sub" \
                    "$KETO_WRITE/admin/relation-tuples" > /dev/null
                else
                  ssns=$(echo "$row" | jq -r '.subject_set.namespace')
                  ssobj=$(echo "$row" | jq -r '.subject_set.object')
                  ssrel=$(echo "$row" | jq -r '.subject_set.relation')
                  curl -fsS -G -X DELETE \
                    --data-urlencode "namespace=$ns" \
                    --data-urlencode "object=$obj" \
                    --data-urlencode "relation=$rel" \
                    --data-urlencode "subject_set.namespace=$ssns" \
                    --data-urlencode "subject_set.object=$ssobj" \
                    --data-urlencode "subject_set.relation=$ssrel" \
                    "$KETO_WRITE/admin/relation-tuples" > /dev/null
                fi
              done < /tmp/to_remove.jsonl

              echo "Reconcile complete."
            EOT
          ]

          volume_mount {
            name       = "reconcile"
            mount_path = "/reconcile"
          }
        }

        volume {
          name = "reconcile"
          config_map {
            name = kubernetes_config_map.keto_reconcile_desired.metadata[0].name
          }
        }
      }
    }
  }

  wait_for_completion = true

  depends_on = [helm_release.keto, helm_release.kratos]
}
