# advise app database
module "advise_db" {
  source = "./modules/aws/db"

  name_prefix          = "${local.name_prefix}-rds-app"
  db_name              = "advise_db"
  multi_az             = var.multi_az
  network              = module.advise_vpc
  family               = "postgres14"
  major_version        = 14
  allow_additional_ips = [module.bastion.private_ip]
  db_username_secret   = module.app_master_secret.arn
  db_password_secret   = module.app_master_secret.arn
  instance_type        = var.db_app_instance_type

  backup_retention_period = 1
  skip_final_snapshot     = true
  deletion_protection     = false

  depends_on = [
    module.app_master_secret
  ]
}

# oauth provider db
module "oauth_db" {
  source = "./modules/aws/db"

  name_prefix          = "${local.name_prefix}-rds-oauth"
  db_name              = "oauth_db"
  multi_az             = var.multi_az
  network              = module.advise_vpc
  family               = "postgres14"
  major_version        = 14
  allow_additional_ips = [module.bastion.private_ip]
  db_username_secret   = module.oauth_master_secret.arn
  db_password_secret   = module.oauth_master_secret.arn
  instance_type        = var.db_oauth_instance_type

  backup_retention_period = 1
  skip_final_snapshot     = true
  deletion_protection     = false

  depends_on = [
    module.oauth_master_secret
  ]
}
