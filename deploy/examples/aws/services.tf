# AdVISE Service definitions

# Set up a cluster
module "cluster" {
  source      = "./modules/aws/cluster"
  name_prefix = local.name_prefix
}

# Application service
module "app_service" {
  source                  = "./modules/aws/django_container_service"
  name_prefix             = "${local.name_prefix}-app-service"
  cluster                 = module.cluster
  app_repository          = module.app_registry
  proxy_repository        = module.proxy_registry
  app_image_version       = var.advise_image_version
  proxy_image_version     = var.advise_proxy_image_version
  app_log_group_name      = "/ecs/${local.name_prefix}-app-${local.unique_id}"
  proxy_log_group_name    = "/ecs/${local.name_prefix}-proxy-${local.unique_id}"
  log_retention_days      = var.log_retention_days
  desired_count           = 1
  minimum_healthy_percent = 100
  maximum_percent         = 200
  force_new_deployment    = true
  deletion_protection     = false # revisit for production
  domain_name             = var.domain_name
  service_fqdn            = local.app_svc_fqdn
  rotation_key            = var.advise_app_secret_key
  network                 = module.advise_vpc

  app_env_vars = [
    {
      name  = "WSGI_APP"
      value = "advise.wsgi"
    },
    {
      name  = "WORKDIR"
      value = "."
    },
    {
      name  = "DB_NAME"
      value = "${module.advise_db.db_name}"
    },
    {
      name  = "DB_HOST"
      value = "${module.advise_db.db_address}"
    },
    {
      name  = "RDS_SECRET_ARN"
      value = "${module.app_master_secret.arn}"
    },
    {
      name  = "OAUTH_SERVER_FQDN"
      value = "${local.oauth_fqdn}"
    },
    {
      name  = "OAUTH_LB_FQDN"
      value = "${local.oauth_svc_fqdn}"
    },
    {
      name  = "APP_SERVER_FQDN"
      value = "${local.app_fqdn}"
    },
    {
      name  = "APP_LB_FQDN"
      value = "${local.app_svc_fqdn}"
    },
    {
      name  = "STATIC_SERVER_FQDN"
      value = "${local.app_fqdn}"
    },
    {
      name  = "OAUTH_SERVER_BASEURL"
      value = "https://${local.oauth_fqdn}"
    },
    {
      name  = "DEPLOYMENT_TYPE"
      value = "AWS"
    },
    {
      name  = "AWS_REGION"
      value = "${var.aws_region}"
    },
    {
      name  = "ACCOUNT_EMAIL_VERIFICATION"
      value = var.account_email_verification
    },
    {
      name  = "ACCOUNT_DEFAULT_HTTP_PROTOCOL"
      value = "https"
    },
    {
      name  = "AWS_STORAGE_BUCKET_NAME"
      value = "${module.app_static_bucket.id}"
    },
    {
      name  = "AWS_ATTACHMENT_FILES_STORAGE_BUCKET_NAME"
      value = "${module.app_attachments_bucket.id}"
    },
    {
      name  = "AWS_MEDIA_FILES_STORAGE_BUCKET_NAME"
      value = "${module.app_media_bucket.id}"
    },
    {
      name  = "DEBUG"
      value = "${var.advise_django_debug}"
    },
    {
      name  = "ADVISE_SECRET_KEY"
      value = "${var.advise_app_secret_key}"
    },
    {
      name  = "DJANGO_SUPERUSER_USERNAME"
      value = "${nonsensitive(var.advise_superuser_username)}"
    },
    {
      name  = "DJANGO_SUPERUSER_PASSWORD"
      value = "${nonsensitive(var.advise_superuser_password)}"
    },
    {
      name  = "EMAIL_BACKEND"
      value = "${var.advise_email_backend}"
    },
    {
      name  = "CONTACT_EMAIL"
      value = "${var.advise_contact_address}"
    },
    {
      name  = "USE_PROVIDER"
      value = "${var.advise_use_provider}"
    },
    {
      name  = "REGISTRATION_LINK"
      value = "${var.advise_registration_link}"
    },
    {
      name  = "RECAPTCHA_SITE_KEY"
      value = "${var.advise_recaptcha_site_key}"
    },
    {
      name  = "RECAPTCHA_SECRET_KEY"
      value = "${var.advise_recaptcha_secret_key}"
    },
    {
      name  = "ADVISE_LOG_GROUP_NAME"
      value = "${local.name_prefix}-app-${local.unique_id}"
    }
  ]

  proxy_env_vars = [
    {
      name  = "AWS_REGION"
      value = "${var.aws_region}"
    },
    {
      name  = "APP_SERVER_FQDN"
      value = "${local.app_fqdn}"
    },
    {
      name  = "APP_UPSTREAM_NAME"
      value = "localhost"
    },
    {
      name  = "APP_UPSTREAM_PORT"
      value = "8000"
    },
    {
      name  = "PROXY_PORT"
      value = "80"
    }
  ]
}


# OAuth Provider Service
# Application service
module "oauth_service" {
  source                  = "./modules/aws/django_container_service"
  name_prefix             = "${local.name_prefix}-oauth-service"
  cluster                 = module.cluster
  app_repository          = module.app_registry
  proxy_repository        = module.proxy_registry
  app_image_version       = var.oauth_image_version
  proxy_image_version     = var.oauth_proxy_image_version
  app_log_group_name      = "/ecs/${local.name_prefix}-oauth-${local.unique_id}"
  proxy_log_group_name    = "/ecs/${local.name_prefix}-oauth-proxy-${local.unique_id}"
  log_retention_days      = var.log_retention_days
  desired_count           = 1
  minimum_healthy_percent = 100
  maximum_percent         = 200
  force_new_deployment    = true
  deletion_protection     = false # revisit for production
  domain_name             = var.domain_name
  service_fqdn            = local.oauth_svc_fqdn
  rotation_key            = var.advise_oauth_secret_key
  network                 = module.advise_vpc

  app_env_vars = [
    {
      name  = "WSGI_APP"
      value = "oauth2provider.wsgi"
    },
    {
      name  = "WORKDIR"
      value = "oauth2provider"
    },
    {
      name  = "DB_NAME"
      value = "${module.oauth_db.db_name}"
    },
    {
      name  = "DB_HOST"
      value = "${module.oauth_db.db_address}"
    },
    {
      name  = "RDS_SECRET_ARN"
      value = "${module.oauth_master_secret.arn}"
    },
    {
      name  = "OAUTH_SERVER_FQDN"
      value = "${local.oauth_fqdn}"
    },
    {
      name  = "OAUTH_LB_FQDN"
      value = "${local.oauth_svc_fqdn}"
    },
    {
      name  = "APP_SERVER_FQDN"
      value = "${local.app_fqdn}"
    },
    {
      name  = "APP_LB_FQDN"
      value = "${local.app_svc_fqdn}"
    },
    {
      name  = "STATIC_SERVER_FQDN"
      value = "${local.oauth_fqdn}"
    },
    {
      name  = "OAUTH_SERVER_BASEURL"
      value = "https://${local.oauth_fqdn}"
    },
    {
      name  = "DASHBOARD_LINK"
      value = "https://${local.app_fqdn}/advise/dashboard/"
    },
    {
      name  = "DEPLOYMENT_TYPE"
      value = "AWS"
    },
    {
      name  = "AWS_REGION"
      value = "${var.aws_region}"
    },
    {
      name  = "ACCOUNT_EMAIL_VERIFICATION"
      value = var.account_email_verification
    },
    {
      name  = "ACCOUNT_DEFAULT_HTTP_PROTOCOL"
      value = "https"
    },
    {
      name  = "AWS_STORAGE_BUCKET_NAME"
      value = "${module.oauth_static_bucket.id}"
    },
    {
      name  = "DEBUG"
      value = "${var.advise_django_debug}"
    },
    {
      name  = "OAUTH2PROVIDER_SECRET_KEY"
      value = "${var.advise_oauth_secret_key}"
    },
    {
      name  = "DJANGO_SUPERUSER_USERNAME"
      value = "${nonsensitive(var.advise_superuser_username)}"
    },
    {
      name  = "DJANGO_SUPERUSER_PASSWORD"
      value = "${nonsensitive(var.advise_superuser_password)}"
    },
    {
      name  = "EMAIL_BACKEND"
      value = "${var.oauth_email_backend}"
    },
    {
      name  = "CONTACT_EMAIL"
      value = "${var.oauth_contact_address}"
    },
    {
      name  = "RECAPTCHA_SITE_KEY"
      value = "${var.advise_recaptcha_site_key}"
    },
    {
      name  = "RECAPTCHA_SECRET_KEY"
      value = "${var.advise_recaptcha_secret_key}"
    },
    {
      name  = "OAUTH_LOG_GROUP_NAME"
      value = "${local.name_prefix}-oauth-${local.unique_id}"
    }
  ]

  proxy_env_vars = [
    {
      name  = "AWS_REGION"
      value = "${var.aws_region}"
    },
    {
      name  = "APP_SERVER_FQDN"
      value = "${local.oauth_fqdn}"
    },
    {
      name  = "APP_UPSTREAM_NAME"
      value = "localhost"
    },
    {
      name  = "APP_UPSTREAM_PORT"
      value = "8000"
    },
    {
      name  = "PROXY_PORT"
      value = "80"
    }
  ]
}
