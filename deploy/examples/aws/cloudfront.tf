# advise cloudfront distributions

resource "aws_cloudfront_distribution" "advise_app" {
  # application origin
  origin {
    domain_name = module.app_service.fqdn
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1"]
    }
    custom_header {
      name  = module.app_service.cf_protection_header.http_header_name
      value = module.app_service.cf_protection_header.http_header_value
    }
    origin_id = "advise_app"
  }

  # static files origin
  origin {
    domain_name = module.app_static_bucket.url
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.app_static_bucket.cloudfront_access_identity_path
    }
    origin_id = "advise_static"
  }

  # attachment files origin
  # Note: Attachments are served through the app to enforce permissions. The app
  #       accesses them through the bucket directly, and has AWS permissions to
  #       do so. They shouldn't normally be available through cloudfront.
  #origin {
  #  domain_name = module.app_attachments_bucket.url
  #  s3_origin_config {
  #    origin_access_identity = aws_cloudfront_origin_access_identity.app_attachments_bucket.cloudfront_access_identity_path
  #  }
  #  origin_id = "advise_attachments"
  #}

  # media files origin
  origin {
    domain_name = module.app_media_bucket.url
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.app_media_bucket.cloudfront_access_identity_path
    }
    origin_id = "advise_media"
  }

  enabled         = true
  is_ipv6_enabled = true
  comment         = "AdVISE"
  price_class     = "PriceClass_100"
  aliases         = ["${local.app_fqdn}"]
  web_acl_id      = module.cf_waf_advise.arn

  # application behavior
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "advise_app"
    cache_policy_id        = aws_cloudfront_cache_policy.advise_app_endpoints.id
    viewer_protocol_policy = "redirect-to-https"
  }

  # static files behavior
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "advise_static"
    cache_policy_id        = aws_cloudfront_cache_policy.advise_s3_endpoints.id
    viewer_protocol_policy = "redirect-to-https"
  }

  # attachments files behavior
  # Note: Attachments are served through the app to enforce permissions. The app
  #       accesses them through the bucket directly, and has AWS permissions to
  #       do so. They shouldn't normally be available through cloudfront.
  #ordered_cache_behavior {
  #  path_pattern           = "/attachments/*"
  #  allowed_methods        = ["GET", "HEAD", "OPTIONS"]
  #  cached_methods         = ["GET", "HEAD", "OPTIONS"]
  #  target_origin_id       = "advise_attachments"
  #  cache_policy_id        = aws_cloudfront_cache_policy.advise_s3_endpoints.id
  #  viewer_protocol_policy = "redirect-to-https"
  #}

  # static files behavior
  ordered_cache_behavior {
    path_pattern           = "/media/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "advise_media"
    cache_policy_id        = aws_cloudfront_cache_policy.advise_s3_endpoints.id
    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
      locations        = []
    }
  }
  viewer_certificate {
    acm_certificate_arn      = module.app_cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# oauth distribution
resource "aws_cloudfront_distribution" "advise_oauth" {
  # application origin
  origin {
    domain_name = module.oauth_service.fqdn
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1"]
    }
    custom_header {
      name  = module.oauth_service.cf_protection_header.http_header_name
      value = module.oauth_service.cf_protection_header.http_header_value
    }
    origin_id = "advise_oauth"
  }

  # static files origin
  origin {
    domain_name = module.oauth_static_bucket.url
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oauth_static_bucket.cloudfront_access_identity_path
    }
    origin_id = "advise_static"
  }

  enabled         = true
  is_ipv6_enabled = true
  comment         = "AdVISE OAuth"
  price_class     = "PriceClass_100"
  aliases         = ["${local.oauth_fqdn}"]
  web_acl_id      = module.cf_waf_advise.arn

  # application behavior
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "advise_oauth"
    cache_policy_id        = aws_cloudfront_cache_policy.advise_app_endpoints.id
    viewer_protocol_policy = "redirect-to-https"
  }

  # static files behavior
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "advise_static"
    cache_policy_id        = aws_cloudfront_cache_policy.advise_s3_endpoints.id
    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
      locations        = []
    }
  }
  viewer_certificate {
    acm_certificate_arn      = module.oauth_cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# cache policies
# should be the same for both oauth and app at this point
resource "aws_cloudfront_cache_policy" "advise_app_endpoints" {
  name        = "${local.name_prefix}-advise-endpoints-cache-policy-${local.unique_id}"
  default_ttl = 0
  max_ttl     = 86400
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "all"
      #cookies {
      #  items = ["csrftoken"]
      #}
    }
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = [
          "Authorization",
          "Host",
          "Referer",
          "X-csrftoken"
        ]
      }
    }
    query_strings_config {
      query_string_behavior = "all"
    }
  }
}

# cache policy for s3 endpoints
resource "aws_cloudfront_cache_policy" "advise_s3_endpoints" {
  name        = "advise-s3-cache-policy"
  default_ttl = 60
  max_ttl     = 86400
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Access-Control-Request-Headers", "Access-Control-Request-Method", "Origin"]
      }
    }
    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

# advise hostname creation
resource "aws_route53_record" "advise_app" {
  zone_id = data.aws_route53_zone.primary.id
  name    = local.app_fqdn
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.advise_app.domain_name
    zone_id                = aws_cloudfront_distribution.advise_app.hosted_zone_id
    evaluate_target_health = true
  }
}

# certificate for advise app
module "app_cert" {
  source = "./modules/aws/cf_cert"
  providers = {
    aws = aws.cf_certs_region
  }

  domain_name = local.app_fqdn
  name_prefix = "${local.name_prefix}-app"
  unique_id   = local.unique_id
}


# validate certificate for advise app
resource "aws_route53_record" "advise_app_cert_validation" {
  for_each = {
    for dvo in module.app_cert.domain_validation_options : dvo.domain_name => {
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

# oath hostname creation
resource "aws_route53_record" "advise_oauth" {
  zone_id = data.aws_route53_zone.primary.id
  name    = local.oauth_fqdn
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.advise_oauth.domain_name
    zone_id                = aws_cloudfront_distribution.advise_oauth.hosted_zone_id
    evaluate_target_health = true
  }
}

# certificate for advise oauth
module "oauth_cert" {
  source = "./modules/aws/cf_cert"
  providers = {
    aws = aws.cf_certs_region
  }

  domain_name = local.oauth_fqdn
  name_prefix = "${local.name_prefix}-oauth"
  unique_id   = local.unique_id
}


# validate certificate for advise oauth
resource "aws_route53_record" "advise_oauth_cert_validation" {
  for_each = {
    for dvo in module.oauth_cert.domain_validation_options : dvo.domain_name => {
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

# web acls
module "cf_waf_advise" {
  source = "./cf_waf"

  providers = {
    aws = aws.cf_certs_region
  }

  allowed_cidrs = var.advise_allowed_cidrs
  vpc_nat_ips   = module.advise_vpc.nat_public_ips
  canary_header = module.monitoring.canary_header
  shortname     = "advise"
  name_prefix   = local.name_prefix
  unique_id     = local.unique_id
}
