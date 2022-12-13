from django.conf import settings
from django.contrib.auth.models import Group
from django.contrib.auth import get_user_model
from authapp.models import User
from authapp.exceptions import *
import urllib
import json
import time
import logging
import traceback

User = get_user_model()

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

            
def send_courtesy_email(template_name, user):
    s = user.userprofile.settings.get('email_preference', 1)
    if int(s) == 1:
        html = True
    else:
        html = False

    send_templated_mail(
        template_name,
	tmpl_context,
        recipients=user.email,
    )

def admin_revoke_api_key(user):

    if auth_method:
        return auth_method.admin_revoke_api_key(user.username)
    try:
        token = APIToken.objects.get(user=user)
        token.delete()
    except APIToken.DoesNotExist:
        logger.debug("Token does not existE")
        pass
        
