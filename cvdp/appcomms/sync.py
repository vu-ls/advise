import traceback
from django.conf import settings
from cvdp.mailer import send_templated_mail, send_mail
from .appcommunicator import AppCommunicatorBase
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class Communicator(AppCommunicatorBase):

    def send_email(self, subject, message, recipients, **attrs):

        #if template is present, that means we should send
        # just the mad-lib version of a pre-defined template
        logger.debug(attrs)
        logger.debug(f"in send_email {recipients}")
        sent_to = []
        if attrs.get('ignore'):
            sent_to.extend(attrs['ignore'])
            
        if attrs.get('template'):
            for email in recipients:
                if email not in sent_to:
                    send_templated_mail(attrs['template'],
                                        attrs,
                                        email)
                    sent_to.append(email)

        else:
            #otherwise, we want to send an email without a standard
            #template
            for email in recipients:
                if email not in sent_to:
                    logger.debug(f"sending mail to {email}")
                    send_mail(subject, message, email, attrs)
                    sent_to.append(email)

            
            
            


