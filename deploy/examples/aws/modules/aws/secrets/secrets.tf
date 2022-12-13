# secrets module
# Create an AWS Secrets Manager secret entry, using a JSON-encoded 
# username/password pair. Allow the user to specify a password. If
# one is not specified, generate a random password that is AWS RDS
# PostgreSQL-safe.

# secret config with random password
resource "aws_secretsmanager_secret" "default" {
  name = "${var.name_prefix}-secret-${local.unique_id}"
}
data "aws_secretsmanager_random_password" "random_password" {
  password_length     = 24
  exclude_punctuation = true
}
resource "aws_secretsmanager_secret_version" "default" {
  secret_id = aws_secretsmanager_secret.default.id
  secret_string = jsonencode({
    username = var.username
    password = var.password != null ? var.password : data.aws_secretsmanager_random_password.random_password.random_password
  })

  # don't replace the password because we auto-generated a new random one
  lifecycle {
    ignore_changes = [
      secret_string
    ]
  }
}
