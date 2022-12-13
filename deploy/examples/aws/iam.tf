# ECS task role added permissions
resource "aws_iam_role_policy" "ecs_task_app_secrets_policy" {
  name   = "${local.name_prefix}-ecs-task-app-secrets-policy-${local.unique_id}"
  policy = data.aws_iam_policy_document.app_secret_access_role.json
  role   = module.app_service.ecs_task_role_id
}

resource "aws_iam_role_policy" "ecs_task_oauth_secrets_policy" {
  name   = "${local.name_prefix}-ecs-task-oauth-secrets-policy-${local.unique_id}"
  policy = data.aws_iam_policy_document.oauth_secret_access_role.json
  role   = module.oauth_service.ecs_task_role_id
}

resource "aws_iam_role_policy" "ecs_task_app_static_bucket_access_policy" {
  name   = "${local.name_prefix}-ecs-task-app-static-bucket-access-policy-${local.unique_id}"
  policy = data.aws_iam_policy_document.app_static_bucket_access_role.json
  role   = module.app_service.ecs_task_role_id
}

resource "aws_iam_role_policy" "ecs_task_oauth_static_bucket_access_policy" {
  name   = "${local.name_prefix}-ecs-task-oauth-static-bucket-access-policy-${local.unique_id}"
  policy = data.aws_iam_policy_document.oauth_static_bucket_access_role.json
  role   = module.oauth_service.ecs_task_role_id
}

resource "aws_iam_role_policy" "ecs_task_app_ses_access_policy" {
  name   = "${local.name_prefix}-ecs-task-app-ses-access-policy-${local.unique_id}"
  policy = data.aws_iam_policy_document.ses_send_email_role.json
  role   = module.app_service.ecs_task_role_id
}

resource "aws_iam_role_policy" "ecs_task_oauth_ses_access_policy" {
  name   = "${local.name_prefix}-ecs-task-oauth-ses-access-policy-${local.unique_id}"
  policy = data.aws_iam_policy_document.ses_send_email_role.json
  role   = module.oauth_service.ecs_task_role_id
}

# ECS task execution role added permissions
data "aws_iam_policy_document" "app_secret_access_role" {
  statement {
    effect  = "Allow"
    actions = ["secretsmanager:GetSecretValue"]

    resources = [
      module.app_master_secret.arn,
    ]
  }
}

data "aws_iam_policy_document" "oauth_secret_access_role" {
  statement {
    effect  = "Allow"
    actions = ["secretsmanager:GetSecretValue"]

    resources = [
      module.oauth_master_secret.arn
    ]
  }
}


data "aws_iam_policy_document" "app_static_bucket_access_role" {
  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObjectAcl",
      "s3:GetObject",
      "s3:ListBucket",
      "s3:DeleteObject",
      "s3:PutObjectAcl"
    ]

    resources = [
      "${module.app_static_bucket.arn}",
      "${module.app_static_bucket.arn}/*"
    ]
  }
}

data "aws_iam_policy_document" "oauth_static_bucket_access_role" {
  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObjectAcl",
      "s3:GetObject",
      "s3:ListBucket",
      "s3:DeleteObject",
      "s3:PutObjectAcl"
    ]

    resources = [
      "${module.oauth_static_bucket.arn}",
      "${module.oauth_static_bucket.arn}/*"
    ]
  }
}

data "aws_iam_policy_document" "ses_send_email_role" {
  statement {
    effect = "Allow"
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail",
      "ses:GetSendQuota"
    ]

    resources = [
      "*"
    ]
  }
}
