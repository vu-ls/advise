# ECS service configuration
resource "aws_ecs_service" "default" {
  name                               = "${var.name_prefix}-${local.unique_id}"
  cluster                            = var.cluster.id
  task_definition                    = aws_ecs_task_definition.default.arn
  desired_count                      = var.desired_count
  deployment_minimum_healthy_percent = var.minimum_healthy_percent
  deployment_maximum_percent         = var.maximum_percent
  launch_type                        = "FARGATE"
  scheduling_strategy                = "REPLICA"
  propagate_tags                     = "SERVICE"
  force_new_deployment               = var.force_new_deployment

  network_configuration {
    security_groups  = [aws_security_group.ecs.id]
    subnets          = var.network.private_subnets
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_alb_target_group.default.arn
    container_name   = "${var.name_prefix}-proxy-${local.unique_id}"
    container_port   = 80
  }

  triggers = {
    "app_image"   = data.aws_ecr_image.app.id
    "proxy_image" = data.aws_ecr_image.proxy.id
  }

  lifecycle {
    ignore_changes = [
      # note: cannot ignore task_definition at the moment
      #task_definition,
      desired_count
    ]
  }
}
