# ADVISE Infrastructure
This directory contains the terraform framework to stand up ADVISE in AWS.

## Deployment
### Setup
1. Examine/create deployment variable file(s). For deployments managed from a
   local host, it is probably easiest to create a `terraform.tfvars` and
   include everything in one place. For deployments managed through a CI/CD
   pipeline or other automated system, consider creating a file that contains
   only elements safe for checkin to a VCS, and setting secrets and other
   variables that should be safeguarded via the CI/CD environment or secret
   system. An example vars file is included in the vars/ directory.
2. Create an IAM user with appropriate permissions, and generate a key pair.
3. Generate a SSH key pair and store it in EC2. The key name must be provided
   in the `ssh_key_name` TF variable. 
4. Create Route53 zone(s) if needed.

### Initial Deployment
Initial deployment is a multi-step process to bootstrap the environment. Once
the environment has been bootstrapped, deployment can be completed either on
the local host or through a CI/CD pipeline. Future deployment updates can be
completed using either method. 

1. Create container registries and build script
    `terraform apply -taget=local_file.advise_build_sh`
2. Run build script to generate and push container images
    - Set ADVISE_SRC_DIR to point to AdVISE repo
    - Set DOCKER_BUILDX to name of docker buildx container
        - Use `docker buildx ls` to find and use a previously created 
          buildx container. If you do not have one, use 
          `docker buildx create --use` to create a new one.
	- Set AWS_* environment variables for authentication (profile, secret key
      pair, etc.).
	- Set AWS_REGION to the primary deployment region. Note that some 
      resources (ACM certs for Cloudfront and Cloudfront WAF Web ACLs, for 
      instance) will be created in "us-east-1" due to AWS requirements.
	- Run the build script
        `./advise-build.sh`
- Apply the remainder of the terraform resources. Note that you will likely 
  have to run this twice due to a long-standing terraform/aws provider bug 
  with default tags. The first run will fail complaining about "name" tag 
  values. A second run should work.
