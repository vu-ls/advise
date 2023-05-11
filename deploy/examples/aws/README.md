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
5. Create a DynamoDB table for state locking. 
    * Default name: `terraform-state-locking`.
    * Primary key: `LockID`, type "string".
    * Table class: Standard
    * Capacity mode: On-demand
    * Enable deletion protection if desired
6. Create a S3 bucket to store state.
    * Disable ACL
    * Block all public access
    * Enable bucket versioning
7. If using AWS SES for email, create a verified identity for the domain
   name configured in the variables. This should be in us-east-1, unless
   you have configured the vars and modules here to use an alternate 
   region. Optionally, also configure a custom MAIL_FROM in AWS.
7. Run init to set up terraform. Supply S3 configuration when prompted.
    * `terraform init`
    * If using vars file: `terraform init -var-file=vars/var_file.tfvars`


### Initial Deployment
Initial deployment is a multi-step process to bootstrap the environment. Once
the environment has been bootstrapped, deployment can be completed either on
the local host or through a CI/CD pipeline. Future deployment updates can be
completed using either method. 

1. If using environments, don't forget to switch to the appropriate environment.
    * example: `terraform workspace select -or-create {name}`
2. Create container registries and build script
    * `terraform apply -target=local_file.advise_build_sh`
    * If using vars file: `terraform apply -var-file=vars/var_file.tfvars -target=local_file.advise_build.sh`
3. Run build script to generate and push container images
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
4. Apply the remainder of the terraform resources. Note that you will likely 
  have to run this twice due to a long-standing terraform/aws provider bug 
  with default tags. The first run will fail complaining about "name" tag 
  values. A second run should work.
