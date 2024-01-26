variable "name_prefix" {
  description = "Prefix for AWS resource names"
  type        = string
}

variable "notify_webhook_url" {
  description = "Webhook URL to receive notifications"
  type        = string
}

variable "notify_webhook_token" {
  description = "Access token for webhook URL"
  type        = string
}

variable "app_ecs_service_name" {
  description = "ECS service name for the application"
  type        = string
}

variable "oauth_ecs_service_name" {
  description = "ECS service name for the oauth provider"
  type        = string
}

variable "app_ecs_cluster_name" {
  description = "ECS cluster name for the application"
  type        = string
}

variable "oauth_ecs_cluster_name" {
  description = "ECS cluster name for the oauth provider"
  type        = string
}

variable "app_elb_id" {
  description = "ELB name for the application"
  type        = string
}

variable "oauth_elb_id" {
  description = "ELB name for the oauth provider"
  type        = string
}

variable "app_rds_id" {
  description = "RDS instance id for the application"
  type        = string
}

variable "oauth_rds_id" {
  description = "RDS instance id for the oauth provider"
  type        = string
}

variable "app_fqdn" {
  description = "FQDN of application endpoint"
  type        = string
}

variable "oauth_fqdn" {
  description = "FQDN of oauth endpoint"
  type        = string
}

variable "db_connections_threshold" {
  description = "Threshold for number of DB connections alerts"
  type        = number
}

variable "db_storage_threshold" {
  description = "Threshold in bytes for free storage alerts"
  type        = number
}

variable "memory_percent_threshold" {
  description = "Memory percentage threshold for alerts"
  type        = number
}

variable "cpu_percent_threshold" {
  description = "CPU percentage threshold for alerts"
  type        = number
}

variable "elb_5xx_threshold" {
  description = "5xx error count threshold"
  type        = number
}

variable "canary_success_threshold" {
  description = "Percent success threshold for canary checks (defaults to 100)"
  type        = number
  default     = 100
}

variable "canary_success_period" {
  description = "Success check period in s (defaults to 300)"
  type        = number
  default     = 300
}


variable "canary_duration_threshold" {
  description = "Duration threshold for canaries in ms (defaults to 1000)"
  type        = number
  default     = 1000
}

variable "canary_duration_period" {
  description = "Duration check period in s (defaults to 300)"
  type        = number
  default     = 300
}

variable "sns_kms_key" {
  description = "KMS key id for SNS"
  type        = string
}


variable "rotation_key" {
  description = "Protection header random id value will rotate when this value is changed"
  type        = string
  default     = "default"
}

resource "random_id" "canary_protection_header" {
  keepers = {
    rotation_key = var.rotation_key
  }
  byte_length = 8
}

# generate a random id to use for naming resources
resource "random_id" "id" {
  byte_length = 8
}

locals {
  unique_id = random_id.id.hex

  canary_protection_header = {
    http_header_name  = "x-${substr(var.name_prefix, 0, 10)}-cnry-prot-${random_id.canary_protection_header.hex}"
    http_header_value = random_id.canary_protection_header.b64_url
  }
}
