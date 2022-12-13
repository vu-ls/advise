output "arn" {
  value = aws_s3_bucket.default.arn
}

output "id" {
  value = aws_s3_bucket.default.id
}

output "url" {
  value = aws_s3_bucket.default.bucket_regional_domain_name
}
