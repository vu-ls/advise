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
