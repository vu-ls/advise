# ECS task config
resource "aws_ecs_task_definition" "default" {
  family                   = "${var.name_prefix}-ecs-task-${local.unique_id}"
  task_role_arn            = aws_iam_role.ecs_task.arn
  execution_role_arn       = aws_iam_role.ecs_task_exe.arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "4096"
  memory                   = "8192"
  container_definitions    = var.enable_worker ? jsonencode((concat(local.std_container_definitions, local.worker_container_definition))) : jsonencode(local.std_container_definitions)
}

resource "aws_sns_topic" "app_comms" {
  count             = var.app_comms_use_sns ? 1 : 0
  name              = "${var.name_prefix}-app-comms-${local.unique_id}"
  kms_master_key_id = var.sns_kms_key
}

# allow events to post to this topic
resource "aws_sns_topic_policy" "app_comms" {
  count  = var.app_comms_use_sns ? 1 : 0
  arn    = one(aws_sns_topic.app_comms[*].arn)
  policy = one(data.aws_iam_policy_document.app_comms[*].json)
}

data "aws_iam_policy_document" "app_comms" {
  count = var.app_comms_use_sns ? 1 : 0
  statement {
    effect  = "Allow"
    actions = ["SNS:Publish"]
    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.ecs_task.arn]
    }
    resources = [one(aws_sns_topic.app_comms[*].arn)]
  }
}

locals {
  std_container_definitions = [
    {
      cpu                   = 2048
      dnsSearchDomains      = []
      dnsServers            = []
      dockerLabels          = {}
      dockerSecurityOptions = []
      essential             = true
      extraHosts            = []
      image                 = "${var.app_repository.repository_url}:${var.app_image_version}"
      links                 = []
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-create-group  = "true"
          awslogs-group         = "${local.app_log_group_name}"
          awslogs-region        = "${data.aws_region.current.name}"
          awslogs-stream-prefix = "ecs"
        }
      }
      mountPoints      = []
      name             = "${var.name_prefix}-app-${local.unique_id}"
      portMappings     = []
      ulimits          = []
      volumesFrom      = []
      environment      = var.app_comms_use_sns ? concat(var.app_env_vars, tolist(local.use_sns_env_var)) : var.app_env_vars
      environmentFiles = []
      healthCheck = {
        command = [
          "CMD-SHELL",
          "curl -f http://localhost:8000/ || exit 1"
        ],
        interval = 30
        timeout  = 5
        retries  = 3
      }
    },
    {
      cpu                   = 512
      dnsSearchDomains      = []
      dnsServers            = []
      dockerLabels          = {}
      dockerSecurityOptions = []
      essential             = true
      extraHosts            = []
      image                 = "${var.proxy_repository.repository_url}:${var.proxy_image_version}"
      links                 = []
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-create-group  = "true"
          awslogs-group         = "${local.proxy_log_group_name}"
          awslogs-region        = "${data.aws_region.current.name}"
          awslogs-stream-prefix = "ecs"
        }
      }
      mountPoints = []
      name        = "${var.name_prefix}-proxy-${local.unique_id}"
      portMappings = [
        {
          name          = "app-http"
          containerPort = 80
          hostPort      = 80
          protocol      = "tcp"
          appProtocol   = "http"
        }
      ]
      ulimits          = []
      volumesFrom      = []
      environment      = var.proxy_env_vars
      environmentFiles = []
      healthCheck = {
        command = [
          "CMD-SHELL",
          "curl -f http://localhost:80/health/app || exit 1"
        ]
        interval = 30
        timeout  = 5
        retries  = 3
      }
    }
  ]

  worker_container_definition = [{
    cpu                   = 512
    dnsSearchDomains      = []
    dnsServers            = []
    dockerLabels          = {}
    dockerSecurityOptions = []
    essential             = true
    extraHosts            = []
    image                 = "${var.app_repository.repository_url}:${var.app_image_version}"
    links                 = []
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-create-group  = "true"
        awslogs-group         = "${local.worker_log_group_name}"
        awslogs-region        = "${data.aws_region.current.name}"
        awslogs-stream-prefix = "ecs"
      }
    }
    mountPoints      = []
    name             = "${var.name_prefix}-worker-${local.unique_id}"
    ulimits          = []
    volumesFrom      = []
    environment      = var.app_comms_use_sns ? concat(var.worker_env_vars, tolist(local.use_sns_env_var)) : var.worker_env_vars
    environmentFiles = []
    healthCheck = {
      command = [
        "CMD-SHELL",
        "echo ok || exit 1"
      ]
      interval = 30
      timeout  = 5
      retries  = 3
    }
  }]

  use_sns_env_var = [
    {
      name  = "JOB_MANAGER"
      value = "cvdp.appcomms.aws.AWS_SNSSQS_Communicator"
    },
    {
      name  = "ADVISE_SNS_ARN"
      value = one(aws_sns_topic.app_comms[*].arn)
    }
  ]
}
