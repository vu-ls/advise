from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
import logging
from django.utils.module_loading import import_string
logger = logging.getLogger()
logger.setLevel(logging.DEBUG)
import traceback

class AppCommunicatorBase:

    # maybe for app to app comms?
    def publish_message(self, subject, message, **attrs):
        return None

    def send_email(self, subject, message, recipients, **attrs):
        return None

    # not sure we need this yet
    def receive_message():
        return None
    

def load_backend(path):
    return import_string(path)()


def get_backend():

    communicator_path = None

    try:
        communicator_path = settings.JOB_MANAGER
    except:
        communicator_path = 'cvdp.appcomms.sync.Communicator'

    if not communicator_path:
        raise ImproperlyConfigured(
            'No communication backend has been defined. Please '
            'add JOB_MANAGER to settings.py.')

    communicator = load_backend(communicator_path)

    return communicator

def cvdp_send_email(subject, message, recipients, **attrs):

    logger.debug("IN APP COMMS - SEND EMAIL")
    communicator = get_backend()

    try:
        rv = communicator.send_email(subject, message, recipients, **attrs)
    except Exception as e:
        logger.debug("Error publishing message")
        logger.debug(traceback.format_exc())
        return None
        
    return rv


def receive_message():
    pass
