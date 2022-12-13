# terraform setup
# use aws dynamodb for state locking and s3 bucket for remote state storage
terraform {
  backend "s3" {
    # set these on the command line
    #region = "us-east-2"
    #bucket = "advise-sandbox-terraform-state"
    #key = "${local.name_prefix}-${local.unique_id}"
    dynamodb_table = "terraform-state-locking"
  }
}

# configure aws provider, set default resource tags
provider "aws" {
  region = var.aws_region
  default_tags {
    tags = local.tags
  }
}

# configure special aws provider for CF certs (which must be in us-east-1)
provider "aws" {
  region = "us-east-1"
  alias  = "cf_certs_region"
  default_tags {
    tags = local.tags
  }
}



# stash the latest AL2 AMI
data "aws_ssm_parameter" "amzn2_ami" {
  name = "/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2"
}

# get our id
data "aws_caller_identity" "current" {}

# example block to use if importing state from another terraform module
#data "terraform_remote_state" "network" {
#  backend = "s3"
#  config = {
#    bucket = var.terraform_state_bucket
#    key    = var.terraform_network_state
#    region = var.aws_region
#  }
#}
