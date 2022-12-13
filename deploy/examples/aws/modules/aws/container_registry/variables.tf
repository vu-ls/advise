variable "force_delete" {
  description = "Allow a non-empty registry to be deleted"
  type        = bool
  default     = false
}

variable "retain" {
  description = "Number of images to retain in the registry"
  type        = number
  default     = 10
}

variable "name_prefix" {
  description = "Prefix for AWS resource names"
  type        = string
}

# generate a random id to use for naming resources
resource "random_id" "id" {
  byte_length = 8
}

locals {
  unique_id = random_id.id.hex
}
