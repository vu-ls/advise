
from allauth.socialaccount.models import SocialAccount
from allauth.mfa.utils import is_mfa_enabled
from django.utils.deprecation import MiddlewareMixin
from django.http import HttpRequest, HttpResponse
from django.contrib import messages
from django.conf import settings
from allauth.account.adapter import get_adapter
from django.shortcuts import redirect

"""
adapted from django-allauth-2fa
"""
def is_local(user):
    return user.has_usable_password()

class Require2FAMiddleware(MiddlewareMixin):
    """
    Ensure that particular users have two-factor authentication enabled before
    they have access to the rest of the app.

    If they don't have 2FA enabled, they will be redirected to the 2FA
    enrollment page and not be allowed to access other pages.
    """

    # List of URL names that the user should still be allowed to access.
    allowed_pages = [
        # They should still be able to log out or change password.
        "account_change_password",
        "account_logout",
        "account_reset_password",
        "account_reauthenticate",
        # URLs required to set up two-factor
        "mfa_activate_totp",
    ]
    # The message to the user if they don't have 2FA enabled and must enable it.
    require_2fa_message = (
        "You must enable two-factor authentication before doing anything else."
    )


    def on_require_2fa(self, request: HttpRequest) -> HttpResponse:
        """
        If the current request requires 2FA and the user does not have it
        enabled, this is executed. The result of this is returned from the
        middleware.
        """
        # See allauth.account.adapter.DefaultAccountAdapter.add_message.
        if "django.contrib.messages" in settings.INSTALLED_APPS:
            # If there is already a pending message related to two-factor (likely
            # created by a redirect view), simply update the message text.
            storage = messages.get_messages(request)
            tag = "2fa_required"
            for m in storage:
                if m.extra_tags == tag:
                    m.message = self.require_2fa_message
                    break
            # Otherwise, create a new message.
            else:
                messages.error(request, self.require_2fa_message, extra_tags=tag)
            # Mark the storage as not processed so they'll be shown to the user.
            storage.used = False

        # Redirect user to two-factor setup page.
        return redirect("mfa_activate_totp")

    def is_allowed_page(self, request: HttpRequest) -> bool:
        return request.resolver_match.url_name in self.allowed_pages


    def require_2fa(self, request):
        if is_local(request.user):
            #all local users are required to have mfa enabled
            return True
        #social users don't typically have a password on file - so
        # their provider is responsible for 2fa
        return False

    def process_view(
        self,
        request: HttpRequest,
        view_func,
        view_args,
        view_kwargs,
    ) -> HttpResponse | None:
        # The user is not logged in, do nothing.
        if request.user.is_anonymous:
            return None

        # If this doesn't require 2FA, then stop processing.
        if not self.require_2fa(request):
            return None

        # If the user is on one of the allowed pages, do nothing.
        if self.is_allowed_page(request):
            return None

        print("IS MFA ENABLED?")
        # User already has two-factor configured, do nothing.
        if is_mfa_enabled(request.user):
            print("BOOSH")
            return None
        print("WOMP WOMP")
        # The request required 2FA but it isn't configured!
        return self.on_require_2fa(request)


    
class APIKeyMiddleware(object):
    """
        A simple middleware to pull the users API key from the headers and
        attach it to the request.
        It should be compatible with both old and new style middleware.
    """

    def __init__(self, get_response=None):
        self.get_response = get_response

    def __call__(self, request):
        self.process_request(request)
        response = self.get_response(request)

        return response

    @staticmethod
    def process_request(request):
        if 'HTTP_AUTHORIZATION_ID' in request.META:
            request.api_key = request.META['HTTP_AUTHORIZATION_ID']

        return None
