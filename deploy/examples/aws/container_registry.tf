# container registry setup

# app and oauth registry
# container is the same for both, so only one registry is needed currently
module "app_registry" {
  source = "./modules/aws/container_registry"

  name_prefix  = "${local.name_prefix}-app-registry"
  force_delete = true
  retain       = 5
}

# proxy registry
module "proxy_registry" {
  source = "./modules/aws/container_registry"

  name_prefix  = "${local.name_prefix}-proxy-registry"
  force_delete = true
  retain       = 5
}
