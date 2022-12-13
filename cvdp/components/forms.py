from django import forms
from cvdp.models import *
from django.conf import settings
from django.utils.translation import gettext, gettext_lazy as _, pgettext_lazy
from cvdp.components.models import *

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class AddComponentForm(forms.ModelForm):

    class Meta:
        model = Component
        fields = ("name", "component_type", "version", "supplier", "source", "comment",)
        widgets = {
            'source': forms.Textarea(attrs={'rows':3}),
            'comment': forms.Textarea(attrs={'rows':3})
        }
        

