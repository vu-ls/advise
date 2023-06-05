output "cf_protection_header" {
  value = local.cf_protection_header
}

output "fqdn" {
  value = aws_route53_record.app_lb.fqdn
}

output "ecs_task_role_id" {
  value = aws_iam_role.ecs_task.id
}

output "ecs_task_exe_role_id" {
  value = aws_iam_role.ecs_task_exe.id
}

output "ecs_service_name" {
  value = aws_ecs_service.default.name
}

output "elb_id" {
  value = aws_lb.default.id
}
