from __future__ import absolute_import, unicode_literals
import json
import os
from django.conf import settings
from celery.utils.log import get_task_logger
from cvdp.mailer import mailer_send_email
from django.contrib.auth import get_user_model
from .celery import app
import logging

logger = get_task_logger(__name__)
logger.setLevel(logging.DEBUG)

User = get_user_model()

@app.task
def cvdp_task(subject, message, **attrs):


    pass


@app.task
def cvdp_send_email(subject, message, recipients, **attrs):
    logger.debug("WE ARE IN MAIL")
    mailer_send_email(subject, message, recipients, **attrs)

