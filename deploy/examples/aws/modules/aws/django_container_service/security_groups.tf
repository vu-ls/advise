# application security group
resource "aws_security_group" "ecs" {
  name        = "${var.name_prefix}-ecs-sg-${local.unique_id}"
  description = "${var.name_prefix} ECS security group"
  vpc_id      = var.network.vpc_id

  ingress {
    description     = "HTTP"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.lb.id]
  }

  egress {
    description      = "allow outbound"
    from_port        = 0
    to_port          = 0
    protocol         = -1
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

# application lb security group
resource "aws_security_group" "lb" {
  name        = "${var.name_prefix}-lb-sg-${local.unique_id}"
  description = "${var.name_prefix} LB security group"
  vpc_id      = var.network.vpc_id

  ingress {
    description      = "HTTPS"
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  egress {
    description      = "allow outbound"
    from_port        = 0
    to_port          = 0
    protocol         = -1
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}
