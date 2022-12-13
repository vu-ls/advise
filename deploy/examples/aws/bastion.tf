# Bastion configuration
module "bastion" {
  source = "./modules/aws/bastion"

  network       = module.advise_vpc
  name_prefix   = "${local.name_prefix}-bastion"
  domain_name   = var.domain_name
  fqdn          = local.bastion_fqdn
  instance_type = var.bastion_instance_type
  ssh_key_name  = var.ssh_key_name
  allowed_cidrs = var.bastion_allowed_cidrs
}
