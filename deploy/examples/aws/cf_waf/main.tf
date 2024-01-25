# cf_waf module
# This module will create a WAF WebACL for AdVISE. It takes a list of
# allowed, fully-specified CIDRs, and a list of one or more NAT IPs
# so that the app can connect to itself.
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.33.0"
    }
  }
  required_version = "~> 1.4.6"
}

output "arn" {
  value = one(aws_wafv2_web_acl.default[*].arn)
}
output "id" {
  value = one(aws_wafv2_web_acl.default[*].id)
}
