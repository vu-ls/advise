import traceback
from django.conf import settings
from cvdp.mailer import mailer_send_email
from .appcommunicator import AppCommunicatorBase
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class Communicator(AppCommunicatorBase):

    def send_email(self, subject, message, recipients, **attrs):

        mailer_send_email(subject, message, recipients, **attrs)

    def publish_message(self, app, subject, message, **attrs):

        pass


