# obtain refs to the default KMS keys
data "aws_kms_key" "sns_aws_key" {
  key_id = "alias/aws/sns"
}
data "aws_kms_key" "lambda_aws_key" {
  key_id = "alias/aws/lambda"
}
data "aws_kms_key" "secretsmanager_aws_key" {
  key_id = "alias/aws/secretsmanager"
}
data "aws_kms_key" "ebs_aws_key" {
  key_id = "alias/aws/ebs"
}
data "aws_kms_key" "s3_aws_key" {
  key_id = "alias/aws/s3"
}
data "aws_kms_key" "rds_aws_key" {
  key_id = "alias/aws/rds"
}

# FUTURE: 
#   * Accept keys as vars and return those if specified.
#   * Take switches to create new keys with rotation policy.
#
# For now, we just grab the AWS-managed keys and return those.

