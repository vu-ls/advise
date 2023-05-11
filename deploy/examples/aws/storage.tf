# AdVISE static files
module "app_static_bucket" {
  source      = "./modules/aws/storage"
  name_prefix = "${local.name_prefix}-app-static-files"
}

resource "aws_cloudfront_origin_access_identity" "app_static_bucket" {
  comment = "AdVISE App Static Bucket OAID"
}

data "aws_iam_policy_document" "app_static_bucket_cf_access" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${module.app_static_bucket.arn}/*"]
    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.app_static_bucket.iam_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "app_static_files" {
  bucket = module.app_static_bucket.id
  policy = data.aws_iam_policy_document.app_static_bucket_cf_access.json
}

# AdVISE Attachments
module "app_attachments_bucket" {
  source      = "./modules/aws/storage"
  name_prefix = "${local.name_prefix}-app-attachment-files"
}

# Attachments and media are fetched through the app when app DEBUG=True. 
# Otherwise, use AWS CF.
#
# Note: Attachments are served through the app to enforce permissions. The app
#       accesses them through the bucket directly, and has AWS permissions to
#       do so. They shouldn't normally be available through cloudfront.

resource "aws_cloudfront_origin_access_identity" "app_attachments_bucket" {
  comment = "AdVISE App Attachments Bucket OAID"
}
#
#data "aws_iam_policy_document" "app_attachments_bucket_cf_access" {
#  statement {
#    actions   = ["s3:GetObject"]
#    resources = ["${module.app_attachments_bucket.arn}/*"]
#    principals {
#      type        = "AWS"
#      identifiers = [aws_cloudfront_origin_access_identity.app_attachments_bucket.iam_arn]
#    }
#  }
#}
#
#resource "aws_s3_bucket_policy" "app_attachment_files" {
#  bucket = module.app_attachments_bucket.id
#  policy = data.aws_iam_policy_document.app_attachments_bucket_cf_access.json
#}

# AdVISE default file storage
module "app_media_bucket" {
  source      = "./modules/aws/storage"
  name_prefix = "${local.name_prefix}-app-media-files"
}

resource "aws_cloudfront_origin_access_identity" "app_media_bucket" {
  comment = "AdVISE App Media Bucket OAID"
}

data "aws_iam_policy_document" "app_media_bucket_cf_access" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${module.app_media_bucket.arn}/*"]
    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.app_media_bucket.iam_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "app_media_files" {
  bucket = module.app_media_bucket.id
  policy = data.aws_iam_policy_document.app_media_bucket_cf_access.json
}


# OAuth static files
module "oauth_static_bucket" {
  source      = "./modules/aws/storage"
  name_prefix = "${local.name_prefix}-oauth-static-files"

}
resource "aws_cloudfront_origin_access_identity" "oauth_static_bucket" {
  comment = "AdVISE OAuth Static Bucket OAID"
}

data "aws_iam_policy_document" "oauth_static_bucket_cf_access" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${module.oauth_static_bucket.arn}/*"]
    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.oauth_static_bucket.iam_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "oauth_static_files" {
  bucket = module.oauth_static_bucket.id
  policy = data.aws_iam_policy_document.oauth_static_bucket_cf_access.json
}
