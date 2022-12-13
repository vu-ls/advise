### Local (Development) Install

1. Clone the repository

2. Setup a virtual environment and install requirements

```
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
```

3. Setup a separate virtual environment and install requirements (if using provided OAuth2 provider)

```
cd advise/oauth2provider
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
```

4. Create Databases for AdVISE and OAuth2Provider (if using)

```
psql postgres
CREATE ROLE advise;
ALTER ROLE advise CREATEDB;
ALTER ROLE "advise" WITH LOGIN;
CREATE DATABASE advise;
GRANT ALL PRIVILEGES ON DATABASE advise TO advise;

CREATE DATABASE adviseprovider;
GRANT ALL PRIVILEGES ON DATABASE adviseprovider TO advise;
```

5. Edit oauth2provider/oauth2provider/.env with the following env variables

```
SECRET_KEY
DATABASE_URL
DB_USER
DB_NAME
DB_PASS
ALLOWED_HOSTS

```

6. Migrate and run OAuth2Provider

```
python manage.py migrate
python manage.py runserver 8080
```

7. Install node dependencies and run webpack dev server

```
npm install
npx webpack-dev-server
```



8. Generate AdVISE Secret Key

```
python3 -c 'from django.core.management.utils import get_random_secret_key;print(get_random_secret_key())'
```

9. Generate AdVISE API Hash Salt (optional, otherwise SECRET_KEY will be used. If using SECRET_KEY, swap out any "$" characters otherwise an error will occur when generating API Tokens)

```
python3 -c 'import secrets; print(secrets.token_hex(8))'
```

10. Create AdVISE advise/.env file with following environment variables

```
DATABASE_URL=postgres://postgres@127.0.0.1:5432/advise
DB_USER=advise
DB_NAME=advise
SECRET_KEY='XXXXXXXXXXXXXXX'
DEBUG=True
API_HASH_SALT='XXXXXXXXXXX'
```

11. Migrate Database

```
python manage.py migrate
```

12. Create superuser for initial login

```
python manage.py createsuperuser
```

13. Load initial data

```
python manage.py loadinitialdata
```

14. Run AdVISE

```
python manage.py runserver
```

15. You should now be able to login with superuser credentials at localhost:8000

## Setup OAuth2Provider

16. Follow [Step IV. Set up an Oauth2 Application](./README-quickstart.md#iv-set-up-an-oauth2-application) but use http://localhost:8000 and http://localhost:8080 as URLs.


