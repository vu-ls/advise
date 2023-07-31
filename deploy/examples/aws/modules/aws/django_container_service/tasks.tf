# ECS task config
resource "aws_ecs_task_definition" "default" {
  family                   = "${var.name_prefix}-ecs-task-${local.unique_id}"
  task_role_arn            = aws_iam_role.ecs_task.arn
  execution_role_arn       = aws_iam_role.ecs_task_exe.arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "4096"
  memory                   = "8192"
  container_definitions    = <<DEFINITION
[
  {
    "cpu": 0,
    "dnsSearchDomains": [],
    "dnsServers": [],
    "dockerLabels": {},
    "dockerSecurityOptions": [],
    "essential": true,
    "extraHosts": [],
    "image": "${var.app_repository.repository_url}:${var.app_image_version}",
    "links": [],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-create-group": "true",
        "awslogs-group": "${local.app_log_group_name}",
        "awslogs-region": "${data.aws_region.current.name}",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "mountPoints": [],
    "name": "${var.name_prefix}-app-${local.unique_id}",
    "portMappings": [],
    "ulimits": [],
    "volumesFrom": [],
    "environment": ${jsonencode(var.app_env_vars)},
    "environmentFiles": [],
    "healthCheck": {
      "command": [
        "CMD-SHELL",
        "curl -f http://localhost:8000/ || exit 1"
      ],
      "interval": 30,
      "timeout": 5,
      "retries": 3
    }
  },
  {
    "cpu": 0,
    "dnsSearchDomains": [],
    "dnsServers": [],
    "dockerLabels": {},
    "dockerSecurityOptions": [],
    "essential": true,
    "extraHosts": [],
    "image": "${var.proxy_repository.repository_url}:${var.proxy_image_version}",
    "links": [],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-create-group": "true",
        "awslogs-group": "${local.proxy_log_group_name}",
        "awslogs-region": "${data.aws_region.current.name}",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "mountPoints": [],
    "name": "${var.name_prefix}-proxy-${local.unique_id}",
    "portMappings": [
      {
        "name": "app-http",
        "containerPort": 80,
        "hostPort": 80,
        "protocol": "tcp",
        "appProtocol": "http"
      }
    ],
    "ulimits": [],
    "volumesFrom": [],
    "environment": ${jsonencode(var.proxy_env_vars)},
    "environmentFiles": [],
    "healthCheck": {
      "command": [
        "CMD-SHELL",
        "curl -f http://localhost:80/health/app || exit 1"
      ],
      "interval": 30,
      "timeout": 5,
      "retries": 3
    }
  }
]
DEFINITION
}
