variable "name_prefix" {
  description = "Prefix for AWS resource names"
  type        = string
}

variable "username" {
  description = "username to encode in secret"
  type        = string
}

variable "password" {
  description = "password to encode in secret (default randomly generated)"
  type        = string
  default     = null
}

# generate a random id to use for naming resources
resource "random_id" "id" {
  byte_length = 8
}

locals {
  unique_id = random_id.id.hex
}
