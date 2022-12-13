from base64 import b64encode
from django.shortcuts import render, redirect
from django.contrib.auth.mixins import LoginRequiredMixin, AccessMixin
from oauth2_provider.decorators import protected_resource
from django.contrib.auth import get_user_model, login as auth_login
from oauth2_provider.views import TokenView
from django.contrib.auth import views as auth_views
from django.urls import reverse_lazy, reverse
from django.utils.encoding import force_str
from django.http import HttpResponse, HttpResponseRedirect
import json
from django.views import generic
from .forms import SignUpForm, TOTPDeviceForm, TOTPTokenForm, TOTPRemoveDeviceForm
from django_otp.forms import OTPTokenForm
from django_otp.plugins.otp_totp.models import TOTPDevice
from django.contrib import messages
from django_otp import user_has_device, devices_for_user

from base64 import b32encode
from io import BytesIO
from urllib.parse import quote, parse_qs, urlparse
from urllib.parse import urlencode
import qrcode
from qrcode.image.svg import SvgPathImage
from django.contrib.sites.shortcuts import get_current_site
from django.utils.http import url_has_allowed_host_and_scheme
import logging


logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# The protected user profile endpoint that will be called                                  
# upon successful sign-in to populate the client app database                              
class MFARequiredMixin(AccessMixin):

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()
        if not request.user.totpdevice_set.filter(confirmed=True).exists():
            return HttpResponseRedirect("provider:setup_mfa")
        return super().dispatch(request, *args, **kwargs)


@protected_resource(scopes=['read'])
def profile(request):
    return HttpResponse(json.dumps({
        "id": request.resource_owner.id,
        "username": request.resource_owner.username,
        "email": request.resource_owner.email,
        "first_name": request.resource_owner.first_name,
        "last_name": request.resource_owner.last_name,
        "screen_name":request.resource_owner.screen_name,
        "title": request.resource_owner.title,
        "organization": request.resource_owner.organization,
        
    }), content_type="application/json")


# Create your views here.

class WelcomeView(generic.TemplateView):
    template_name = 'provider/welcome.html'

    def get_context_data(self, **kwargs):
        context = super(WelcomeView, self).get_context_data(**kwargs)
        print(self.request.user)
        return context


class LoginView(auth_views.LoginView):
    
    def form_valid(self, form):
        next_url = self.request.POST.get('next')
        logger.debug(next_url)
        user = form.get_user()
        logger.debug(user)
        auth_login(self.request, user)
        
        if user_has_device(user):
            self.request.session["mfa_user_id"] = str(user.id)
            if next_url:
                url = reverse("provider:mfa") + f"?next={next_url}"
                return redirect(url)
            else:
                return redirect("provider:mfa")
        else:
            return redirect("provider:setup_mfa")
        
class MFASetupView(LoginRequiredMixin, generic.FormView):
    form_class = TOTPDeviceForm
    template_name = 'provider/totp.html'
    login_url = "login"

    def dispatch(self, request, *args, **kwargs):
        #if user already setup, get outta here.
        if self.request.user.totpdevice_set.filter(confirmed=True).exists():
            return HttpResponseRedirect(self.get_success_url())
        return super().dispatch(request, *args, **kwargs)
    
    def get_success_url(self):
        return reverse("provider:welcome")

    def _new_device(self):
        self.request.user.totpdevice_set.filter(confirmed=False).delete()
        self.device = TOTPDevice.objects.create(user=self.request.user, confirmed=False)

    def get(self, request, *args, **kwargs):
        # need this to gen qr code
        self._new_device()
        return super().get(request, *args, **kwargs)

    def gen_qr_code(self):
        site_name = get_current_site(self.request).name
        label = f"{site_name}: {self.request.user.get_username()}"
        params = {
            "secret": b32encode(self.device.bin_key).decode('utf-8'),
            "algorithm": "SHA1",
            "digits": self.device.digits,
            "period": self.device.step,
            "issuer": site_name,
        }
        otp_url = f"otpauth://totp/{quote(label)}?{urlencode(params)}"
        
        img = qrcode.make(otp_url, image_factory=SvgPathImage)
        io=BytesIO()
        img.save(io)
        svg_data =  io.getvalue()
        return f"data:image/svg+xml;base64,{force_str(b64encode(svg_data))}"
    
    def get_context_data(self, **kwargs):
        context = super(MFASetupView, self).get_context_data(**kwargs)
        context["qr_code_url"] = self.gen_qr_code()
        context['secret'] = b32encode(self.device.bin_key).decode("utf-8")
        return context

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["user"] = self.request.user
        return kwargs
    """
    def post(self, request, *args, **kwargs):
        logger.debug(self.request.POST)
        form = TOTPDeviceForm(self.request.POST)
        if form.is_valid():
            return self.form_valid(form)
        else:
            return self.form_invalid(form)
    """
    def form_valid(self, form):
        # Confirm the device.
        form.save()
        return super().form_valid(form)

    def form_invalid(self, form):
        # If the confirmation code was wrong, generate a new device.
        self._new_device()
        return super().form_invalid(form)
    
class RegistrationView(generic.FormView):
    template_name = 'provider/register.html'
    form_class = SignUpForm

    def get_success_url(self):
        return reverse("provider:welcome")
    
    def form_valid(self, form):
        user = form.save()

        messages.success(self.request, 'Registration successful. You can now login.')
        return super(RegistrationView, self).form_valid(form)

class MFARequiredView(AccessMixin, generic.FormView):
    template_name = 'provider/mfarequired.html'
    form_class=TOTPTokenForm

    def get_success_url(self):
        return reverse("provider:welcome")
    
    def dispatch(self, request, *args, **kwargs):
        if "mfa_user_id" not in request.session:
            return redirect("login")
        return super().dispatch(request, *args, **kwargs)
    
    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        user_id = self.request.session["mfa_user_id"]
        kwargs["user"] = get_user_model().objects.get(id=user_id)
        
        return kwargs

    def form_valid(self, form):
        next_url = self.request.POST.get('next')
        if next_url:
            logger.debug(next_url)
            return redirect(next_url)
        logger.debug("redirecting...")
        return HttpResponseRedirect(self.get_success_url())

    def get_context_data(self, **kwargs):
        context = super(MFARequiredView, self).get_context_data(**kwargs)
        url = reverse("provider:mfa")
        if self.request.GET.get('next'):
            context['action'] = f"{url}?{self.request.META['QUERY_STRING']}"
            #get rid of the next= part...
            context['next'] = self.request.META['QUERY_STRING'][5:]
        user_id = self.request.session["mfa_user_id"]
        user = get_user_model().objects.get(id=user_id)
        try:
            d = devices_for_user(user)
            context['device'] = next(d)
        except:
            pass
        return context

    
class MFARemoveView(MFARequiredMixin, generic.FormView):
    template_name = 'provider/rmmfa.html'
    form_class=TOTPRemoveDeviceForm

    def get_success_url(self):
        return reverse("provider:setup_mfa")
    
    def form_valid(self, form):
        form.save()
        return super().form_valid(form)

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["user"] = self.request.user
        return kwargs
