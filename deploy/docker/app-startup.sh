#!/bin/sh
#
# app-startup.sh
#
# This is used inside the docker container to do the basic
# migrations and startup for django to run under gunicorn.
# It is not intended to be executed outside of the container.

# If we don't have a secret key set in the container environment, 
# generate one. Use magic to avoid $'s.
if [ "X${WSGI_APP}" = "Xadvise.wsgi" ]; then
    export SECRET_KEY=${ADVISE_SECRET_KEY}
elif [ "X${WSGI_APP}" = "Xoauth2provider.wsgi" ]; then
    export SECRET_KEY=${OAUTH2PROVIDER_SECRET_KEY}
fi

if [ "X${SECRET_KEY}" = "X" ]; then
    echo "*** Generating new Django secret key"
    export SECRET_KEY=`python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key().replace("$", "!"))'`
fi

if [ "X${DEPLOYMENT_TYPE}" = "X" -o "X${DEPLOYMENT_TYPE}" = "local" ]; then
    # check to see if the database exists, and create if not
    export PGPASSWORD=$DB_PASS
    DB_EXISTS=`psql --host $DB_HOST --user $DB_USER -XtAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'"`
    if [ "X${DB_EXISTS}" != "X1" ]; then
        echo "*** Creating DB"
        psql --host $DB_HOST --user $DB_USER -XtAc "CREATE DATABASE $DB_NAME"
    fi
fi

# change to working directory for the app
cd ${WORKDIR}

# set email to be same as username for superuser
export DJANGO_SUPERUSER_EMAIL=${DJANGO_SUPERUSER_USERNAME}

# basic django startup foo
python manage.py makemigrations --noinput
python manage.py migrate --noinput
python manage.py createsuperuser --noinput
python manage.py loadinitialdata

if [ "X${NOCLEAR}" = "X" ]; then
    python manage.py collectstatic --noinput --clear
else
    python manage.py collectstatic --noinput
fi

if [ "X${RUN_TESTS_ONLY}" = "X${WSGI_APP}" ]; then
    # run the tests instead!
    python manage.py test
else
    # start the app!
    gunicorn ${WSGI_APP}:application --bind 0.0.0.0:8000 --workers=4 --forwarded-allow-ips "*"
fi
