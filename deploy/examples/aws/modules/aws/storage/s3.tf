# s3 buckets
resource "aws_s3_bucket" "default" {
  bucket = "${var.name_prefix}-bucket-${local.unique_id}"
}

#resource "aws_s3_bucket_acl" "static_bucket" {
#  bucket = aws_s3_bucket.static_bucket.id
#  acl    = "private"
#}

resource "aws_s3_bucket_public_access_block" "default" {
  bucket                  = aws_s3_bucket.default.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
