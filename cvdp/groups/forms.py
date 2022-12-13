from django import forms
from cvdp.models import *
from django.conf import settings
from django.utils.translation import gettext, gettext_lazy as _, pgettext_lazy
from django.utils import timezone
from crispy_forms.helper import FormHelper
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User, Group
from django.contrib.auth import get_user_model



class GroupForm(forms.ModelForm):

    vendor_type = forms.ChoiceField(
        widget=forms.Select(attrs={'class': 'form-control'}),
        choices=GroupProfile.VENDOR_TYPE,
        required=True,
        label=_('Type'),
    )

    def __init__(self, *args, **kwargs):
        super(GroupForm, self).__init__(*args, **kwargs)
        self.fields['vendor_type'].initial='Vendor'

    class Meta:
        model = Group
        fields = ['name', 'vendor_type']


class ContactForm(forms.ModelForm):

    def __init__(self, *args, **kwargs):
        super(ContactForm, self).__init__(*args, **kwargs)

    class Meta:
        model = Contact
        fields = ['email', 'name', 'phone']

        

