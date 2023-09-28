# AdVISE Quickstart
This guide will assist the reader in spinning up a local docker-based 
dev/test environment. This environment should not be used for production,
but with some modifications, it can form the basis for a small 
stand-alone deployment. 

## Requirements
The steps in this guide require `docker` and `docker-compose`, and a text
editor, along with some basic familiarity with containerized applications. 
This guide does not intend to be a primer on containers and does not delve 
into the accompanying security issues with containerized workloads. 

You will need access to edit your /etc/hosts file to add symbolic names
for the container endpoints. Procedures vary by operating system and are
not covered here.

A docker.com account is recommended, which will help when pulling base
images while building and testing the environment. 


## Initial Setup
### I. Setting up environment
1. Copy the `deploy/docker/example.env.test.local` into the top-level
directory (where you are reading this) as `.env.test.local`. 
2. Edit `.env.test.local` and change the `POSTGRES_PASSWORD`, `DB_PASS`,
and the three `DJANGO_SUPERUSER_*` variables as appropriate. **NOTE**: 
The `POSTGRES_PASSWORD` and `DB_PASS` __MUST MATCH__.  This file cannot
make reference to variables declared inside itself.
3. Add the following two entries to your `/etc/hosts` file:
```
127.0.0.1   app.advise.test
127.0.0.1   auth.advise.test
```
4. Ensure the docker environment is ready (i.e. run `docker info` and no
errors should be reported).
5. If you have a docker.com account and have not done so already, use
`docker login` to log in. Using app tokens is highly recommended from a
security standpoint. See the 
[docker.com token docs](https://docs.docker.com/docker-hub/access-tokens/)
for more information. For this application, you will only need a token
with public repo read permission.

### II. Build the containers for the environment
`docker-compose -f deploy/docker/docker-compose-test.yml build`

This will build the containers and should report no errors if everything
went smoothly. This might take a few minutes on first build to fetch the
base images.

### III. Start the environment
`docker-compose -f deploy/docker/docker-compose-test.yml up`

This will start the environment, including creating three docker storage
volumes to persist the database and share the generated static files.
You should see four containers running: 
- docker_db_1
- docker_advise_1
- docker_oauth2provider_1
- docker_nginx_1

### IV. Set up an OAuth2 Application
The dev/test environment includes a local OAuth2 provider. To use it, 
you will need to set up an application in it.
1. Point a web browser at http://auth.advise.test:8000
2. Log in using the username and password entered for `DJANGO_SUPERUSER_*`
in the .env.test.local file.
4. Go to Sites->Sites.
5. Select "example.com" to edit it.
6. For domain name, enter "auth.advise.test". For display name, use "AdVISE". Save.
7. Under "Django OAuth Toolkit", choose "Applications", then "Add Application".
8. In the "User" field, enter `1` (this is the id of the superuser).
9. In "Redirect uris", enter: `http://app.advise.test:8000/accounts/adviseprovider/login/callback/`
10. Choose "Confidential" for client type.
11. Choose "Authorization code" for grant type.
12. Enter a useful name, such as `local_provider`.
13. Leave "Algorithm" and "Skip authorization" as they are.
14. **IMPORTANT**: Copy the client secret and client id from this page and 
put it somewhere temporarily. It will be needed in a later step. 
15. After you have copied and temporarily stored the client id and secret, 
click "Save". 
16. Click "logout" to log out of the OAuth2 Provider.
17. Point your web browser back at http://auth.advise.test:8000
18. Register for a new account and complete the form.

### V. Set up AdVISE Authentication
1. Point a web browser at http://app.advise.test:8000
2. Log in using the username and password entered for `DJANGO_SUPERUSER_*`
in the .env.test.local file.
3. Upon first login, you will be asked to set up MFA. Follow the prompts to
do this.
4. You will also be asked to confirm your email. To do this, look at the console
output for the docker containers. You should see the contents of the confirmation
email printed to the console. Copy and paste the link into a web browser to 
confirm your email address.
10. Go to Sites->Sites.
11. Select "example.com" to edit it.
12. For domain name, enter "http://app.advise.test:8000
13. For display name, enter the same URL as above.
14. Save.
15. Go to Social Accounts->Social Applications
16. Click to add a Social Application. We are going to connect to the OAuth2 
provider we created above.
17. For Provider, choose "AdVISE Provider"
18. Provide a helpful name, like "local_provider".
19. Enter the client ID and secret copied from above. Leave the "key" field blank.
20. Add the `app.advise.test` site to the chosen sites list. 
21. Click Save.
22. Click Log Out (top right).

### VI. Verify Authentication
1. Point a web browser at http://app.advise.test:8000
2. Log in using the username you registered during the OAuth2 setup step.
3. At the second auth prompt, choose to log in with the AdVISE Provider.
4. Enter your username and password.
5. Set up MFA.
6. You will also be asked to confirm your email. To do this, look at the console
output for the docker containers. You should see the contents of the confirmation
email printed to the console. Copy and paste the link into a web browser to 
confirm your email address.
7. Authorize local_provider as requested.
8. Authorization should succeed and you will be logged in.
9. Click logout (top right drop-down menu). 

### VII. Optional Steps
  * Log into the app as the superuser, go to the Admin section, and edit the
  new user entry for the OAuth autheticated user. Enable "Staff" and "Superuser" 
  checkboxes if appropriate.

  * Navigate to the "Groups" view of AdVISE and click on the vertical 3 dots to
  add a new Group for the coordination team. Then, with the superuser account,
  go to the Admin section and select "Global Settings" under CVDP. Click the button
  to "Add Global Settings."  Select the group that you just created and click Save.
  This will be the main coordination group for this AdVISE instance. Non-coordinator
  users will be able to send messages to this group.

## Next Steps
At this point, the AdVISE environment is ready for site configuration. Refer
to the main documentation directory for further information. 

The environment created here uses Docker volumes to persist data. This is 
fine for initial testing, but consideration should be made for a more 
maintainable and robust data storage paradigm for any sort of deployment.

## Starting Over
If you run into issues or just want to start fresh:
1. Stop the environment
2. Note the names of the services and volumes in the docker-compose file.
2. Remove the four containers with `docker rm {name}`
3. Remove the three volumes with `docker volume rm {name}`