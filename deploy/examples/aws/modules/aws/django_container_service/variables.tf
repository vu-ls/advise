variable "cluster" {
  description = "ECS cluster configuration object"
  type = object({
    id = string
  })
}

variable "app_repository" {
  description = "Object describing the application image repository"
  type = object({
    name           = string
    repository_url = string
  })
}

variable "proxy_repository" {
  description = "Object describing the proxy image repository"
  type = object({
    name           = string
    repository_url = string
  })
}

variable "app_image_version" {
  description = "image version to use when pulling the application container"
  type        = string
  default     = "latest"
}

variable "proxy_image_version" {
  description = "image version to use when pulling the proxy container"
  type        = string
  default     = "latest"
}

variable "app_log_group_name" {
  description = "log group for awslogs for the application (default from name prefix)"
  type        = string
  default     = null
}

variable "proxy_log_group_name" {
  description = "log group for awslogs for the proxy (default from name prefix)"
  type        = string
  default     = null
}

variable "desired_count" {
  description = "Number of tasks to execute"
  type        = number
  default     = 1
}

variable "minimum_healthy_percent" {
  description = "Percent of tasks that must be healthy for the service to be healthy"
  type        = number
  default     = 100
}

variable "maximum_percent" {
  description = "Maximum percent of tasks that are allowed to run concurrently"
  type        = number
  default     = 200
}

variable "force_new_deployment" {
  description = "Force a new deployment on service update"
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Allow Terraform to delete these resources?"
  type        = bool
  default     = true
}
variable "domain_name" {
  description = "FQDN of the zone where DNS records should be created"
  type        = string
}

variable "service_fqdn" {
  description = "FQDN for the load balancer this service creates (must be inside domain_name)"
  type        = string
}

variable "app_env_vars" {
  description = "List of name/value pairs to specify app container environment"
  #type        = string
  type = list(object({
    name  = string
    value = string
  }))
}

variable "proxy_env_vars" {
  description = "List of name/value pairs to specify proxy container environment"
  #type        = string
  type = list(object({
    name  = string
    value = string
  }))
}

variable "rotation_key" {
  description = "Protection header random id value will rotate when this value is changed"
  type        = string
  default     = "default"
}

variable "network" {
  description = "VPC configuration"
  type = object({
    vpc_id          = string
    private_subnets = list(string)
    public_subnets  = list(string)
  })
}

resource "random_id" "cf_protection_header" {
  keepers = {
    rotation_key = var.rotation_key
  }
  byte_length = 8
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
  unique_id            = random_id.id.hex
  app_log_group_name   = var.app_log_group_name != null ? var.app_log_group_name : "/ecs/${var.name_prefix}-app-${local.unique_id}"
  proxy_log_group_name = var.proxy_log_group_name != null ? var.proxy_log_group_name : "/ecs/${var.name_prefix}-proxy-${local.unique_id}"
  cf_protection_header = {
    http_header_name  = "X-${substr(var.name_prefix, 0, 10)}-cf-prot-${random_id.cf_protection_header.hex}"
    http_header_value = random_id.cf_protection_header.b64_url
  }
}
