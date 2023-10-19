import json
from django.conf import settings
import redis
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.response import Response
import logging
import traceback
from .appcommunicator import AppCommunicatorBase
from cvdp.tasks import cvdp_task, cvdp_send_email

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class CeleryRedis_Communicator(AppCommunicatorBase):

    def publish_message(self, receiver, subject, message, **attrs):

        cvdp_task.delay(subject, message, **attrs)
        

    def send_email(self, subject, message, recipients, **attrs):

        cvdp_send_email.delay(subject, message, recipients, **attrs)
