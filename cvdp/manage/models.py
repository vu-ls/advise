from django.db import models
from django.contrib.auth.models import Group
from django.contrib.auth import get_user_model
from django.utils.translation import gettext as _
from django.utils import timezone
from django.urls import reverse
from django.conf import settings
from django.forms import SelectDateWidget
import logging
from cvdp.forms import GenReportingForm
from authapp.models import APIToken

from django import forms

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

User = get_user_model()

FIELD_NAMES = (
    (0, _("Single Line Text")),
    (1, _("Multi Line Text")),
    (2, _("Number")),
    (3, _("Checkbox Multiple")),
    (4, _("Checkbox")),
    (5, _("Select")),
    (6, _("Email")),
    (7, _("Date")),
    (8, _("Radio Buttons")),
    (9, _("File Input"))
)


FIELD_TYPES = (
    (0, forms.CharField),
    (1, forms.CharField),
    (2, forms.IntegerField),
    (3, forms.MultipleChoiceField),
    (4, forms.BooleanField),
    (5, forms.ChoiceField),
    (6, forms.EmailField),
    (7, forms.DateField),
    (8, forms.ChoiceField),
    (9, forms.FileField)
)

FIELD_WIDGETS = {
    1: forms.Textarea,
    3: forms.CheckboxSelectMultiple,
    7: SelectDateWidget,
    8: forms.RadioSelect
}
    

class AbstractReportingForm(models.Model):

    title = models.CharField(
        max_length=150)
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text=_('Description of report')
    )

    intro = models.TextField(
        _("Form Intro"),
        blank=True,
        help_text=_("Provide users with info about what they can expect when filling out this form.")
    )
    
    send_ack_email = models.BooleanField(
        default=True,
        help_text=_('If checked, send an acknowledgement email')
    )

    email_from = models.EmailField(
        _("Email from address"),
        blank=True,
        help_text=_("The address the email will be sent from")
    )
    
    email_subject = models.CharField(
        _("Email Subject"),
        max_length=200,
        blank=True)

    email_answers = models.BooleanField(
        _("Include Responses in Email"),
        default=True,
        help_text=_("If checked, include report answers in the ack email")
    )
    
    email_message = models.TextField(
        _("Email Message Content"),
        blank=True)
    
    login_required=models.BooleanField(
        default=False,
        help_text=_('If checked, only logged in users can view/submit form.')
    )

    def __str__(self):
        return str(self.title)

    def get_form(self, *args, **kwargs):

        fields = []
        
        for question in self.fields.all().order_by('order'):
            klass = question._get_formfield_class()
            label = question.question
            widget = FIELD_WIDGETS.get(question.question_type)
            field_args = question._get_field_args()
            fields.append((label, klass, widget, field_args))

        return GenReportingForm(*args, extra=fields, **kwargs)

    
    def get_pretty_answers(self, data):
        answers = []
        fields = self.fields.all().order_by('order')
        for i, (k, v) in enumerate(data.items()):
            if fields[i].question_type in [3, 5, 8]:
                #get the values corresponding to the choices
                c = fields[i]._get_field_args()
                choices = dict(c['choices'])
                logger.debug(choices)
                selected = []
                for y in v:
                    selected.append(choices.get(int(y)))
                answers.append({'question': fields[i].question, 'answer':selected, 'priv':fields[i].private})
            elif fields[i].question_type == 9:
                answers.append({'question': fields[i].question, 'answer': v.name, 'priv': fields[i].private})
            else:
                answers.append({'question': fields[i].question, 'answer':v, 'priv': fields[i].private})
        return answers

    def get_current_form_and_initial(self, data, *args, **kwargs):
        fields = []
        for q in self.fields.all().order_by('order'):
            x = [elem for elem in data if elem['question'] == q.question]
            klass = q._get_formfield_class()
            label = q.question
            widget = FIELD_WIDGETS.get(q.question_type)
            field_args = q._get_field_args()
            if x:
                if field_args.get('choices'):
                    ans = []
                    choices = list(field_args['choices'])
                    for t, v in choices:
                        if v in x[0]['answer']:
                            ans.append(t)
                    #restart generator
                    field_args = q._get_field_args()
                    field_args['initial'] = ans
                else:
                    field_args['initial'] = x[0]['answer']
            fields.append((label, klass, widget, field_args))

        return GenReportingForm(*args, extra=fields, **kwargs)


    def get_form_and_initial(self, data, *args, **kwargs):
        fields = []
        initial = {}
        for q in self.fields.all().order_by('order'):
            x = [elem for elem in data if elem['question'] == q.question]
            if x:
                klass = q._get_formfield_class()
                label = q.question
                widget = FIELD_WIDGETS.get(q.question_type)
                field_args = q._get_field_args()
                if field_args.get('choices'):
                    ans = []
                    choices = list(field_args['choices'])
                    for t, v in choices:
                        if v in x[0]['answer']:
                            ans.append(t)
                    #restart generator
                    field_args = q._get_field_args()
                    field_args['initial'] = ans

                else:
                    field_args['initial'] = x[0]['answer']
                fields.append((label, klass, widget, field_args))

        return GenReportingForm(*args, extra=fields, **kwargs)
    
    def num_questions(self):
        return self.fields.count()

    
    class Meta:
        verbose_name = _("Reporting Form")
        verbose_name_plural = _("Reporting Forms")
        abstract = True

class ReportingForm(AbstractReportingForm):

    created = models.DateTimeField(
        auto_now_add=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True, null=True)
    

class AbstractFormEntry(models.Model):
    
    created = models.DateTimeField(
        auto_now_add=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True, null=True)

    class Meta:
        verbose_name = _("Form entry")
        verbose_name_plural = _("Form entries")
        abstract = True

class FormEntry(AbstractFormEntry):
    form = models.ForeignKey(
        ReportingForm,
        related_name="entries",
        on_delete=models.CASCADE)

    
class AbstractFormQuestion(models.Model):

    question_type = models.IntegerField(
        choices=FIELD_NAMES)

    question = models.TextField(
    )

    question_choices = models.TextField(
        _("Choices"),
        help_text=("Line separated options where applicable"),
        blank=True,
        null=True
    )

    required = models.BooleanField(
        _("Required"),
        default=True)


    private = models.BooleanField(
        _("Keep answers private"),
        default=False)
    
    class Meta:
        verbose_name = _("Question")
        verbose_name_plural = _("Questions")
        abstract = True


    def __str__(self):
        return str(self.question)
    
    def _get_formfield_class(self):
        for index, field_class in FIELD_TYPES:
            if self.question_type is index:
                return field_class

    def _get_field_args(self):
        args = {}
        if self.question_type in [3, 5, 8]:
            if self.question_choices:
                args['choices'] = enumerate(self.question_choices.split('\n'))

        args.update({'required': self.required})
        return args

class FormQuestion(AbstractFormQuestion):

    form = models.ForeignKey(
        ReportingForm,
        related_name="fields",
        on_delete=models.CASCADE)


    order = models.IntegerField(
        _("Order of question"),
        null=True,
        blank=True)

    
    class Meta(AbstractFormQuestion.Meta):
        ordering = ("order",)


    def save(self, *args, **kwargs):
        if self.order is None:
            self.order = self.form.fields.count()
        super(FormQuestion, self).save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        fields_after = self.form.fields.filter(order__gte=self.order)
        fields_after.update(order=models.F("order") - 1)
        super(FormQuestion, self).delete(*args, **kwargs)


class AbstractQuestionEntry(models.Model):

    field_id = models.IntegerField()

    added = models.DateTimeField(
        auto_now_add=True)

    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
	on_delete=models.SET_NULL,
	blank=True, null=True)

    class Meta:
        verbose_name = _("Form question entry")
        verbose_name_plural = _("Form question entries")
        abstract = True
        
class QuestionEntry(AbstractQuestionEntry):

    entry = models.ForeignKey(
        FormQuestion,
        related_name="questions",
        on_delete=models.CASCADE)


class CVEServicesAccount(models.Model):

    SERVER_TYPES = getattr(settings, 'CVE_SERVICES_API_OPTIONS', (
        ('prod', "Production"),
        ('test', "Test"),
        ('dev', "Development"),
    ))
         
    org_name = models.CharField(
        _('Organization'),
	max_length=200,
        help_text=_('Organization registered with CVE Services (CNA Short Name)'),
    )

    api_key = models.CharField(
        _('API Key'),
    	max_length=100,
        help_text=_('API Key'),
    )

    email = models.EmailField(
        _('Email'),
        help_text=_('Email associated with the account'),
    )

    active = models.BooleanField(
        default=True)


    server_type = models.CharField(
        max_length=10,
        choices=SERVER_TYPES,
        default='prod'
    )

    group = models.ForeignKey(
        Group,
        on_delete=models.SET_NULL,
        help_text=_('Group that can use to make CVE reservations. Otherwise user only.'),
        blank=True,
        null=True
    )

    user_added = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True)

    date_added = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.get_server_type_display()} {self.org_name}: {self.email}"


class AdVISEConnection(models.Model):

    group = models.ForeignKey(
        Group,
        on_delete = models.CASCADE,
        help_text=_('The owner of the external AdVISE instance.'),
    )

    url = models.URLField(
        help_text=_('The URL or domain name of the external AdVISE instance'),
	blank=True,
        null=True)

    external_key = models.CharField(
        _("API Key for external instance"),
        max_length=250,
        blank=True,
        null=True)

    incoming_key = models.ForeignKey(
        APIToken,
        blank=True,
        null=True,
        on_delete = models.CASCADE)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True)
    
    created = models.DateTimeField(
        _("Created"),
        auto_now_add=True)

    last_used = models.DateTimeField(
        blank=True,
        null=True)

    disabled = models.BooleanField(
        default=False)
    

class AdviseTask(models.Model):

    created = models.DateTimeField(
        default=timezone.now)


    task_type = models.IntegerField(
        default=0)


    task_info = models.JSONField(
        help_text=_('Information needed to perform task')
    )

    completed = models.DateTimeField(
        blank=True,
        null=True)

    running = models.BooleanField(
        help_text=_('Needed for longer tasks so multiple workers do not pick it up'),
        default=False)
    
class AdviseScheduledTask(models.Model):

    task = models.CharField(
        _('Task name'),
        max_length=200,
    )

    enabled = models.BooleanField(
        default=True
    )

    running = models.BooleanField(
        help_text=_('Needed for longer tasks so multiple workers do not pick it up'),
        default=False)
    
    period = models.FloatField(
        _('Periodicity of job in seconds')
    )

    last_run = models.DateTimeField(
        blank=True,
        null=True)

    next_run = models.DateTimeField(
        blank=True,
        null=True)

    run_at_time = models.TimeField(
        help_text=_('Optional time at which this job runs'),
        blank=True,
        null=True
    )

    task_info = models.JSONField(
        blank=True,
        null=True,
        help_text=_('Optional Additional information needed to perform task')
    )

    def __str__(self):
        return self.task


class DefinedTag(models.Model):

    TAG_CATEGORY = (
	(1, _('Vulnerability')),
        (2, _('Case')),
        (3, _('Group')),
        (4, _('Component'))
    )

    category = models.IntegerField(
	_('Tag Category'),
        choices=TAG_CATEGORY,
        default=1,
    )

    created = models.DateTimeField(
        auto_now_add=True
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        blank=True,
	null=True,
        help_text=_('User that added this tag.'),
	verbose_name=_('User'),
    )

    tag = models.CharField(
        max_length=100,
    )

    description = models.CharField(
	max_length=500,
	help_text=_('Description of tag'),
        blank=True,
        null=True
    )

    def	__str__(self):
        return self.tag
    
    
        

    
    
