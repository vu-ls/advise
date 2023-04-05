import contextlib
from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth import get_user_model
from django_otp.plugins.otp_totp.models import TOTPDevice
from django.utils.translation import gettext_lazy as _
from django_otp.forms import OTPAuthenticationFormMixin
from django.core.exceptions import ValidationError

User = get_user_model()


class ProviderAuthenticationForm(AuthenticationForm):


    def get_invalid_login_error(self):
        user = User.objects.get(username=self.cleaned_data.get('username'))

        if not user.email_confirmed:
            raise ValidationError(
                _("The email associated with this account has not been confirmed. Please confirm the email before logging in."),
                code='email_unconfirmed',
            )
        if not user.is_active:
            raise ValidationError(
                _("This account is inactive."),
                code='inactive',
            )
    
    def confirm_login_allowed(self, user):
        if not user.email_confirmed:
            raise ValidationError(
		_("The email associated with this account has not been confirmed. Please confirm the email before logging in."),
                code='email_unconfirmed',
            )
        if not user.is_active:
            raise ValidationError(
                _("This account is inactive."),
                code='inactive',
            )


class SignUpForm(UserCreationForm):
    email = forms.EmailField(
	required=True,
        label="Email address")

    screen_name = forms.RegexField(
        label=_("Screen name"),
	max_length=100,
        regex=r'^[-\w\+]+(\s[-\w\+]+)*$',
        error_messages={'invalid':_("Invalid username. Your display name may only contain 1 space and may not contain certain special characters.")},
        help_text=_('The name visible to other users. It may only contain 1 space and may not contain certain special characters. (You can modify this later)'),
        widget=forms.TextInput(
            attrs={}
	),
    )
    
    first_name = forms.CharField(
        required=False,
        max_length=150)

    last_name = forms.CharField(
        required=False,
        max_length=150)

    organization = forms.CharField(
        max_length=200,
        label="Company/Affiliation",
        required=False)

    title = forms.CharField(
        max_length=200,
        required=False,
        label="Job Title")
    
    class Meta:
        model = User
        fields = ("email", "screen_name", "password1", "password2", "first_name", "last_name", "organization", "title")

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('label_suffix', '')
        super(SignUpForm, self).__init__(*args,**kwargs)

    def save(self, commit=True):
        user = super(SignUpForm, self).save(commit=False)
        user.organization=self.cleaned_data['organization']
        user.title=self.cleaned_data['title']
        user.username = self.cleaned_data['email']
        if commit:
            user.save()
        return user

    
DEFAULT_TOKEN_WIDGET_ATTRS = {
    "autofocus": "autofocus",
    "autocomplete": "off",
    "inputmode": "numeric",
}
    
class TOTPDeviceForm(forms.Form):
    token = forms.CharField(
        max_length=200,
        widget=forms.TextInput(attrs={'autocomplete':'off'}),
        label=_("Token"),
        help_text="The current code generated in the app",
        required=True)

    device_name = forms.CharField(
        max_length=200,
        label="Device Name",
        required=False,
        help_text="A simple device name to remind you of the application you used.")


    def __init__(self, user, metadata=None, **kwargs):
        super().__init__(**kwargs)
        self.fields["token"].widget.attrs.update(DEFAULT_TOKEN_WIDGET_ATTRS)
        self.user = user
        self.metadata = metadata or {}
    
    
    def clean_token(self):
        token = self.cleaned_data.get("token")
        if len(token) < 6:
            self.add_error('temp_password', "Minimum 6 digits are required.")
            raise forms.ValidationError(" Invalid length for user code.")

        self.device = self.user.totpdevice_set.filter(confirmed=False).first()
        if not self.device.verify_token(token):
            raise forms.ValidationError(_("The entered token is not valid. Re-scan new QR code and try again."))

        return token

    def save(self):
        self.user.totpdevice_set.filter(confirmed=True).delete()
        self.device.confirmed=True
        self.device.name = self.cleaned_data.get('device_name')
        self.device.save()
        return self.device

class TOTPTokenForm(OTPAuthenticationFormMixin, forms.Form):

    otp_token = forms.CharField(
        label=_("Token"),
    )

    def __init__(self, user, **kwargs):
        super().__init__(**kwargs)
        self.fields["otp_token"].widget.attrs.update(DEFAULT_TOKEN_WIDGET_ATTRS)
        self.user = user

    def clean(self):
        self.clean_otp(self.user)
        return self.cleaned_data

class TOTPRemoveDeviceForm(forms.Form):
     # User must input a valid token so 2FA can be removed
    token = forms.CharField(
        label=_("Token"),
    )

    def __init__(self, user, **kwargs):
        super().__init__(**kwargs)
        self.user = user
        self.fields["token"].widget.attrs.update(DEFAULT_TOKEN_WIDGET_ATTRS)

    def clean_token(self):
        # Ensure that the user has provided a valid token
        token = self.cleaned_data.get("token")

        # Verify that the user has provided a valid token
        for device in self.user.totpdevice_set.filter(confirmed=True):
            if device.verify_token(token):
                return token

        raise forms.ValidationError(_("The entered token is not valid"))

    def save(self):
        with contextlib.suppress(ObjectDoesNotExist):
            # Delete any backup tokens and their related static device.
            static_device = self.user.staticdevice_set.get(name="backup")
            static_device.token_set.all().delete()
            static_device.delete()

        # Delete TOTP device.
        device = TOTPDevice.objects.get(user=self.user)
        device.delete()
