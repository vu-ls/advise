# application secrets

module "app_master_secret" {
  source      = "./modules/aws/secrets"
  name_prefix = "${local.name_prefix}-app-secret"
  username    = var.db_app_master_username
}

module "oauth_master_secret" {
  source      = "./modules/aws/secrets"
  name_prefix = "${local.name_prefix}-oauth-secret"
  username    = var.db_oauth_master_username
}
