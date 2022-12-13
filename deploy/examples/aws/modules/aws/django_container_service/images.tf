# fetch info on image versions
data "aws_ecr_image" "app" {
  repository_name = var.app_repository.name
  image_tag       = var.app_image_version
}
data "aws_ecr_image" "proxy" {
  repository_name = var.proxy_repository.name
  image_tag       = var.proxy_image_version
}
