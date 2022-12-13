resource "aws_security_group" "bastion" {
  name        = "${var.name_prefix}-sg-${local.unique_id}"
  description = "SSH to Bastion"
  vpc_id      = var.network.vpc_id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidrs
  }

  egress {
    description = "allow outbound"
    from_port   = 0
    to_port     = 0
    protocol    = -1
    cidr_blocks = ["0.0.0.0/0"]
  }
}
