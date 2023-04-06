from django import forms
from django.conf import settings
from django.contrib.auth.forms import UserCreationForm
from authapp.models import User
import requests
from cvdp.settings import DEFAULT_USER_SETTINGS
from allauth.account.forms import SignupForm
from django.utils.translation import gettext, gettext_lazy as _
import logging
from re import search
import pytz 
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Fieldset, Field
from django.core.validators import RegexValidator


logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class ResetMFAForm(forms.Form):

    reason = forms.CharField(
        widget=forms.Textarea(),
        label=_('Reason for MFA reset'))
        
        
class ProfileForm(forms.Form):
    
    first_name = forms.CharField(
        max_length=200,required=True)
    
    last_name = forms.CharField(
        max_length=200,required=True)
    
    email = forms.EmailField(
        required=True,
        disabled=True,
        label="Login Username/Email")

    screen_name = forms.RegexField(
        label=_("Screen name"),
        max_length=254,
        help_text=_('The name displayed to other users within the system. It may only contain 1 space and may not contain certain special characters.'),
        regex=r'^[-\w\+]+(\s[-\w\+]+)*$',
        required=True,
        error_messages={'invalid':_("Invalid username. Your display name may only contain 1 space and may not contain certain special characters.")})
    
    org = forms.CharField(
        max_length=200,
        label="Company/Affiliation",
        help_text=('This field is visible to other users'),
        required=False)
    
    title = forms.CharField(
        max_length=200,
        label="Job Title",
        help_text=_('This field is visible to other users'),
        required=False)

    timezone = forms.ChoiceField(
        label="Timezone",
        choices=[(x, x) for x in pytz.common_timezones])

    def __init__(self, *args, **kwargs):
        super(ProfileForm, self).__init__(*args,**kwargs)
    
        
class AdviseSignUpForm(SignupForm):
    """
    email = forms.CharField(
        max_length=254,
        required=True,
        help_text=_('This will be your personal login username.'),
        label="Email address")
"""

    screen_name = forms.RegexField(
        label=_("Screen name"),
        max_length=100,
        regex=r'^[-\w\+]+(\s[-\w\+]+)*$',
        error_messages={'invalid':_("Invalid username. Your display name may only contain 1 space and may not contain certain special characters.")},
        help_text=_('The name visible to other users. It may only contain 1 space and may not contain certain special characters. (You can modify this later)'),
        widget=forms.TextInput(
            attrs={"placeholder": _("Username"), "autocomplete": "username"}
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

    password1 = forms.CharField(
        max_length=50,
        required=True,
        widget=forms.PasswordInput(attrs={'autocomplete':"new-password"}),
        label="New Password",
        help_text=_('Password Requirements:<ul>\
        <li>Minimum length is 8 characters</li>\
        <li>Maximum length is 50 characters</li>\
        <li>Requires at least 1 number</li>\
        <li>Requires at least 1 special character ("+" and "=" don\'t count)</li>\
        <li>Requires uppercase letters</li>\
        <li>Requires lowercase letters</li>\
        </ul>'))

    password2 = forms.CharField(
        max_length=50,
        required=True,
        widget=forms.PasswordInput(attrs={'autocomplete':"new-password"}),
        label="Password confirmation",
        help_text=_('Enter the same password as before, for verification')
    )
    
    agree_to_terms = forms.BooleanField(
        required=True,
        label="I agree to the terms of service")

    
    class Meta:
        model = User
        fields = ("email", "password1", "password2", "screen_name", "first_name", "last_name", "organization", "title", "agree_to_terms")
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('label_suffix', '')
        super(AdviseSignUpForm, self).__init__(*args,**kwargs)


    def __init__(self, *args, **kwargs):
        super(AdviseSignUpForm, self).__init__(*args, **kwargs)
        self.captcha = settings.RECAPTCHA_PUBLIC_KEY
        

    def clean(self):
        #check captcha
        logger.debug(self.data)
        recaptcha_response = self.data.get('g-recaptcha-response')
        data = {
            "secret": settings.RECAPTCHA_PRIVATE_KEY,
            "response": recaptcha_response,
        }
        req_object = requests.post(url = "https://www.google.com/recaptcha/api/siteverify",
                             data=data,
                             headers={
                                 "Content-type": "application/x-www-form-urlencoded",
                                 "User-agent": "reCAPTCHA Django",
                             })
        resp = req_object.json()
        if resp['success']:
            if resp['score'] > settings.RECAPTCHA_SUCCESS_SCORE:
                return self.cleaned_data
        raise forms.ValidationError(_('Invalid ReCAPTCHA. Please try again.'))
        
        
    def save(self, request):
        organization = self.cleaned_data.pop('organization')
        title = self.cleaned_data.pop('title')

        user = super(AdviseSignUpForm, self).save(request)
        user.refresh_from_db()

        user.screen_name = self.cleaned_data['screen_name']

        user.org = organization
        user.title = title

        if not(settings.REQUIRE_ACCOUNT_APPROVAL):
            user.pending=False

        user.save()
        return user

class UploadProfilePhotoForm(forms.Form):
    logo = forms.FileField(
        required=False,
        label=_('Upload logo'),
        widget=forms.FileInput()
    )

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop("user")
        super(UploadProfilePhotoForm, self).__init__(*args, **kwargs)

    def save(self, file=None, commit=True):
        if file:
            self.user.userprofile.photo = file
            self.user.userprofile.save()
        else:
            self.user.userprofile.photo = None
            self.user.userprofile.save()
            

class PreferencesForm(forms.Form):
    email_preference = forms.ChoiceField(
        choices=[(1, 'HTML'), (2, 'Plain Text')],
        label='Which email format do you prefer?',
        widget=forms.RadioSelect(attrs={'class':'ul_nobullet horizontal_bullet'}),
        required=False)

    email_daily = forms.ChoiceField(
        choices=[(1, 'Immediately'), (2, 'Once Daily')],
        label='How do you prefer to receive your case notifications?',
        help_text=_("You will still be notified immediately of any direct messages or if you're tagged in a post."),
        widget=forms.RadioSelect(attrs={'class':'ul_nobullet horizontal_bullet'}),
        required=False
    )

    def __init__(self, *args, **kwargs):
        super(PreferencesForm, self).__init__(*args, **kwargs)
        #if setting is not set for this user, set to default
        for x,y in DEFAULT_USER_SETTINGS.items():
            if self.initial.get(x) is None:
                if x in self.fields:
                    self.fields[x].initial=y
