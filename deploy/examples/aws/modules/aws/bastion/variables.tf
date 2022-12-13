variable "name_prefix" {
  description = "Prefix for AWS resource names"
  type        = string
}

variable "fqdn" {
  description = "FQDN of the bastion host to create"
  type        = string
}

variable "domain_name" {
  description = "AWS Route53 hosted zone where DNS records should be created"
  type        = string
}

variable "allowed_cidrs" {
  description = "List of CIDRs to allow access to bastion over SSH"
  type        = list(string)
}

variable "ami" {
  description = "AMI to use for the host (defaults to latest AL2 x86 AMI)"
  type        = string
  default     = null
}

variable "instance_type" {
  description = "EC2 instance type for the host"
  type        = string
  default     = "t2.micro"
}

variable "ssh_key_name" {
  description = "Name of EC2 SSH key to use for authentication"
  type        = string
}

variable "network" {
  description = "VPC configuration"
  type = object({
    vpc_id         = string
    public_subnets = list(string)
  })
}

# generate a random id to use for naming resources
resource "random_id" "id" {
  byte_length = 8
}

locals {
  ami_id    = var.ami != null ? var.ami : data.aws_ssm_parameter.amzn2_ami.value
  unique_id = random_id.id.hex
}
