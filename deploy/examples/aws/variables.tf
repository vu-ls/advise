#
# variables.tf
#

variable "project_name" {
  description = "Project Name"
  type        = string
  default     = "advise"
}

variable "contact_address" {
  description = "Contact for various automated things"
  type        = string
}

variable "environment_name" {
  description = "Environment Name"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  type    = string
  default = "us-east-2"
}

variable "domain_name" {
  description = "Domain name used to reference route53 hosted zone, etc."
  type        = string
}

variable "advise_app_hostname" {
  description = "AdVISE application hostname"
  type        = string
}

variable "advise_oauth_hostname" {
  description = "AdVISE oauth application hostname"
  type        = string
}

variable "advise_app_secret_key" {
  description = "AdVISE Django App secret key"
  type        = string
  sensitive   = true
}

variable "advise_oauth_secret_key" {
  description = "AdVISE OAuth Provider secret key"
  type        = string
  sensitive   = true
}

variable "advise_image_version" {
  description = "AdVISE App Container Image Version Tag to Deploy"
  type        = string
  default     = "latest"
}

variable "oauth_image_version" {
  description = "AdVISE OAuth Provider Container Image Version Tag to Deploy"
  type        = string
  default     = "latest"
}

variable "advise_proxy_image_version" {
  description = "AdVISE App Proxy Container Image Version Tag to Deploy"
  type        = string
  default     = "latest"
}

variable "oauth_proxy_image_version" {
  description = "AdVISE OAuth Proxy Container Image Version Tag to Deploy"
  type        = string
  default     = "latest"
}

variable "advise_allowed_cidrs" {
  description = "AdVISE Allowed CIDRs (empty disables WAF)"
  type        = list(string)
  default     = []
}

variable "advise_superuser_username" {
  description = "AdVISE global superuser username"
  type        = string
  sensitive   = true
}

variable "advise_superuser_password" {
  description = "AdVISE global superuser password"
  type        = string
  sensitive   = true
}

variable "advise_django_debug" {
  description = "AdVISE Django global debug flag"
  type        = bool
  default     = false
}

variable "advise_email_backend" {
  description = "AdVISE Django email backend (defaults to console)"
  type        = string
  default     = "django.core.mail.backends.console.EmailBackend"
}

variable "advise_contact_address" {
  description = "AdVISE email contact address for outgoing mail"
  type        = string
}

variable "advise_default_from_email" {
  description = "Default email from address (defaults to advise_contact_address)"
  type        = string
  default     = null
}

variable "advise_reply_to_email" {
  description = "Default reply-to email address (defaults to advise_contact_address)"
  type        = string
  default     = null
}


variable "advise_use_provider" {
  description = "Name of AdVISE OAuth provider to use as primary login source"
  type        = string
  default     = null
}

variable "advise_registration_link" {
  description = "Link to registration page (if using advise_use_provider)"
  type        = string
  default     = null
}

variable "advise_recaptcha_site_key" {
  description = "AdVISE ReCAPTCHA site key"
  type        = string
  default     = null
}
variable "advise_recaptcha_secret_key" {
  description = "AdVISE ReCAPTCHA secret key"
  type        = string
  default     = null
}

variable "oauth_email_backend" {
  description = "OAuth Django email backend (defaults to console)"
  type        = string
  default     = "django.core.mail.backends.console.EmailBackend"
}

variable "oauth_contact_address" {
  description = "OAuth email contact address for outgoing mail"
  type        = string
}

variable "oauth_default_from_email" {
  description = "Default email from address (defaults to oauth_contact_address)"
  type        = string
  default     = null
}

variable "oauth_reply_to_email" {
  description = "Default reply-to email address (defaults to oauth_contact_address)"
  type        = string
  default     = null
}

variable "account_email_verification" {
  description = "Configure account email verification (mandatory, optional, or none)"
  type        = string
  default     = "mandatory"
}

variable "ecs_notify_webhook_url" {
  description = "URL for webhook to receive notification events from ECS info events"
  type        = string
  default     = null
}

variable "ecs_notify_webhook_token" {
  description = "Access token to use for webhook URL for ECS info event notifications"
  type        = string
  default     = null
}

variable "cpu_alarm_threshold" {
  description = "Percent CPU for alarm thresholds"
  type        = number
  default     = 75
}

variable "memory_alarm_threshold" {
  description = "Percent memory use for alarm thresholds"
  type        = number
  default     = 75
}

variable "db_connections_threshold" {
  description = "Number of DB connections to use for alarm thresholds"
  type        = number
  default     = 60
}

variable "db_free_storage_threshold" {
  description = "Free storage threshold in bytes for DB alarms"
  type        = number
  default     = 5000000000
}

variable "elb_5xx_alarm_threshold" {
  description = "Threshold for 5xx errors in one minute"
  type        = number
  default     = 10
}

variable "canary_duration_threshold" {
  description = "Canary duration alarm threshold (in ms)"
  type        = number
  default     = 1000
}

variable "multi_az" {
  type    = bool
  default = false
}

variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 90
}

variable "bastion_instance_type" {
  type    = string
  default = "t2.micro"
}

variable "bastion_allowed_cidrs" {
  description = "List of allowed CIDRs for bastion connection"
  type        = list(string)
}

variable "bastion_hostname" {
  description = "Hostname for bastion record"
  type        = string
  default     = "ardent"
}

variable "db_app_instance_type" {
  type    = string
  default = "db.t3.micro"
}

variable "db_oauth_instance_type" {
  type    = string
  default = "db.t3.micro"
}

variable "db_app_master_username" {
  description = "App DB master username"
  type        = string
  default     = "db_app_admin"
}

variable "db_oauth_master_username" {
  description = "OAuth DB master username"
  type        = string
  default     = "db_oauth_admin"
}

variable "db_deletion_protection" {
  description = "Protect databases from deletion?"
  type        = bool
  default     = true
}

variable "db_backup_retention" {
  description = "number of days to retain automatic snapshots"
  type        = number
  default     = 7
}

variable "db_skip_final_snapshot" {
  description = "Skip final database snapshot on delete?"
  type        = bool
  default     = false
}

variable "ssh_key_name" {
  type = string
}

# generate a random id to use for naming resources
resource "random_id" "id" {
  byte_length = 8
}

resource "random_id" "cf_protection_header" {
  keepers = {
    app_secret_key   = var.advise_app_secret_key
    oauth_secret_key = var.advise_oauth_secret_key
  }
  byte_length = 8
}

locals {
  tags = {
    Owner       = var.contact_address
    Environment = var.environment_name
    Project     = var.project_name
  }
  project_name     = var.project_name
  environment_name = var.environment_name
  name_prefix      = "${var.project_name}-${var.environment_name}"
  unique_id        = random_id.id.hex

  bastion_fqdn   = "${var.bastion_hostname}.${var.domain_name}"
  app_svc_fqdn   = "${var.advise_app_hostname != "" ? var.advise_app_hostname : "app"}-svc.${var.domain_name}"
  app_fqdn       = "${var.advise_app_hostname != "" ? "${var.advise_app_hostname}." : ""}${var.domain_name}"
  oauth_svc_fqdn = "${var.advise_oauth_hostname}-svc.${var.domain_name}"
  oauth_fqdn     = "${var.advise_oauth_hostname}.${var.domain_name}"
}
