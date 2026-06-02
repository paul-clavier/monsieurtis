locals {
  auth_host = "auth.${var.domain}"
  id_host   = "id.${var.domain}"

  # In-cluster DNS — used by Hydra → Kratos, by Crocus → admin APIs, by apps → Keto.
  kratos_public_svc = "http://kratos-public.${var.namespace}.svc.cluster.local"
  kratos_admin_svc  = "http://kratos-admin.${var.namespace}.svc.cluster.local"
  hydra_public_svc  = "http://hydra-public.${var.namespace}.svc.cluster.local:4444"
  hydra_admin_svc   = "http://hydra-admin.${var.namespace}.svc.cluster.local:4445"
  keto_read_svc     = "http://keto-read.${var.namespace}.svc.cluster.local:80"
  keto_write_svc    = "http://keto-write.${var.namespace}.svc.cluster.local:80"

  # Database DSNs. Bitnami postgres exposes the service as `postgres-postgresql`
  # (release name + `-postgresql`). We use the `postgres` superuser for simplicity
  # in a single-tenant cluster — split into per-service roles if you ever multi-tenant.
  pg_host     = "postgres-postgresql.${var.namespace}.svc.cluster.local"
  pg_dsn_base = "postgres://postgres:${urlencode(var.postgres_password)}@${local.pg_host}:5432"

  kratos_dsn = "${local.pg_dsn_base}/kratos?sslmode=disable&max_conns=20&max_idle_conns=4"
  hydra_dsn  = "${local.pg_dsn_base}/hydra?sslmode=disable&max_conns=20&max_idle_conns=4"
  keto_dsn   = "${local.pg_dsn_base}/keto?sslmode=disable&max_conns=20&max_idle_conns=4"

  # Rendered Ory configs (templates live in ./config/*.yaml.tftpl).
  google_jsonnet_b64 = filebase64("${path.module}/config/google.jsonnet")

  kratos_config = templatefile("${path.module}/config/kratos.yaml.tftpl", {
    auth_host          = local.auth_host
    kratos_public_url  = "https://${local.auth_host}"
    google_jsonnet_b64 = local.google_jsonnet_b64
    smtp_from_address  = var.smtp_from_address
    hydra_admin_url    = local.hydra_admin_svc
  })

  hydra_config = templatefile("${path.module}/config/hydra.yaml.tftpl", {
    auth_host  = local.auth_host
    id_host    = local.id_host
    public_url = "https://${local.id_host}"
  })

  keto_config = templatefile("${path.module}/config/keto.yaml.tftpl", {
    namespaces = ["app", "team", "crocus-admin"]
  })

  identity_schema = file("${path.module}/config/identity.schema.json")
}
