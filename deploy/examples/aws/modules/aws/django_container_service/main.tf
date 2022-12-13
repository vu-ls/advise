# django_container_service module
# This module creates an AWS ECS service set up to run a django workload.
# This includes the django container itself, along with a reverse proxy
# container. 

# get our region
data "aws_region" "current" {}

# get our id
data "aws_caller_identity" "current" {}
