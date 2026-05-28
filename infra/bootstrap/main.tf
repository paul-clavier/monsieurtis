provider "civo" {
  region = var.civo_region
}

resource "civo_object_store_credential" "state" {
  name   = "tofu-state"
  region = var.civo_region
}

resource "civo_object_store" "state" {
  name          = var.bucket_name
  max_size_gb   = var.max_size_gb
  region        = var.civo_region
  access_key_id = civo_object_store_credential.state.access_key_id
}
