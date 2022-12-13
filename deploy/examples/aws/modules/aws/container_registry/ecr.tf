# ecr module
# Create an AWS ECR resource.

# ECR config
resource "aws_ecr_repository" "default" {
  name                 = "${var.name_prefix}-${local.unique_id}"
  image_tag_mutability = "MUTABLE"

  force_delete = var.force_delete

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "default" {
  repository = aws_ecr_repository.default.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "retain last ${var.retain} images"
      action = {
        type = "expire"
      }
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = var.retain
      }
    }]
  })
}
