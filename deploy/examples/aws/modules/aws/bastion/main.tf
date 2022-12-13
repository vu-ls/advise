# AWS Bastion module
# Create a bastion host for AdVISE in AWS.

# get our region
data "aws_region" "current" {}

# get our id
data "aws_caller_identity" "current" {}

# stash the latest AL2 AMI
data "aws_ssm_parameter" "amzn2_ami" {
  name = "/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2"
}
