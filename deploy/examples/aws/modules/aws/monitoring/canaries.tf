# service monitoring synthetic canaries

locals {
  canary_fn_name = "${var.name_prefix}-canary-lambda-${local.unique_id}"
  # NOTE: These two vars are used to hack around the lack of a hash check
  #       in the aws_synthetics_canary resource, which prevents code updates
  #       from triggering a resource update.
  canary_fn_file = "${path.module}/pageload_canary_lambda/nodejs/node_modules/pageload_canary_lambda.js"
  canary_fn_hash = filesha256(local.canary_fn_file)
}

resource "aws_synthetics_canary" "default" {
  name                 = "cnr-${local.unique_id}"
  artifact_s3_location = "s3://${module.artifact_storage_bucket.id}/${local.canary_fn_name}/"
  execution_role_arn   = aws_iam_role.canary_lambda.arn
  handler              = "pageload_canary_lambda.handler"
  zip_file             = data.archive_file.canaries_lambda.output_path
  runtime_version      = "syn-nodejs-puppeteer-4.0"
  start_canary         = true

  schedule {
    expression = "rate(5 minutes)"
  }

  run_config {
    timeout_in_seconds = 60
    environment_variables = {
      URLS                           = "https://${var.app_fqdn}, https://${var.oauth_fqdn}"
      CANARY_PROTECTION_HEADER_NAME  = "${local.canary_protection_header.http_header_name}"
      CANARY_PROTECTION_HEADER_VALUE = "${local.canary_protection_header.http_header_value}"
    }
  }
}

# artifact storage
module "artifact_storage_bucket" {
  source      = "../storage"
  name_prefix = "${var.name_prefix}-artifact-storage"
}

data "archive_file" "canaries_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/pageload_canary_lambda"
  output_path = "${path.module}/canaries_function_payload_${local.canary_fn_hash}.zip"
}

resource "aws_cloudwatch_log_group" "canary_lambda" {
  name              = "/aws/lambda/${local.canary_fn_name}"
  retention_in_days = 30
}

resource "aws_iam_role" "canary_lambda" {
  name               = "${var.name_prefix}-canary-lambda-role-${local.unique_id}"
  assume_role_policy = data.aws_iam_policy_document.canary_lambda_assume_role.json
}

resource "aws_iam_role_policy" "canary_lambda_exe_policy" {
  name   = "${var.name_prefix}-canary-lambda-exe-policy-${local.unique_id}"
  policy = data.aws_iam_policy_document.canary_lambda.json
  role   = aws_iam_role.canary_lambda.id
}

data "aws_iam_policy_document" "canary_lambda_assume_role" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

data "aws_iam_policy_document" "canary_lambda" {
  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:ListBucket",
      "s3:GetBucketLocation"
    ]

    resources = [
      "${module.artifact_storage_bucket.arn}",
      "${module.artifact_storage_bucket.arn}/${local.canary_fn_name}/*"
    ]
  }
  statement {
    effect = "Allow"
    actions = [
      "s3:ListAllMyBuckets",
    ]
    resources = [
      "*"
    ]
  }
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:CreateLogGroup"
    ]
    resources = [
      "arn:aws:logs:*:*:*"
      #"${aws_cloudwatch_log_group.canary_lambda.arn}"
    ]
  }
  statement {
    effect = "Allow"
    actions = [
      "cloudwatch:PutMetricData"
    ]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "cloudwatch:namespace"
      values   = ["CloudWatchSynthetics"]
    }
  }
}

# canary alerts
resource "aws_cloudwatch_metric_alarm" "app_canary_success" {
  alarm_name          = "${var.name_prefix}-app-canary-success-${local.unique_id}"
  alarm_description   = "Application canary success percent"
  comparison_operator = "LessThanThreshold"
  threshold           = var.canary_success_threshold
  metric_name         = "SuccessPercent"
  namespace           = "CloudWatchSynthetics"
  dimensions = {
    CanaryName = aws_synthetics_canary.default.name
    StepName   = var.app_fqdn
  }
  statistic           = "Average"
  period              = var.canary_success_period
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.metrics.arn]
  ok_actions          = [aws_sns_topic.metrics.arn]
}

resource "aws_cloudwatch_metric_alarm" "oauth_canary_success" {
  alarm_name          = "${var.name_prefix}-oauth-canary-success-${local.unique_id}"
  alarm_description   = "OAuth canary success percent"
  comparison_operator = "LessThanThreshold"
  threshold           = var.canary_success_threshold
  metric_name         = "SuccessPercent"
  namespace           = "CloudWatchSynthetics"
  dimensions = {
    CanaryName = aws_synthetics_canary.default.name
    StepName   = var.oauth_fqdn
  }
  statistic           = "Average"
  period              = var.canary_success_period
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.metrics.arn]
  ok_actions          = [aws_sns_topic.metrics.arn]
}

resource "aws_cloudwatch_metric_alarm" "app_canary_duration" {
  alarm_name          = "${var.name_prefix}-app-canary-duration-${local.unique_id}"
  alarm_description   = "Application site load duration (in ms)"
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.canary_duration_threshold
  metric_name         = "Duration"
  namespace           = "CloudWatchSynthetics"
  dimensions = {
    CanaryName = aws_synthetics_canary.default.name
    StepName   = var.app_fqdn
  }
  statistic           = "Average"
  period              = var.canary_duration_period
  evaluation_periods  = 3
  datapoints_to_alarm = 3
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.metrics.arn]
  ok_actions          = [aws_sns_topic.metrics.arn]
}

resource "aws_cloudwatch_metric_alarm" "oauth_canary_duration" {
  alarm_name          = "${var.name_prefix}-oauth-canary-duration-${local.unique_id}"
  alarm_description   = "OAuth site load duration (in ms)"
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.canary_duration_threshold
  metric_name         = "Duration"
  namespace           = "CloudWatchSynthetics"
  dimensions = {
    CanaryName = aws_synthetics_canary.default.name
    StepName   = var.oauth_fqdn
  }
  statistic           = "Average"
  period              = var.canary_duration_period
  evaluation_periods  = 3
  datapoints_to_alarm = 3
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.metrics.arn]
  ok_actions          = [aws_sns_topic.metrics.arn]
}

