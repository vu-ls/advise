# cf_cert module
# Create an AWS ACM certificate for use in Cloudfront distributions.
# These must be created in us-east-1. Using a module with a provider
# configuration passed into it allows for an AdVISE deployment in a
# region other than us-east-1, while creating the certificates needed
# inside us-east-1. 
#
# Note that this module does not handle creating the DNS records for
# domain validation. It simply creates the certificate and provides
# an output for the user to set up domain validation on their own.

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "4.66.1"
    }
  }
  required_version = "~> 1.4.6"
}
resource "aws_acm_certificate" "acm_cert" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  tags = {
    Name = "${var.name_prefix}-acm-cert-${var.unique_id}"
  }

  lifecycle {
    create_before_destroy = true
  }
}

output "arn" {
  value = aws_acm_certificate.acm_cert.arn
}
output "domain_validation_options" {
  value = aws_acm_certificate.acm_cert.domain_validation_options
}
