from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.conf import settings
from authapp.models import APIToken
from rest_framework import exceptions
from rest_framework.authentication import TokenAuthentication
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

User = get_user_model()

class HashedTokenAuthentication(TokenAuthentication):
    """
    Simple token based authentication, but hashed!
    Clients should authenticate by passing the token key in the "Authorization"
    HTTP header, prepended with the string "Token ".  For example:
        Authorization: Token 401f7ac837da42b97f613d789819ff93537bee6a
    """
    model = APIToken

    def get_model(self):
        if self.model is not None:
            return self.model
        from rest_framework.authtoken.models import Token
        return Token

    """
    Use a custom token model so we can hash the API Key.
    """

    def authenticate_credentials(self, key):
        model = self.get_model()
        # use SECRET_KEY as salt
        hashed_key = make_password(key, settings.API_HASH_SALT)
        try:
            token = model.objects.select_related('user').get(key=hashed_key)
        except model.DoesNotExist:
            raise exceptions.AuthenticationFailed('Invalid token.')

        if not token.user.is_active:
            raise exceptions.AuthenticationFailed('User inactive or deleted.')

        token.last_used = timezone.now()
        token.save()
        
        return (token.user, token)

    
    
    
            
