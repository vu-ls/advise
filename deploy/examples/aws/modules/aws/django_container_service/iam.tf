# ECS task role
resource "aws_iam_role" "ecs_task" {
  name               = "${var.name_prefix}-ecs-task-role-${local.unique_id}"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

resource "aws_iam_role_policy" "ecs_task_cloudwatch_policy" {
  name   = "${var.name_prefix}-ecs-task-cloudwatch-policy-${local.unique_id}"
  policy = data.aws_iam_policy_document.cloudwatch_create_log_group_role.json
  role   = aws_iam_role.ecs_task.id
}

# ECS task execution role
resource "aws_iam_role" "ecs_task_exe" {
  name               = "${var.name_prefix}-ecs-task-exe-role-${local.unique_id}"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ecs_task_exe_attach" {
  role       = aws_iam_role.ecs_task_exe.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_task_exe_cloudwatch_policy" {
  name   = "${var.name_prefix}-ecs-task-exe-cloudwatch-policy-${local.unique_id}"
  policy = data.aws_iam_policy_document.cloudwatch_create_log_group_role.json
  role   = aws_iam_role.ecs_task_exe.id
}

data "aws_iam_policy_document" "ecs_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "cloudwatch_create_log_group_role" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogStreams"
    ]

    resources = [
      "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*" #/ecs/${local.name_prefix}-*-${local.unique_id}"
    ]
  }
}
