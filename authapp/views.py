# Create your views here.
from django.contrib.auth.mixins import LoginRequiredMixin, AccessMixin, UserPassesTestMixin
from django.forms.utils import ErrorList
from django.http import Http404, JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.utils.translation import gettext as _
from django.utils.decorators import method_decorator
from django.core.exceptions import PermissionDenied
from urllib.parse import urlparse
from django.urls import reverse_lazy, reverse
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.response import Response
from django.views.generic import FormView, TemplateView
from django.contrib import messages
from django.urls import resolve
from django.contrib.auth import authenticate, login as auth_login
from django.views.decorators.cache import never_cache
from django.contrib.auth.views import LogoutView as CALogoutView
from django.contrib.auth.forms import PasswordChangeForm
from django.conf import settings
from django.contrib.auth import logout, get_user_model, update_session_auth_hash
from django.template.defaulttags import register
from authapp.forms import *
from authapp.models import *
from cvdp.models import MessageThread, GroupProfile
from cvdp.appcomms.appcommunicator import cvdp_send_email
from django.core.exceptions import SuspiciousOperation
import os
import binascii
import requests
import logging
import traceback
from django.utils.http import url_has_allowed_host_and_scheme
from allauth.socialaccount.forms import DisconnectForm
from django_otp.plugins.otp_totp.models import TOTPDevice


User = get_user_model()

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

GOOGLE_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'

def _unread_msg_count(user):
    return len(MessageThread.ordered(MessageThread.unread(user)))

def _my_contact_group(user):
    groups = user.groups.filter(groupprofile__vendor_type__in=["Coordinator", "Vendor"]).exclude(groupprofile__isnull=True)
    return groups

def _other_groups(user):
    groups = user.groups.exclude(groupprofile__isnull=False)
    return groups

def generate_key():
    return binascii.hexlify(os.urandom(20)).decode()

@register.filter('username')
def username(user):
    return user._metadata.get('username')

@register.filter('mfafilter')
def mfafilter(mfa_name):
    logger.debug(type(mfa_name))
    if type(mfa_name) == list:
        return ','.join(mfa_name).replace('_', ' ')
    else:
        return False


class PendingTestMixin(UserPassesTestMixin):

    def handle_no_permission(self):
        if self.raise_exception:
            raise PermissionDenied(self.get_permission_denied_message())
        if self.request.user.is_authenticated and self.request.user.pending:
            return redirect("authapp:pending")
        if self.request.user.is_authenticated and self.request.user.userprofile.service:
            return redirect("authapp:serviceaccount")
        elif self.request.user.is_authenticated:
            raise PermissionDenied(self.get_permission_denied_message())
        return redirect('%s?next=%s' % (reverse('authapp:login'), self.request.path))

    def test_func(self):
        if self.request.user.pending:
            return False
        else:
            return True


class PreferencesView(LoginRequiredMixin, PendingTestMixin, FormView):
    template_name='authapp/preferences.html'
    login_url="authapp:login"
    form_class=PreferencesForm
    success_url=reverse_lazy("authapp:preferences")

    def get_initial(self):
        s = self.request.user.userprofile
        return s.settings

    def form_valid(self, form):
        logger.debug(f"{self.__class__.__name__} post: {self.request.POST}")
        s = self.request.user.userprofile
        settings = s.settings
        for k,v in form.cleaned_data.items():
            settings[k] = v
        s.settings = settings
        s.save()
        messages.success(
            self.request,
            "Got it! Your preferences have been saved."
            )
        return super().form_valid(form)
        
class UnauthProfileView(TemplateView):
    template_name = "authapp/unauthprofile.html"
        
class ProfileView(LoginRequiredMixin, PendingTestMixin,TemplateView):
    template_name = 'authapp/profile.html'
    login_url = "authapp:login"
    
    def get_context_data(self, **kwargs):
        context = super(ProfileView, self).get_context_data(**kwargs)
        return context

def pretty_request(request):
    headers = ''
    for header, value in request.META.items():
        if not header.startswith('HTTP'):
            continue
        header = '-'.join([h.capitalize() for h in header[5:].lower().split('_')])
        headers += '{}: {}\n'.format(header, value)

    return (
        '{method} HTTP/1.1\n'
        'Content-Length: {content_length}\n'
        'Content-Type: {content_type}\n'
        '{headers}\n\n'
        '{body}'
    ).format(
        method=request.method,
        content_length=request.META.get('CONTENT_LENGTH'),
        content_type=request.META.get('CONTENT_TYPE'),
        headers=headers,
        body=request.body,
    )


class CustomAuthToken(ObtainAuthToken):

     def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        return Response({
            'token': request.session.get('ID_TOKEN'),
            'email': user.username
        })


class LoginHelpView(TemplateView):
    template_name = 'authapp/loginhelp.html'

    def get_context_data(self, **kwargs):
        context = super(LoginHelpView, self).get_context_data(**kwargs)

        return context
    

class APITokenView(LoginRequiredMixin, TemplateView):
    template_name = 'authapp/gentoken.html'
    login_url = "authapp:login"

    def get_context_data(self, **kwargs):
        context = super(APITokenView, self).get_context_data(**kwargs)
        #if this is a POST, we have already confirmed key refresh     
        if not self.request.POST:
            try:
                token = APIToken.objects.get(user=self.request.user)
                if token:
                    context['token'] = token
                    context['confirm'] = 1
                    return context
            except:
                pass

        # generate a token                                                      

        
        token = APIToken(user=self.request.user)
        context['token'] = token.generate_key()
        token.save(context['token'])
        logger.debug(f"New API key generated for { self.request.user.username }")
        return context

    def post(self, request, *args, **kwargs):
        logger.debug(f"{self.__class__.__name__} post: {self.request.POST}")

        try:
            token = APIToken.objects.get(user=self.request.user)
            token.delete()
        except APIToken.DoesNotExist:
            pass

        context = self.get_context_data()
        return render(request, self.template_name, context)
    
class MFAAccessView(LoginRequiredMixin, FormView):
    template_name = 'authapp/access.html'
    login_url = "authapp:login"
    form_class = DisconnectForm

    def get_success_url(self):
        return reverse_lazy('authapp:mfaaccess')    

    def get_form_kwargs(self):
        kwargs = super(MFAAccessView, self).get_form_kwargs()
        kwargs["request"] = self.request
        return kwargs

    def form_valid(self, form):
        messages.success(self.request,
                         "The social account has been disconnected.")
        form.save()
        return super(MFAAccessView, self).form_valid(form)
    
    def form_invalid(self, form):
        logger.debug(f"disconnect: {form.errors}")
        return super().form_invalid(form)
    
    def get_context_data(self, **kwargs):
        context = super(MFAAccessView, self).get_context_data(**kwargs)
        context['groups'] = self.request.user.groups.values_list('name', flat=True)
        context['api_key'] = APIToken.objects.filter(user=self.request.user).first()
        return context


class ResetUserMFAView(LoginRequiredMixin, UserPassesTestMixin, TemplateView):
    template_name = 'authapp/removemfa.html'
    login_url = "authapp:login"


    def test_func(self):
        return self.request.user.is_coordinator

    def post(self, request, *args, **kwargs):
        # Delete any backup tokens and their related static device.
        user = get_object_or_404(User, id=self.kwargs['pk'])
        
        try:
            static_device = user.staticdevice_set.get(name="backup")
            static_device.token_set.all().delete()
            static_device.delete()
        except:
            logger.debug("backup tokens do not exist")
            pass

        try:
            # Delete TOTP device.
            device = TOTPDevice.objects.get(user=user)
            device.delete()
        except:
            logger.debug("MFA not set")
            pass

        email_context={'template': 'mfa_removed'}
        cvdp_send_email(None, None, [user.email], **email_context) 
        messages.success(self.request, 'User MFA successfully reset.  User will be prompted to add new MFA device on next refresh.')
        
        return JsonResponse({'message': 'success'}, status=200)
        
    
    def get_context_data(self, **kwargs):
        context = super(ResetUserMFAView, self).get_context_data(**kwargs)
        return context
    
class UpdateProfilePhoto(LoginRequiredMixin, PendingTestMixin,FormView):
    template_name='authapp/profile.html'
    form_class=UploadProfilePhotoForm
    login_url = "authapp:login"

    def get_form_kwargs(self):
        kwargs = super(UpdateProfilePhoto, self).get_form_kwargs()
        kwargs.update({
            "user": self.request.user
        })
        return kwargs

    def get(self, request, *args, **kwargs):
        # this is post only
        return redirect("authapp:profile")
    
    def form_valid(self, form):
        logger.debug(self.request.POST)
        file = self.request.FILES.get('file')
        if self.request.POST.get('delete'):
            doc = form.save()
        else:
            logger.debug("saving file");
            logger.debug(file);
            doc = form.save(file=file)
        return render(self.request, 'authapp/logo.html', {'user': self.request.user})


class UpdateProfileView(LoginRequiredMixin, PendingTestMixin,FormView):
    template_name = 'authapp/profile.html'
    form_class = ProfileForm
    login_url = "authapp:login"

    def get_success_url(self):
        return reverse_lazy('authapp:profile')

    def get_initial(self):
        initial = {}
        initial['email'] = self.request.user.email
        initial['timezone'] = self.request.user.userprofile.timezone
        initial['first_name'] = self.request.user.first_name
        initial['last_name'] = self.request.user.last_name
        initial['screen_name'] = self.request.user.screen_name
        initial['org'] = self.request.user.org
        initial['title'] = self.request.user.title
        logger.debug(initial)
        return initial

    def get_context_data(self, **kwargs):
        context = super(UpdateProfileView, self).get_context_data(**kwargs)
        context['unread_msg_count'] = _unread_msg_count(self.request.user)
        return context
        
    def form_valid(self, form):
        logger.debug(form.cleaned_data)
        self.request.user.first_name = form.cleaned_data['first_name']
        self.request.user.last_name = form.cleaned_data['last_name']
        self.request.user.screen_name=form.cleaned_data['screen_name']
        self.request.user.org= form.cleaned_data['org']
        self.request.user.title=form.cleaned_data['title']
        self.request.user.userprofile.timezone = form.cleaned_data['timezone']
        self.request.user.userprofile.save()
        self.request.user.save()
        self.request.session['timezone'] = self.request.user.userprofile.timezone  
        messages.success(self.request,'You have successfully updated your profile.')
        return super(UpdateProfileView, self).form_valid(form)

    
class LogoutView(CALogoutView):

    @method_decorator(never_cache)
    def dispatch(self, request, *args, **kwargs):
        request.session.delete()
        return super(LogoutView, self).dispatch(request, *args, **kwargs)


