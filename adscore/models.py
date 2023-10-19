from django.db import models
from django.conf import settings
from django.utils.translation import gettext as _
from django.utils import timezone
from django.contrib.postgres.search import SearchVectorField
from django.contrib.postgres.indexes import GinIndex
from cvdp.models import BaseRevisionMixin

# Create your models here.

class Vul(models.Model):

    cve = models.CharField(
        _('CVE'),
        max_length=50)

    description = models.TextField(
        _('Description'))

    date_added = models.DateTimeField(
        default=timezone.now)

    last_modified = models.DateTimeField(
        blank=True,
        null=True
    )

    published = models.DateTimeField(
        blank=True,
	null=True
    )

    problem_types = models.JSONField(
        _('Problem Type'),
        blank=True,
	null=True)

    references = models.JSONField(
        _('References'),
        blank=True,
        null=True)

    status = models.CharField(
        _('VulnStatus'),
        blank=True, null=True,
        max_length=200)
    
    search_vector = SearchVectorField(null=True)

    class Meta:
        app_label = 'adscore'
        indexes = [GinIndex(
            fields=['search_vector'],
            name= 'vul_cve_gin',
        )
                   ]

class VulLock(models.Model):

    vul = models.OneToOneField(
        Vul,
        on_delete = models.CASCADE)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name=_('User Scoring'),
    )

    locked = models.DateTimeField(
        _('Record is locked for scoring'),
        auto_now = True,
    )

    def __str__(self):
        return f"{self.vul.cve} locked by {self.user.screen_name}"



class SSVCScore(models.Model):

    vul = models.OneToOneField(
        Vul,
        on_delete=models.CASCADE)

    decision_tree = models.JSONField(
        _('SSVC Decisions'))

    tree_type = models.CharField(
        max_length=100)

    final_decision = models.CharField(
        max_length=50)

    vector = models.CharField(
        max_length=100)

    justifications = models.JSONField(
        _('SSVC Decision Justifications'),
        blank=True,
        null=True)
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        verbose_name=_('User'),
    )

    last_edit = models.DateTimeField(
        _('Last Modified Date'),
        default=timezone.now)


    def __str__(self):
        return self.vector

    class Meta:
        app_label = 'adscore'

class SSVCScoreActivity(models.Model):

    score = models.ForeignKey(
        SSVCScore,
        on_delete=models.CASCADE)

    title = models.CharField(
	_('Title'),
        max_length=200,
        blank=True,
        null=True,
    )

    user = models.ForeignKey(
	settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        verbose_name=_('User'),
    )

    created = models.DateTimeField(
        _('Last Modified Date'),
        default=timezone.now)

    class Meta:
        app_label = 'adscore'
    
    def __str__(self):
        return '%s' % self.title
    
    
class ScoreChange(models.Model):

    action = models.ForeignKey(
        SSVCScoreActivity,
	on_delete = models.CASCADE
    )

    field = models.CharField(
        _('Field'),
        max_length=100,
    )

    old_value = models.TextField(
        _('Old Value'),
	blank=True,
        null=True,
    )

    new_value = models.TextField(
        _('New Value'),
	blank=True,
        null=True,
    )
