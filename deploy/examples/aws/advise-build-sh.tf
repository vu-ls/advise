resource "local_file" "advise_build_sh" {
  content = templatefile(
    "${path.module}/templates/advise-build.sh.tplfl",
    {
      name_prefix                = local.name_prefix
      unique_id                  = local.unique_id
      aws_region                 = var.aws_region
      advise_app_fqdn            = local.app_fqdn
      advise_oauth_fqdn          = local.oauth_fqdn
      ecr_registry_id            = module.app_registry.registry_id
      ecr_app_repository_url     = module.app_registry.repository_url
      ecr_proxy_repository_url   = module.proxy_registry.repository_url
      advise_image_version       = var.advise_image_version
      advise_proxy_image_version = var.advise_proxy_image_version
      advise_recaptcha_site_key  = var.advise_recaptcha_site_key
      #tpl_kms_key                 = aws_kms_key.vault.id
      #account_id                  = data.aws_caller_identity.current.account_id
  })
  filename = "${path.module}/advise-build.sh"
}
