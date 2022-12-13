module "advise_vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "${local.name_prefix}-vpc-${local.unique_id}"
  cidr = "10.0.0.0/16"

  azs              = data.aws_availability_zones.available.names
  private_subnets  = ["10.10.1.0/24", "10.10.2.0/24", "10.10.3.0/24"]
  public_subnets   = ["10.10.101.0/24", "10.10.102.0/24", "10.10.103.0/24"]
  database_subnets = ["10.10.51.0/24", "10.10.52.0/24", "10.10.53.0/24"]

  enable_nat_gateway                 = true
  single_nat_gateway                 = true
  create_database_subnet_group       = true
  create_database_subnet_route_table = true

  tags = {
    Name = "${local.name_prefix}-vpc-${local.unique_id}"
  }
}

data "aws_route53_zone" "primary" {
  name = var.domain_name
}

data "aws_availability_zones" "available" {
  state = "available"
}
