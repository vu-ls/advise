# Configure monitoring magic

# get our region
data "aws_region" "current" {}

# get our id
data "aws_caller_identity" "current" {}

