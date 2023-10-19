from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
import logging
from django.utils.module_loading import import_string
import traceback

logger = logging.getLogger("cvdp")
logger.setLevel(logging.DEBUG)


class AppCommunicatorBase:

    # maybe for app to app comms?
    def publish_message(self, receiver, subject, message, **attrs):
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
        communicator_path = 'cvdp.appcomms.sync.Communicator'

    try:
        communicator = load_backend(communicator_path)
    except:
        raise ImproperlyConfigured(
            'No communication backend has been defined. Please '
            'add JOB_MANAGER to settings.py.')

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

def publish_message(receiver, subject, message, **attrs):

    communicator = get_backend()

    logger.debug('in app comms')
    logger.debug(communicator)
    try:
        rv = communicator.publish_message(receiver, subject, message, **attrs)
    except Exception as e:
        logger.debug(traceback.format_exc())
        return None

    return rv


def receive_message():
    pass
