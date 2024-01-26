module "monitoring" {
  source               = "./modules/aws/monitoring"
  name_prefix          = "${local.name_prefix}-mon"
  notify_webhook_url   = var.ecs_notify_webhook_url
  notify_webhook_token = var.ecs_notify_webhook_token

  app_ecs_cluster_name   = module.cluster.name
  app_ecs_service_name   = module.app_service.ecs_service_name
  oauth_ecs_cluster_name = module.cluster.name
  oauth_ecs_service_name = module.oauth_service.ecs_service_name

  app_fqdn   = local.app_fqdn
  oauth_fqdn = local.oauth_fqdn

  memory_percent_threshold  = var.memory_alarm_threshold
  cpu_percent_threshold     = var.cpu_alarm_threshold
  db_storage_threshold      = var.db_free_storage_threshold
  db_connections_threshold  = var.db_connections_threshold
  elb_5xx_threshold         = var.elb_5xx_alarm_threshold
  app_elb_id                = module.app_service.elb_id
  oauth_elb_id              = module.oauth_service.elb_id
  app_rds_id                = module.advise_db.db_id
  oauth_rds_id              = module.oauth_db.db_id
  canary_duration_threshold = var.canary_duration_threshold

  sns_kms_key = module.keys.sns_id
}
