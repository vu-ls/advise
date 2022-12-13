from django import forms
from cvdp.models import *
from django.conf import settings
from django.utils.translation import gettext, gettext_lazy as _, pgettext_lazy
from django.utils import timezone
from crispy_forms.helper import FormHelper
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User, Group
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class GenReportingForm(forms.Form):

    def __init__(self, *args, **kwargs):
        logger.debug("IN REPORTING FORM!!!")
        extra = kwargs.pop('extra')
        super(GenReportingForm, self).__init__(*args, **kwargs)

        for i, values in enumerate(extra):
            label, klass, widget, field_args = values
            logger.debug(label)
            logger.debug(klass)
            logger.debug(widget)
            if widget:
                field_args["widget"] = widget
                         
            self.fields['question_%d' % i] = klass(label=label, **field_args)

