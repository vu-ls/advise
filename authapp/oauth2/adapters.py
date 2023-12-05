
from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.conf import settings


class AdViseAccountAdapter(DefaultAccountAdapter):

    def render_mail(self, template_prefix, email, context, headers=None):

        context['homepage'] = f"{settings.SERVER_NAME}"
        if hasattr(settings, "LOGO"):
            context['logo'] = f"{settings.LOGO}"
        if hasattr(settings, 'EMAIL_SIG'):
            context['email_signature'] = settings.EMAIL_SIG

        return super(AdViseAccountAdapter, self).render_mail(
            template_prefix, email, context, headers)
    
class AdViseSocialAccountAdapter(DefaultSocialAccountAdapter):

    def populate_user(self, request, sociallogin, data):

        #print(sociallogin.account.provider)
        #print(data)

        user = super().populate_user(request, sociallogin, data)
        
        if sociallogin.account.provider == "adviseprovider":
            user.screen_name = data.get('screen_name')
            user.title = data.get('title')
            user.org = data.get('org')
            
        return user


    """
    
    def pre_social_login(self, request, sociallogin):

        # do we already have this user?
        user = sociallogin.user
        if user.id:
            return

        #if this is a new user, do we already have their email?
        try:
            email = get_user_model().objects.get(email__iexact=user.email)
            sociallogin.connect(request, email)
        except User.DoesNotExist:
            pass
        
        
        print("FooAppSocialAccountAdapter.pre_social_login")
        return super(AdViseSocialAccountAdapter, self).pre_social_login(
            request, sociallogin
        )

    def save_user(self, request, sociallogin, form=None):
        print("FooAppSocialAccountAdapter.save_user")
        return super(AdViseSocialAccountAdapter, self).save_user(
            request, sociallogin, form
        )

    """
