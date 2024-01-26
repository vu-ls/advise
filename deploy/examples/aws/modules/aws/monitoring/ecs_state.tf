# SNS topic for ECS state messages
resource "aws_sns_topic" "ecs_state" {
  name              = "${var.name_prefix}-ecs-state-${local.unique_id}"
  kms_master_key_id = var.sns_kms_key
}


# allow events to post to this topic
resource "aws_sns_topic_policy" "ecs_state" {
  arn    = aws_sns_topic.ecs_state.arn
  policy = data.aws_iam_policy_document.ecs_state.json
}

data "aws_iam_policy_document" "ecs_state" {
  statement {
    effect  = "Allow"
    actions = ["SNS:Publish"]
    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }
    resources = [aws_sns_topic.ecs_state.arn]
  }
}


# Cloudwatch event rule to capture ECS state changes of INFO type
resource "aws_cloudwatch_event_rule" "ecs_state" {
  name        = "${var.name_prefix}-ecs-state-${local.unique_id}"
  description = "Capture ECS state changes of INFO type"

  event_pattern = jsonencode({
    "source" : [
      "aws.ecs"
    ],
    "detail" : {
      "eventType" : [
        "INFO"
      ]
    }
  })
}

# Cloudwatch event rule target
resource "aws_cloudwatch_event_target" "ecs_state" {
  rule      = aws_cloudwatch_event_rule.ecs_state.name
  target_id = "send_to_sns"
  arn       = aws_sns_topic.ecs_state.arn

}


# ECS state lambda config
locals {
  ecs_state_fn_name = "${var.name_prefix}-ecs-state-lambda-${local.unique_id}"
}

data "aws_iam_policy_document" "ecs_state_lambda_assume_role" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}
data "aws_iam_policy_document" "ecs_state_lambda_list_account_alias" {
  statement {
    effect    = "Allow"
    actions   = ["iam:ListAccountAliases"]
    resources = ["*"]
  }
}


resource "aws_iam_role" "ecs_state_lambda" {
  name               = "${var.name_prefix}-ecs-state-lambda-role-${local.unique_id}"
  assume_role_policy = data.aws_iam_policy_document.ecs_state_lambda_assume_role.json
}

resource "aws_iam_role_policy" "ecs_state_lambda_list_account_alias_policy" {
  name   = "${var.name_prefix}-ecs-state-lambda-list-account-alias-policy-${local.unique_id}"
  policy = data.aws_iam_policy_document.ecs_state_lambda_list_account_alias.json
  role   = aws_iam_role.ecs_state_lambda.id
}


# Lambda cloudwatch logging
resource "aws_cloudwatch_log_group" "ecs_state_lambda" {
  name              = "/aws/lambda/${local.ecs_state_fn_name}"
  retention_in_days = 30
}

data "aws_iam_policy_document" "ecs_state_lambda_cloudwatch" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.ecs_state_lambda.arn}"]
  }
}

resource "aws_iam_role_policy" "ecs_state_lambda_cloudwatch_policy" {
  name   = "${var.name_prefix}-ecs-state-lambda-cloudwatch-policy-${local.unique_id}"
  policy = data.aws_iam_policy_document.ecs_state_lambda_cloudwatch.json
  role   = aws_iam_role.ecs_state_lambda.id
}

# Lambda function config
data "archive_file" "ecs_state_lambda" {
  type        = "zip"
  source_file = "${path.module}/ecs_state_lambda.py"
  output_path = "${path.module}/ecs_state_function_payload.zip"
}

resource "aws_lambda_function" "ecs_state" {
  function_name = local.ecs_state_fn_name

  filename = data.archive_file.ecs_state_lambda.output_path
  role     = aws_iam_role.ecs_state_lambda.arn

  source_code_hash = data.archive_file.ecs_state_lambda.output_base64sha256
  publish          = true

  runtime = "python3.8"
  handler = "ecs_state_lambda.lambda_handler"

  environment {
    variables = {
      WEBHOOK_URL   = var.notify_webhook_url,
      WEBHOOK_TOKEN = var.notify_webhook_token
    }
  }
  depends_on = [
    aws_iam_role_policy.ecs_state_lambda_cloudwatch_policy,
    aws_cloudwatch_log_group.ecs_state_lambda,
  ]
}


# Finally, subscribe the function to the topic
resource "aws_lambda_permission" "ecs_state_lambda" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ecs_state.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.ecs_state.arn
}

resource "aws_sns_topic_subscription" "ecs_state_lambda" {
  topic_arn = aws_sns_topic.ecs_state.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.ecs_state.arn
}
