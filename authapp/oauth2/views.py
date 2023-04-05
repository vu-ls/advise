from django.shortcuts import render
from django.views.generic import FormView, TemplateView
#from django.contrib.auth import get_user_model
import logging
import requests
from allauth.socialaccount.providers.oauth2.views import (OAuth2Adapter, OAuth2LoginView, OAuth2CallbackView)
from .provider import AdViseProvider
from django.conf import settings

#User = get_user_model()

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Create your views here.
#def get_oauth2_clients(request):
#    clients = Application.objects.all()
#    clientsjs = [obj.as_dict() for obj in clients]
#    data = json.dumps({'clients': clientsjs})
#    mimetype = 'application/json'
#    return HttpResponse(data, mimetype)


class CustomAdapter(OAuth2Adapter):
    provider_id = AdViseProvider.id
    # Called programmatically, must be reachable from container
    access_token_url = '{}/o/token/'.format(settings.OAUTH_SERVER_INTERNAL_URL)
    # This is the only URL accessed by the browser so must be reachable by the host
    authorize_url = '{}/o/authorize/'.format(settings.OAUTH_SERVER_BASEURL) 
    profile_url = '{}/profile/'.format(settings.OAUTH_SERVER_INTERNAL_URL)

    def complete_login(self, request, app, token, **kwargs):
        print("WHEN AM I HERE?")
        headers = {'Authorization': 'Bearer {0}'.format(token.token)}
        logger.debug(headers)
        resp = requests.get(self.profile_url, headers=headers)
        logger.debug(resp)
        logger.debug(resp.request.url)
        logger.debug(resp.request.body)
        logger.debug(resp.request.headers)
        extra_data = resp.json()
        logger.debug(extra_data)
        logger.debug(self.get_provider())
        logger.debug(self.get_provider().sociallogin_from_response(request, extra_data))
        return self.get_provider().sociallogin_from_response(request, extra_data)

oauth2_login = OAuth2LoginView.adapter_view(CustomAdapter)
oauth2_callback = OAuth2CallbackView.adapter_view(CustomAdapter)




    

    

    
