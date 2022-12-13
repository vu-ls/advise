# storage module
# Set up an AWS S3 bucket to store data. 
# Public access block policies applied.

# get our region
data "aws_region" "current" {}

# get our id
data "aws_caller_identity" "current" {}

