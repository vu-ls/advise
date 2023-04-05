from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from django.contrib import messages
from django.shortcuts import redirect
from django.urls import resolve

class ProviderTwoFactorMiddleware(MiddlewareMixin):
    """
    Reset the login flow if another page is loaded halfway through the login.
    (I.e. if the user has logged in with a username/password, but not yet
    entered their two-factor credentials.) This makes sure a user does not stay
    half logged in by mistake.
    """

    def process_request(self, request):
        match = resolve(request.path)
        if not match.url_name or not match.url_name.startswith(
            "mfa"
        ):
            try:
                del request.session["mfa_user_id"]
            except KeyError:
                print("KEY ERROR PASS")
                pass


class Base2FAMiddleware(MiddlewareMixin):

    allowed_pages = [
        # They should still be able to log out or change password.
        "account_logout",
        "logout",
        "mfa",
        "register",
        "login",
        # URLs required to set up two-factor
        "setup_mfa",
    ]
    
    # The message to the user if they don't have 2FA enabled and must enable it.
    require_2fa_message = (
        "You must enable two-factor authentication before doing anything else."
    )

    def on_require_2fa(self, request):
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
            tag = "danger"
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
        return redirect("provider:setup_mfa")
    
    def is_allowed_page(self, request):
        return request.resolver_match.url_name in self.allowed_pages

    def require_2fa(self, request):
        raise NotImplementedError("You must implement require_2fa to use base class.")
    
    def process_view(self, request, view_func, view_args, view_kwargs):
        # The user is not logged in, do nothing.
        if request.user.is_anonymous:
            return None
        
        # If this doesn't require 2FA, then stop processing.
        if not self.require_2fa(request):
            return None
        
        # If the user is on one of the allowed pages, do nothing.
        if self.is_allowed_page(request):
            return None

        if request.user.totpdevice_set.filter(confirmed=True).exists():
            # User already has two-factor configured, do nothing.
            return None

        # The request required 2FA but it isn't configured!
        return self.on_require_2fa(request)


class Require2FAMiddleware(Base2FAMiddleware):

    def require_2fa(self, request):
        #all users are required to have mfa enabled
        if settings.REQUIRE_MFA_AUTH:
            return True
        #if not set, or if REQUIRE_MFA_AUTH is False
        return False
