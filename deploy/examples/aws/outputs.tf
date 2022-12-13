output "bastion_fqdn" {
  value = module.bastion.fqdn
}
output "advise_app_fqdn" {
  value = aws_route53_record.advise_app.fqdn
}
output "advise_oauth_fqdn" {
  value = aws_route53_record.advise_oauth.fqdn
}

output "app_ecr_url" {
  value = module.app_registry.repository_url
}
output "proxy_ecr_url" {
  value = module.proxy_registry.repository_url
}

output "ecr_login_host" {
  value = "${module.app_registry.registry_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}
