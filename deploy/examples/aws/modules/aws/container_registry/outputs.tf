output "arn" {
  value = aws_ecr_repository.default.arn
}

output "name" {
  value = aws_ecr_repository.default.name
}

output "repository_url" {
  value = aws_ecr_repository.default.repository_url
}

output "registry_id" {
  value = aws_ecr_repository.default.registry_id
}
