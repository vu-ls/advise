from django.db import models
from django.contrib.auth.models import Group
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth import get_user_model
from django.utils.translation import gettext as _
from django.utils import timezone
from django.urls import reverse
from django.conf import settings
from django.contrib.postgres.search import SearchVectorField
from django.contrib.postgres.indexes import GinIndex
from cvdp.models import Vulnerability, BaseRevisionMixin
import logging


logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

User = get_user_model()


COMPONENT_TYPES = (
    ('Application', 'Application'),
    ('Container', 'Container',),
    ('Device', 'Device'),
    ('Library', 'Library'),
    ('File', 'File'),
    ('Firmware', 'Firmware'),
    ('Framework', 'Framework'),
    ('Operating System', 'Operating System'),
    ('Service', 'Service'),
    ('Other', 'Other'),
)

#Everything is a component.  A product is a component that has dependencies
# and/or a defined supplier within the system.

class ComponentManager(models.Manager):
    def search(self, query=None):
        qs = self.get_queryset()
        if query is not None:
            qs = qs.extra(where=["search_vector @@ (to_tsquery('english', %s))=true"],params=[query])
        return qs

    def search_my_components(self, qs, query=None):
        if not qs:
            qs = self.get_queryset()
        if query is not None:
            qs = qs.extra(where=["search_vector @@ (to_tsquery('english', %s))=true"],params=[query])
        return qs

class AbstractComponent(models.Model):

    name = models.CharField(
        max_length=250)

    component_type = models.CharField(
        max_length=50,
        choices=COMPONENT_TYPES,
        default='Application')

    version = models.CharField(
        max_length=100)

    supplier = models.CharField(
        max_length=250, blank=True,
        null=True)

    source = models.TextField(
        blank=True, null=True,
        help_text=_('Download Location')
    )

    homepage = models.CharField(
        max_length=500, blank=True,
        null=True)

    checksum = models.CharField(
        blank=True, null=True,
        max_length=500)

    external_ids = models.JSONField(
        blank=True, null=True,
        help_text=_('Other unique identifiers, like CPE, SWID, or PURL in a JSON dict')
    )

    comment = models.TextField(
        blank=True, null=True
    )

    def __str__(self):
        return str(self.name)

    class Meta:
        abstract=True
        verbose_name = _('Component'),
        verbose_name_plural = ('Components')
        

class Component(AbstractComponent):

    # the user that added this component
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete = models.SET_NULL,
        blank=True,
        null=True
    )
    
    created = models.DateTimeField(
        default=timezone.now)

    modified = models.DateTimeField(
        auto_now=True)
    
    search_vector = SearchVectorField(null=True)

    objects = ComponentManager()
    
    class Meta:
        ordering = ('name',)
        indexes = [ GinIndex(
            fields = ['search_vector'],
            name = 'component_gin',
        )
                   ]

    def get_absolute_url(self):
        return reverse('cvdp:components')

    def get_vendor(self):
        try:
            return self.product_info.supplier.name
        except ObjectDoesNotExist:
            return self.supplier
        except AttributeError:
            return self.supplier
        

class Product(models.Model):

    component = models.OneToOneField(
        Component,
        related_name='product_info',
        on_delete=models.CASCADE
    )

    supplier = models.ForeignKey(
        Group,
        on_delete=models.SET_NULL,
        blank=True, null=True)

    dependencies = models.ManyToManyField(
        Component,
        through='ComponentRelationship'
    )

    def __str__(self):
        return self.component.name

class ComponentRelationship(models.Model):

    component = models.ForeignKey(
        Component,
        on_delete=models.CASCADE)

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE)

    date_added = models.DateTimeField(
        auto_now_add=True)

    def __str__(self):
        return f"{self.product} contains {self.component}"



#ADD COMPONENT TAGS!!!!

VUL_STATUS_CHOICES = (
    (0, _('Not Affected')),
    (1, _('Affected')),
    (2, _('Fixed')),
    (3, _('Under Investigation')),
)

VERSION_RANGE_CHOICES = (
    (None, 'None'),
    ('<', '<'),
    ('<=', '<='),
    ('=', '='),
    ('>', '>'),
    ('>=', '>='),
)


class StatusRevision(BaseRevisionMixin, models.Model):

    component_status = models.ForeignKey(
        'ComponentStatus',
        on_delete = models.CASCADE,
        verbose_name=('Component Status'))
    
    status = models.IntegerField(
        choices=VUL_STATUS_CHOICES)

    version_name = models.CharField(
        _('Affected Version End Range'),
        blank=True,
        null=True,
        max_length=100)

    version_affected = models.CharField(
        _('Version Affected'),
        choices=VERSION_RANGE_CHOICES,
        blank=True,
        null=True,
        max_length=10)

    version_value = models.CharField(
        _('Affected Version Value or Start Range'),
	max_length=100)

    statement = models.TextField(
        blank=True,
        null=True)


    def __str__(self):
        if self.revision_number:
            return "(%d)" % self.revision_number
        else:
            return ""

    def inherit_predecessor(self, component_status):
        """                                                                     
        Inherit certain properties from predecessor because it's very           
        convenient. Remember to always call this method before                  
        setting properties :)"""

        predecessor = component_status.current_revision
        self.component_status = predecessor.component_status
        self.status = predecessor.status
        self.statement = predecessor.statement
        self.deleted = predecessor.deleted
        self.locked = predecessor.locked
        self.version_affected = predecessor.version_affected
        self.version_value = predecessor.version_value
        self.version_name = predecessor.version_name


    class Meta:
        get_latest_by = 'revision_number'
        ordering = ('created',)
        unique_together = ('component_status', 'revision_number')

        
class ComponentStatus(models.Model):

    current_revision = models.OneToOneField(
        'StatusRevision',
        help_text=_('The current status revision'),
        on_delete=models.CASCADE,
        blank=True, null=True,
        related_name='current_set'
    )

    component = models.ForeignKey(
        Component,
        on_delete = models.CASCADE)

    vul = models.ForeignKey(
        Vulnerability,
        on_delete = models.CASCADE)

    def add_revision(self, new_revision, save=True):
        """
        Sets the properties of a revision and ensures its the current
        revision.
        """
        assert self.id or save, (
            'You cannot add a revision without using save=True')
        if not self.id:
            self.save()
        revisions = self.statusrevision_set.all()
        try:
            new_revision.revision_number = revisions.latest().revision_number + 1
        except StatusRevision.DoesNotExist:
            new_revision.revision_number = 0
        new_revision.component_status = self
        new_revision.previous_revision = self.current_revision
        if save:
            new_revision.save()
        self.current_revision = new_revision
        if save:
            self.save()
            
    def __str__(self):
        if self.current_revision:
            return f"{self.component.name} {self.current_revision.get_status_display()}"
        obj_name = _('Status Unknown')
        return str(obj_name)
