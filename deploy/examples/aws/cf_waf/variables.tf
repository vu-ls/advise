variable "allowed_cidrs" {
  description = "CIDRs to allow for the WAF Web ACL"
  type        = list(string)
}

variable "vpc_nat_ips" {
  description = "VPC NAT IPs to allow for the WAF Web ACL"
  type        = list(string)
  default     = []
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
