from django import forms
from cvdp.manage.models import *
from django.conf import settings
from django.utils.translation import gettext, gettext_lazy as _, pgettext_lazy
from django.utils import timezone
from crispy_forms.helper import FormHelper
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User, Group
from django.contrib.auth import get_user_model


class NewReportingForm(forms.ModelForm):

    class Meta:
        model = ReportingForm
        exclude=('created', 'created_by', )
        widgets = {'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
                   'intro': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
                   'email_message': forms.Textarea(attrs={'class': 'form-control', 'rows': 4})}

        
        

class DesignTheFormForm(forms.ModelForm):

    class Meta:
        model = FormEntry
        exclude=('created', 'created_by', 'form',)


class QuestionForm(forms.ModelForm):

    class Meta:
        model = FormQuestion
        exclude = ("order", )
        widgets = {
            'form': forms.HiddenInput()
        }

class CVEAccountForm(forms.ModelForm):

    class Meta:
        model = CVEServicesAccount
        fields = ('org_name', 'api_key', 'email', 'server_type', 'group', 'active')
