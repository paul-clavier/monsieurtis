terraform {
  backend "s3" {
    bucket                      = "tf-state-monsieurtis"
    key                         = "bootstrap/terraform.tfstate"
    region                      = "FRA1"
    endpoints                   = { s3 = "https://objectstore.fra1.civo.com" }
    use_path_style              = true
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
  }
}
