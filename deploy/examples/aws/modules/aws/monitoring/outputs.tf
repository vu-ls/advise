output "ecs_state_topic_arn" {
  value = aws_sns_topic.ecs_state.arn
}

output "canary_header" {
  value = local.canary_protection_header
}
