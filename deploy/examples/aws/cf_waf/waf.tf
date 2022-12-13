# WAF Web ACLs for cloudfront

resource "aws_wafv2_ip_set" "default" {
  count              = length(var.allowed_cidrs) > 0 ? 1 : 0
  name               = "${var.name_prefix}-waf-ip-set-${var.shortname}-${var.unique_id}"
  description        = "${var.name_prefix} ${var.shortname} allowed IPs managed by terraform"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  addresses          = concat(var.allowed_cidrs, [for ip in var.vpc_nat_ips : "${ip}/32"])

  tags = {
    Name = "${var.name_prefix}-waf-ip-set-${var.unique_id}"
  }
}

resource "aws_wafv2_web_acl" "default" {
  count       = length(var.allowed_cidrs) > 0 ? 1 : 0
  name        = "${var.name_prefix}-waf-web-acl-${var.shortname}-${var.unique_id}"
  description = "${var.name_prefix} ${var.shortname} web acl managed by terraform"
  scope       = "CLOUDFRONT"

  default_action {
    block {}
  }

  rule {
    name     = "${var.shortname}-allow-by-cidrs"
    priority = 10

    action {
      allow {}
    }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.default[0].arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = false
      metric_name                = "${var.name_prefix}-waf-ip-rule-${var.shortname}-${var.unique_id}"
      sampled_requests_enabled   = false
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = false
    metric_name                = "${var.name_prefix}-waf-web-acl-${var.shortname}-${var.unique_id}"
    sampled_requests_enabled   = false
  }

  tags = {
    Name = "${var.name_prefix}-waf-web-acl-${var.unique_id}"
  }
}
