# AdVISE Configuration

AdVISE has several configuration options for user authentication
and registration.  Most settings can be configured with environment
variables, but there are a few that need to be set in advise/settings.py.
Any settings not listed below should probably not be changed without expectations
of system failure.

## Environment Variables
### Deployment Settings
#### ALLOWED_HOSTS (=['127.0.0.1', 'localhost'])
   A list of strings representing the host/domains names that this site can serve.
   See [ALLOWED_HOSTS](https://docs.djangoproject.com/en/4.1/ref/settings/#allowed-hosts)
   for more information on this setting.

#### API_HASH_SALT (=SECRET_KEY)
   It is recommended to set this for API token generation.  By default, the
   SECRET_KEY environment variable will be used, but if it contains the '$'
   character, Django will throw an error.

#### CORS_ALLOWED_ORIGINS (=['http://localhost:3000'])
   Is a list of origins authorized to make requests. In a dev setup, this is the
   webpack dev server.

#### DB_HOST (='localhost')
   This is the hostname that is running the PSQL database.

#### DB_NAME (='advise')
   This is the name of the database that is storing AdVISE data.

#### DB_PASS (='advise')
   Set this to the password for the AdVISE database.

#### DB_PORT (='5432')
   This is the access port for the PSQL database.

#### DB_USER (='advise')
   AdVISE uses a PostgresSQL database backend. Set this to the user that
   has access to the AdVISE database.

#### DEBUG (=False)
   Set to True to enable DEBUG testing and logging. Not recommended for production use.

#### DEPLOYMENT_TYPE (='local')
   This is the type of deployment and will determine some of the other variables
   that will need to be set.

#### INSTALLED_APPS_EXTRAS
   Set to a space-separated list of additional apps to include in INSTALLED_APPS.

#### ORG_NAME (='Test')
   The name of your organization.  This will be used in the footer of the site
   and on automated email communications coming from AdVISE.

#### RECAPTCHA_SECRET_KEY
   Set to the value of the ReCAPTCHA secret key for this installation. 

#### RECAPTCHA_SITE_KEY
   Set to the value of the ReCAPTCHA site key for this installation. 

#### SECRET_KEY
   This will is not set by default, you need to set this in your environment
   variables before doing anything else. If you forget, Django will immediately
   remind you.


### CVE Settings
#### CVE_SERVICES_API (='test')
   The CVE Services API to use if you are planning to reserve, publish new
   CVEs.  More information about the CVE Services can be found on the (CVE project homepage)
   [https://cveproject.github.io/automation-cve-services]

### Authentication and Account Settings
#### ACCOUNT_EMAIL_VERIFICATION (='mandatory')
   Available options are "mandatory", "optional", or "none".  Mandatory is the default
   and will require users must verify their email through a link sent through email
   before login is permitted.  "Optional" still sends the verification email but allows
   user to login without verifying. Setting this to "None" will prevent the system from
   sending verification emails and users can login immediately.

#### OAUTH_SERVER_BASEURL (='http://localhost:8080')
   If using the OAuth2 provider provided with AdVISE, this is the URL to the
   running OAuth2 server.

#### DB_PASS (='advise')
   Set this to the password for the AdVISE database.

#### DB_PORT (='5432')
   This is the access port for the PSQL database.

#### DB_USER (='advise')
   AdVISE uses a PostgresSQL database backend. Set this to the user that
   has access to the AdVISE database.

#### DEBUG (=False)
   Set to True to enable DEBUG testing and logging. Not recommended for production use.

#### DEPLOYMENT_TYPE (='local')
   This is the type of deployment and will determine some of the other variables
   that will need to be set.

#### INSTALLED_APPS_EXTRAS
   Set to a space-separated list of additional apps to include in INSTALLED_APPS.

<<<<<<< HEAD
#### JOB_MANAGER
   Not required but recommended for production deployments so that long-running
   and scheduled tasks are offloaded to a worker application.  If JOB_MANAGER is not set,
   all tasks will be run by the AdVISE Application.  Other options are:

   - cvdp.appcomms.async.AdviseWorker_Communicator
   - cvdp.appcomms.celery.CeleryRedis_Communicator

   The AdVISE worker option is the preferred option and can be used
   in cloud deployments. [See additional documentation]

   If the Celery option is chosen, a number of other variables must be set:

   * CELERY_BROKER_URL
   * CELERY_RESULT_BACKEND
   * CELERY_BEAT_SCHEDULE (for scheduled tasks)

   


#### ORG_NAME (='Test')
   The name of your organization.  This will be used in the footer of the site
   and on automated email communications coming from AdVISE.

#### RECAPTCHA_SECRET_KEY
   Set to the value of the ReCAPTCHA secret key for this installation. 

#### RECAPTCHA_SITE_KEY
   Set to the value of the ReCAPTCHA site key for this installation. 

#### SECRET_KEY
   This will is not set by default, you need to set this in your environment
   variables before doing anything else. If you forget, Django will immediately
   remind you.


### CVE Settings
#### CVE_SERVICES_API (='test')
   The CVE Services API to use if you are planning to reserve, publish new
   CVEs.  More information about the CVE Services can be found on the (CVE project homepage)
   [https://cveproject.github.io/automation-cve-services]

### Authentication and Account Settings
#### ACCOUNT_EMAIL_VERIFICATION (='mandatory')
   Available options are "mandatory", "optional", or "none".  Mandatory is the default
   and will require users must verify their email through a link sent through email
   before login is permitted.  "Optional" still sends the verification email but allows
   user to login without verifying. Setting this to "None" will prevent the system from
   sending verification emails and users can login immediately.

#### OAUTH_SERVER_BASEURL (='http://localhost:8080')
   If using the OAuth2 provider provided with AdVISE, this is the URL to the
   running OAuth2 server.

#### OAUTH_SERVER_INTERNAL_URL (=OAUTH_SERVER_BASEURL)
   In some cases, the OAuth2 provider might have an intenral address that is
   different form the outside-facing address, or the outside-facing address
   might not be unreachable by the application service.  In this case, set the
   internal URL to the address that the application service can reach.

#### REQUIRE_ACCOUNT_APPROVAL (=False)
   If set to True, users will be put in a "pending" state and will not be able
   to access anything except submit a vulnerability report. Coordinator approval for
   each user is required.  Coordinators can approve pending users in the Triage view.
   If set to False, users will not be set to "pending" and users will have access
   immediately after registration.

### Email Settings
#### CONTACT_EMAIL (='')
   The email that will be used when sending automated emails from AdVISE.

#### EMAIL_BACKEND (='django.core.mail.backends.console.EmailBackend')
   By default, e-mails will be sent to the console.  To use your own SMTP
   server, set this to 'django.core.mail.backends.smtp.EmailBackend' and set the following
   environment variables

   * EMAIL_HOST
   * EMAIL_PORT
   * EMAIL_HOST_USER
   * EMAIL_HOST_PASSWORD
   * EMAIL_USE_TLS
   * EMAIL_US_SSL
   * EMAIL_TIMEOUT

   Alternatively, if you are using AWS, you can use the 'django_ses.SESBackend' and set the
   following environment variables

   * AWS_SES_REGION_NAME
   * AWS_SES_REGION_ENDPOINT


#### EMAIL_HEADERS (={})
   Optionally, append additional email headers when sending email notifications from AdVISE.

### Other settings:
#### CASE_IDENTIFER (="CASE#")
   The Case identifier that is prepended to the random 6-digit identifier that is given to
   every new case.

#### DISCLOSURE_POLICY_LINK (="")
   Optional link to your disclosure policy that can be found in the footer of AdVISE.

## Two-factor Authentication (2FA)

   By default, AdVISE requires all local users to enable 2FA upon registering with the
   application.  If you do not wish to require 2FA, remove 'authapp.middleware.Require2FAMiddleware'
   from the MIDDLEWARE setting in advise/settings.py
