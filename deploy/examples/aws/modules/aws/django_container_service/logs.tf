resource "aws_cloudwatch_log_group" "app_log_group" {
  name              = var.app_log_group_name
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "proxy_log_group" {
  name              = var.proxy_log_group_name
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "worker_log_group" {
  name              = var.worker_log_group_name
  retention_in_days = var.log_retention_days
}
