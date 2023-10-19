import json
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.response import Response
import logging
import traceback
from .appcommunicator import AppCommunicatorBase
from cvdp.tasks import cvdp_task, cvdp_send_email
from cvdp.manage.models import AdviseTask


logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class AdviseWorker_Communicator(AppCommunicatorBase):

    def publish_message(self, receiver, subject, message, **attrs):

        json_msg = {'message': message}

        if subject:
            json_msg['subject'] = subject

        
        if attrs:
            for k,v in attrs.items():
                json_msg[k] = v
	
        task = AdviseTask(task_type = 2,
                          task_info=json_msg)
        task.save()
        

    def send_email(self, subject, message, recipients, **attrs):

        json_msg = {'message': message, 'recipients': recipients}

        if subject:
            json_msg['subject'] = subject

        if attrs:
            for k,v in attrs.items():
                json_msg[k] = v

        task = AdviseTask(task_type = 1,
                          task_info=json_msg)
        task.save()
