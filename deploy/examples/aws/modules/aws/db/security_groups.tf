# RDS security groups
resource "aws_security_group" "rds_sg" {
  name        = "${var.name_prefix}-sg-${local.unique_id}"
  description = "PostgreSQL RDS Access"
  vpc_id      = var.network.vpc_id

  ingress {
    description = "PostgreSQL access from within VPC"
    from_port   = var.port
    to_port     = var.port
    protocol    = "tcp"
    cidr_blocks = var.network.private_subnets_cidr_blocks
  }
  dynamic "ingress" {
    for_each = var.allow_additional_ips
    content {
      description = "PostgreSQL access from ${ingress.value}"
      from_port   = var.port
      to_port     = var.port
      protocol    = "tcp"
      cidr_blocks = ["${ingress.value}/32"]
    }
  }
}
