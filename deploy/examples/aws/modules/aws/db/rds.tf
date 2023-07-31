# db module
# Create an AWS RDS resource, using the terraform AWS RDS module to 
# simplifiy configuration. The configuration here is somewhat specific
# to the model AdVISE deployment. One must provide references to username
# and password secrets, which is assumed to be a single secret entry using
# JSON encoded data.

module "advise_db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "${var.name_prefix}-${local.unique_id}"

  engine               = "postgres"
  family               = var.family
  major_engine_version = var.major_version
  instance_class       = var.instance_type

  allocated_storage     = var.storage
  max_allocated_storage = var.max_storage

  db_name                     = var.db_name
  manage_master_user_password = false
  username                    = local.username
  password                    = local.password

  port = var.port

  multi_az               = var.multi_az
  db_subnet_group_name   = var.network.database_subnet_group_name
  subnet_ids             = var.network.database_subnets
  vpc_security_group_ids = [aws_security_group.rds_sg.id]

  backup_window                   = "06:00-09:00" # UTC? I think?
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  create_cloudwatch_log_group     = true

  backup_retention_period = var.backup_retention_period #1
  skip_final_snapshot     = var.skip_final_snapshot     #true
  deletion_protection     = var.deletion_protection     #false
  # Production recommendations: 
  #backup_retention_period = 7
  #skip_final_snapshot     = false
  #deletion_protection     = true

  # TODO: Configure monitoring here?
  #performance_insights_enabled = true
  #performance_insights_retention_period = 7
  #create_monitoring_role = true
  #monitoring_interval = 60
  #monitoring_role_name = "${local.name_prefix}-rds-monitoring-role"
  #monitoring_role_use_name_prefix = true
  #monitoring_role_description = "RDS Monitoring Role"
}
