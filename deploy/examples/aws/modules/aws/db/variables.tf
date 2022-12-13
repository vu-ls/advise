variable "name_prefix" {
  description = "Prefix for AWS resource names"
  type        = string
}

variable "db_name" {
  description = "Database name"
  type        = string
}

variable "family" {
  description = "Database family"
  type        = string
  default     = "postgres14"
}

variable "major_version" {
  description = "Database engine major version"
  type        = number
  default     = 14
}

variable "multi_az" {
  description = "Use multiple AZs?"
  type        = bool
  default     = false
}

variable "instance_type" {
  description = "RDS instance type"
  type        = string
  default     = "db.t3.micro"
}

variable "storage" {
  description = "RDS initial storage allocation in GB"
  type        = number
  default     = 20
}

variable "max_storage" {
  description = "RDS max storage allocation in GB"
  type        = number
  default     = 100
}

variable "port" {
  description = "TCP port for DB"
  type        = number
  default     = 5432
}

variable "allow_additional_ips" {
  description = "List of additional IPs to allow access to DB (ex.: bastion host)"
  type        = list(string)
  default     = null
}

variable "backup_retention_period" {
  description = "Retain backups for this many days"
  type        = number
  default     = 7
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot on destroy?"
  type        = bool
  default     = false
}

variable "deletion_protection" {
  description = "Protect against deletion?"
  type        = bool
  default     = true
}

variable "db_username_secret" {
  description = "Database username secret id"
  type        = string
}

variable "db_password_secret" {
  description = "Database password secret id"
  type        = string
}

variable "network" {
  description = "VPC configuration"
  type = object({
    vpc_id                      = string
    database_subnet_group_name  = string
    database_subnets            = list(string)
    private_subnets_cidr_blocks = list(string)
  })
}

# generate a random id to use for naming resources
resource "random_id" "id" {
  byte_length = 8
}

locals {
  unique_id = random_id.id.hex
}
