data "aws_secretsmanager_secret_version" "username" {
  secret_id = var.db_username_secret
}
data "aws_secretsmanager_secret_version" "password" {
  secret_id = var.db_username_secret
}

locals {
  username = jsondecode(data.aws_secretsmanager_secret_version.username.secret_string)["username"]
  password = jsondecode(data.aws_secretsmanager_secret_version.password.secret_string)["password"]
}
