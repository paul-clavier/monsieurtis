variable "civo_region" {
  description = "Civo region for the Object Store. Keep in the same region as the cluster."
  type        = string
  default     = "FRA1"
}

variable "bucket_name" {
  description = "Name of the Object Store bucket that holds all tofu state. Must be globally unique within the region."
  type        = string
  default     = "tf-state-monsieurtis"
}

variable "max_size_gb" {
  description = "Object Store size. 500 GB is the Civo minimum."
  type        = number
  default     = 500
}
