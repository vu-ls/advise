variable "allowed_cidrs" {
  description = "CIDRs to allow for the WAF Web ACL"
  type        = list(string)
}

variable "vpc_nat_ips" {
  description = "VPC NAT IPs to allow for the WAF Web ACL"
  type        = list(string)
  default     = []
}

variable "canary_header" {
  description = "Canary header config to allow through WAF"
  type = object({
    http_header_name  = string
    http_header_value = string
  })
}

variable "name_prefix" {
  description = "name prefix for resource creation"
  type        = string
}

variable "unique_id" {
  description = "unique id for resource creation"
  type        = string
}

variable "shortname" {
  description = "single-word short name to help identify web acl components"
  type        = string
  default     = "default"
}
