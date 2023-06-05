# SNS topic for ECS state messages
resource "aws_sns_topic" "metrics" {
  name = "${var.name_prefix}-metrics-${local.unique_id}"
}

# allow cloudwatch to post to this topic
resource "aws_sns_topic_policy" "metrics" {
  arn    = aws_sns_topic.metrics.arn
  policy = data.aws_iam_policy_document.metrics.json
}

data "aws_iam_policy_document" "metrics" {
  statement {
    effect  = "Allow"
    actions = ["SNS:Publish"]
    principals {
      type        = "Service"
      identifiers = ["cloudwatch.amazonaws.com"]
    }
    resources = [aws_sns_topic.metrics.arn]
  }
}

# Metrics to monitor
resource "aws_cloudwatch_metric_alarm" "app_cpu" {
  alarm_name          = "${var.name_prefix}-app-cpu-${local.unique_id}"
  alarm_description   = "Application CPU usage threshold"
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.cpu_percent_threshold
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  dimensions = {
    ServiceName = var.app_ecs_service_name
    ClusterName = var.app_ecs_cluster_name
  }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.metrics.arn]
  ok_actions          = [aws_sns_topic.metrics.arn]
}

resource "aws_cloudwatch_metric_alarm" "oauth_cpu" {
  alarm_name          = "${var.name_prefix}-oauth-cpu-${local.unique_id}"
  alarm_description   = "OAuth CPU usage threshold"
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.cpu_percent_threshold
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  dimensions = {
    ServiceName = var.oauth_ecs_service_name
    ClusterName = var.oauth_ecs_cluster_name
  }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.metrics.arn]
  ok_actions          = [aws_sns_topic.metrics.arn]
}

resource "aws_cloudwatch_metric_alarm" "app_memory" {
  alarm_name          = "${var.name_prefix}-app-memory-${local.unique_id}"
  alarm_description   = "Application memory usage threshold"
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.memory_percent_threshold
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  dimensions = {
    ServiceName = var.app_ecs_service_name
    ClusterName = var.app_ecs_cluster_name
  }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.metrics.arn]
  ok_actions          = [aws_sns_topic.metrics.arn]
}

resource "aws_cloudwatch_metric_alarm" "oauth_memory" {
  alarm_name          = "${var.name_prefix}-oauth-memory-${local.unique_id}"
  alarm_description   = "OAuth memory usage threshold"
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.memory_percent_threshold
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  dimensions = {
    ServiceName = var.oauth_ecs_service_name
    ClusterName = var.oauth_ecs_cluster_name
  }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.metrics.arn]
  ok_actions          = [aws_sns_topic.metrics.arn]
}

resource "aws_cloudwatch_metric_alarm" "app_elb_5xx" {
  alarm_name          = "${var.name_prefix}-app-elb-5xx-${local.unique_id}"
  alarm_description   = "App ELB 5xx 1min Count"
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.elb_5xx_threshold
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  dimensions = {
    LoadBalancer = var.app_elb_id
  }
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.metrics.arn]
  ok_actions          = [aws_sns_topic.metrics.arn]
}

resource "aws_cloudwatch_metric_alarm" "oauth_elb_5xx" {
  alarm_name          = "${var.name_prefix}-oauth-elb-5xx-${local.unique_id}"
  alarm_description   = "OAuth ELB 5xx 1min Count"
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.elb_5xx_threshold
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  dimensions = {
    LoadBalancer = var.oauth_elb_id
  }
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.metrics.arn]
  ok_actions          = [aws_sns_topic.metrics.arn]
}

resource "aws_cloudwatch_metric_alarm" "app_rds_cpu" {
  alarm_name          = "${var.name_prefix}-app-rds-cpu-${local.unique_id}"
  alarm_description   = "Application RDS CPU utilization threshold"
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.cpu_percent_threshold
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  dimensions = {
    DBInstanceIdentifier = var.app_rds_id
  }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.metrics.arn]
  ok_actions          = [aws_sns_topic.metrics.arn]
}

resource "aws_cloudwatch_metric_alarm" "oauth_rds_cpu" {
  alarm_name          = "${var.name_prefix}-oauth-rds-cpu-${local.unique_id}"
  alarm_description   = "OAuth RDS CPU utilization threshold"
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.cpu_percent_threshold
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  dimensions = {
    DBInstanceIdentifier = var.oauth_rds_id
  }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.metrics.arn]
  ok_actions          = [aws_sns_topic.metrics.arn]
}

resource "aws_cloudwatch_metric_alarm" "app_rds_connections" {
  alarm_name          = "${var.name_prefix}-app-rds-connection-${local.unique_id}"
  alarm_description   = "Application RDS connections threshold"
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.db_connections_threshold
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  dimensions = {
    DBInstanceIdentifier = var.app_rds_id
  }
  statistic           = "Average"
  period              = 60
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.metrics.arn]
  ok_actions          = [aws_sns_topic.metrics.arn]
}

resource "aws_cloudwatch_metric_alarm" "oauth_rds_connections" {
  alarm_name          = "${var.name_prefix}-oauth-rds-connections-${local.unique_id}"
  alarm_description   = "OAuth RDS connections threshold"
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.db_connections_threshold
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  dimensions = {
    DBInstanceIdentifier = var.oauth_rds_id
  }
  statistic           = "Average"
  period              = 60
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.metrics.arn]
  ok_actions          = [aws_sns_topic.metrics.arn]
}

resource "aws_cloudwatch_metric_alarm" "app_rds_storage" {
  alarm_name          = "${var.name_prefix}-app-rds-storage-${local.unique_id}"
  alarm_description   = "Application RDS free storage threshold"
  comparison_operator = "LessThanThreshold"
  threshold           = var.db_storage_threshold
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  dimensions = {
    DBInstanceIdentifier = var.app_rds_id
  }
  statistic           = "Average"
  period              = 3600
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.metrics.arn]
  ok_actions          = [aws_sns_topic.metrics.arn]
}

resource "aws_cloudwatch_metric_alarm" "oauth_rds_storage" {
  alarm_name          = "${var.name_prefix}-oauth-rds-storage-${local.unique_id}"
  alarm_description   = "OAuth RDS free storage threshold"
  comparison_operator = "LessThanThreshold"
  threshold           = var.db_storage_threshold
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  dimensions = {
    DBInstanceIdentifier = var.oauth_rds_id
  }
  statistic           = "Average"
  period              = 3600
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.metrics.arn]
  ok_actions          = [aws_sns_topic.metrics.arn]
}


# Metrics lambda config
locals {
  metrics_fn_name = "${var.name_prefix}-metrics-lambda-${local.unique_id}"
}

data "aws_iam_policy_document" "metrics_lambda_assume_role" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}
data "aws_iam_policy_document" "metrics_lambda_list_account_alias" {
  statement {
    effect    = "Allow"
    actions   = ["iam:ListAccountAliases"]
    resources = ["*"]
  }
}


resource "aws_iam_role" "metrics_lambda" {
  name               = "${var.name_prefix}-metrics-lambda-role-${local.unique_id}"
  assume_role_policy = data.aws_iam_policy_document.metrics_lambda_assume_role.json
}

resource "aws_iam_role_policy" "metrics_lambda_list_account_alias_policy" {
  name   = "${var.name_prefix}-metrics-lambda-list-account-alias-policy-${local.unique_id}"
  policy = data.aws_iam_policy_document.metrics_lambda_list_account_alias.json
  role   = aws_iam_role.metrics_lambda.id
}


# Lambda cloudwatch logging
resource "aws_cloudwatch_log_group" "metrics_lambda" {
  name              = "/aws/lambda/${local.metrics_fn_name}"
  retention_in_days = 30
}

data "aws_iam_policy_document" "metrics_lambda_cloudwatch" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }
}

resource "aws_iam_role_policy" "metrics_lambda_cloudwatch_policy" {
  name   = "${var.name_prefix}-metrics-lambda-cloudwatch-policy-${local.unique_id}"
  policy = data.aws_iam_policy_document.metrics_lambda_cloudwatch.json
  role   = aws_iam_role.metrics_lambda.id
}

# Lambda function config
data "archive_file" "metrics_lambda" {
  type        = "zip"
  source_file = "${path.module}/metrics_lambda.py"
  output_path = "${path.module}/metrics_function_payload.zip"
}

resource "aws_lambda_function" "metrics" {
  function_name = local.metrics_fn_name

  filename = data.archive_file.metrics_lambda.output_path
  role     = aws_iam_role.metrics_lambda.arn

  source_code_hash = data.archive_file.metrics_lambda.output_base64sha256
  publish          = true

  runtime = "python3.8"
  handler = "metrics_lambda.lambda_handler"

  environment {
    variables = {
      WEBHOOK_URL   = var.notify_webhook_url,
      WEBHOOK_TOKEN = var.notify_webhook_token
    }
  }
  depends_on = [
    aws_iam_role_policy.metrics_lambda_cloudwatch_policy,
    aws_cloudwatch_log_group.metrics_lambda,
  ]
}


# Finally, subscribe the function to the topic
resource "aws_lambda_permission" "metrics_lambda" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.metrics.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.metrics.arn
}

resource "aws_sns_topic_subscription" "metrics_lambda" {
  topic_arn = aws_sns_topic.metrics.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.metrics.arn
}
