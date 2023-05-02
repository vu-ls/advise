from django import forms
from cvdp.models import *
from django.conf import settings
from django.utils.translation import gettext, gettext_lazy as _, pgettext_lazy
from django.utils import timezone
from crispy_forms.helper import FormHelper
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User, Group
from django.contrib.auth import get_user_model
import requests
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class GenReportingForm(forms.Form):

    def __init__(self, *args, **kwargs):
        logger.debug("IN REPORTING FORM!!!")
        self.captcha = settings.RECAPTCHA_PUBLIC_KEY
        extra = kwargs.pop('extra')
        
        super(GenReportingForm, self).__init__(*args, **kwargs)

        for i, values in enumerate(extra):
            label, klass, widget, field_args = values
            if widget:
                field_args["widget"] = widget
                         
            self.fields['question_%d' % i] = klass(label=label, **field_args)

    def clean(self):
        if not self.data.get('g-recaptcha-response'):
            #this form may be added by coordinator
            return self.cleaned_data

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
            if resp.get('score'):
                #v3 recaptcha
                if resp['score'] > settings.RECAPTCHA_SUCCESS_SCORE:
                    return self.cleaned_data
            else:
                return self.cleaned_data
        raise forms.ValidationError(_('Invalid ReCAPTCHA. Please try again.'))
