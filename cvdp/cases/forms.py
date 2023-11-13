from django import forms
from cvdp.models import *
from django.conf import settings
from django.utils.translation import gettext, gettext_lazy as _, pgettext_lazy
from django.utils import timezone
from crispy_forms.helper import FormHelper
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User, Group
from django.contrib.auth import get_user_model
from cvdp.lib import create_case_change, create_case_action

class CreateCaseForm(forms.ModelForm):

    ''' Creates a new case '''
    case_id = forms.CharField(
	required=True,
        label=_('Case ID'),
        )


    auto_assign = forms.BooleanField(
        required=False,
        label=_('Assign to myself'),
        help_text=_('Automatically assign this case to me.')
    )
    
    def __init__(self, *args, **kwargs):
        super(CreateCaseForm, self).__init__(*args, **kwargs)
        self.fields['case_id'].widget.attrs['readonly'] = True
        
    class Meta:
        model = Case
        fields = ('case_id', 'title', 'auto_assign', 'summary', )

    def __init__(self, *args, **kwargs):
        super(CreateCaseForm, self).__init__(*args, **kwargs)
        self.fields['auto_assign'].initial = True


class EditCaseForm(forms.ModelForm):

    def __init__(self, *args, **kwargs):
        super(EditCaseForm, self).__init__(*args, **kwargs)
        self.fields['case_id'].widget.attrs['readonly'] = True
    
    class Meta:
        model = Case
        fields = ('case_id', 'title', 'summary', 'public_date', 'due_date',)
        widgets = {
            'summary' : forms.Textarea(attrs={'rows': 3})
        }

    def save(self, user=None):
        instance = Case.objects.filter(case_id=self.cleaned_data['case_id']).first()

        action = create_case_action("modified case details", user, instance, True)
        
        data = self.cleaned_data
        for field, val in data.items():
            if (val != getattr(instance, field, None)):
                create_case_change(action, field, getattr(instance, field), val);

        return super(EditCaseForm, self).save(commit=True)

        

class CaseFilterForm(forms.Form):


    STATUS_FILTER_CHOICES = (
        (Case.ACTIVE_STATUS, _('Active')),
        (Case.INACTIVE_STATUS, _('Inactive')),
        (3, _('Published')),
        (4, _('Unpublished')),
    )

    wordSearch = forms.CharField(
        max_length=100,
        label='Keyword(s)',
        widget=forms.TextInput(attrs={'placeholder':'Keyword/Tag search'}),
        required=False)
    status = forms.MultipleChoiceField(
        choices=STATUS_FILTER_CHOICES,
        required=False,
        widget=forms.CheckboxSelectMultiple(attrs={'class': 'ul_nobullet'}))

    team = forms.MultipleChoiceField(
	choices=(),
	required=False,
        widget=forms.CheckboxSelectMultiple(attrs={'class': 'ul_nobullet'})
    )

    tag = forms.CharField(
	max_length=50,
        label='Tag',
	required=False,
        widget=forms.HiddenInput())


    page = forms.CharField(max_length=5,
                           required=False)

    datestart = forms.DateField(required=False)
    dateend = forms.DateField(required=False)
    owner = forms.MultipleChoiceField(
        choices=(),
        required=False,
        widget=forms.CheckboxSelectMultiple(attrs={'class': 'ul_nobullet'}))

    def __init__(self, *args, **kwargs):
        super(CaseFilterForm, self).__init__(*args, **kwargs)
        self.fields['dateend'].initial = timezone.now


class PostForm(forms.Form):
    content = forms.CharField(
        widget=forms.Textarea(),
        label=_('Reply'),
        required=False
    )

class CVSSForm(forms.ModelForm):

    class Meta:
        model = VulCVSS
        exclude = ('user', 'last_modified', 'vector', 'severity', 'score')

