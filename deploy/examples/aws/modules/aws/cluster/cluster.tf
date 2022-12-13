# cluster module
# Create a simple AWS ECS cluster. 

resource "aws_ecs_cluster" "default" {
  name = "${var.name_prefix}-ecs-${local.unique_id}"
  #configuration {
  #    execute_command_configuration {
  #      logging = "OVERRIDE"
  #      log_configuration {
  #        cloud_watch_log_group_name = aws_cloudwatch_log_group.advise.name
  #      }
  #    }
  #}
}
