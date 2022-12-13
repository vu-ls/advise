"""
from django.utils.translation import gettext_lazy as _
from authapp.plugins.registry import AuthBase
from authapp.exceptions import *
from django.conf import settings
import traceback
from django.urls import reverse_lazy, reverse
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class OAuth2AuthBase(AuthBase):
    login_redirect=True
    
    def get_user(self, request):
        pass

    def get_login_redirect(self):
        return "authapp:oauth2:login"


    def authenticate(self, request, username=None, password=None):

        return
    
    
class OAuth2Method(OAuth2AuthBase):
    code = "oauth2"
    verbose_name = _('OAuth2')
   """ 
