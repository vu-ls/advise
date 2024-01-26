# return key id's
# FUTURE: If a key is provided by caller, use that instead.
# FUTURE: If we generate a key, use that instead.

output "sns_id" {
  value = data.aws_kms_key.sns_aws_key.arn
}
output "lambda_id" {
  value = data.aws_kms_key.lambda_aws_key.arn
}
output "secretsmanager_id" {
  value = data.aws_kms_key.secretsmanager_aws_key.arn
}
output "ebs_id" {
  value = data.aws_kms_key.ebs_aws_key.arn
}
output "s3_id" {
  value = data.aws_kms_key.s3_aws_key.arn
}
output "rds_id" {
  value = data.aws_kms_key.rds_aws_key.arn
}
