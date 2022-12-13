from allauth.socialaccount import providers
from allauth.socialaccount.providers.base import ProviderAccount
from allauth.socialaccount.providers.oauth2.provider import OAuth2Provider

class AdViseAccount(ProviderAccount):
    pass

class AdViseProvider(OAuth2Provider):
    id = 'adviseprovider'
    name = 'AdVise Provider'
    account_class = AdViseAccount

    def extract_uid(self, data):
        return str(data['id'])

    def extract_common_fields(self, data):
        from pprint import pprint
        print(data)
        return dict(username=data['username'],
                    email=data['email'],
                    first_name=data['first_name'],
                    last_name=data['last_name'],
                    title=data['title'],
                    screen_name=data['screen_name'],
                    org=data['organization']
                    )

    def get_default_scope(self):
        scope = ['read']
        return scope


providers.registry.register(AdViseProvider)

