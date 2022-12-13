"""
from django.apps import AppConfig
from django.conf import settings
#from django.test.signals import settings_changed    

from authapp.plugins.registry import registry

class Oauth2Config(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'authapp.plugins.oauth2'

    def ready(self):
        register_methods(self, None, None)

def register_methods(sender, setting, value, **kwargs):
    from .method import OAuth2Method

    registry.register(OAuth2Method())
"""
