# get zone ref
data "aws_route53_zone" "primary" {
  name = var.domain_name
}

# advise hostname creation
resource "aws_route53_record" "app_lb" {
  zone_id = data.aws_route53_zone.primary.id
  name    = var.service_fqdn
  type    = "A"

  alias {
    name                   = aws_lb.default.dns_name
    zone_id                = aws_lb.default.zone_id
    evaluate_target_health = true
  }
}

# certificate for advise app lb
module "lb_cert" {
  source = "../cf_cert"
  # don't send a provider because the LB cert should be created in the same
  # region as the LB
  #providers = {
  #  aws = aws #.cf_certs_region
  #}

  domain_name = var.service_fqdn
  name_prefix = "${var.name_prefix}-lb"
  unique_id   = local.unique_id
}

# validate certificate for advise app lb
resource "aws_route53_record" "lb_cert_validation" {
  for_each = {
    for dvo in module.lb_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.primary.id
}
