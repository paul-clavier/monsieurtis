output "bucket_name" {
  description = "Object Store bucket name. Use as the `bucket` in each root's backend.tf."
  value       = civo_object_store.state.name
}

output "endpoint" {
  description = "S3 endpoint for the backend `endpoints.s3` setting."
  value       = "https://objectstore.${lower(var.civo_region)}.civo.com"
}

output "bucket_url" {
  description = "Object Store URL as reported by Civo."
  value       = civo_object_store.state.bucket_url
}

output "access_key_id" {
  description = "Access key for the state bucket. Store in 1Password as op://infra/civo-state/access_key_id."
  value       = civo_object_store_credential.state.access_key_id
  sensitive   = true
}

output "secret_access_key" {
  description = "Secret key for the state bucket. Store in 1Password as op://infra/civo-state/secret_access_key."
  value       = civo_object_store_credential.state.secret_access_key
  sensitive   = true
}
