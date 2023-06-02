from cvdp.components.models import *
from cvdp.serializers import ChoiceField
from rest_framework import serializers
from django.contrib.auth.models import Group
from django.urls import reverse
from authapp.models import User
from cvdp.cases.serializers import VulSerializer
from cvdp.groups.serializers import GroupSerializer
import difflib
from cvdp.serializers import UserSerializer
from django.db.models import F, Count
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class ParentProductSerializer(serializers.HyperlinkedModelSerializer):

    id = serializers.ReadOnlyField(source='product.component.id')
    name = serializers.ReadOnlyField(source='product.component.name')

    class Meta:
        model = ComponentRelationship
        fields = ('id', 'name', 'date_added')

class ComponentRelationshipSerializer(serializers.HyperlinkedModelSerializer):

    id = serializers.ReadOnlyField(source='component.id')
    name = serializers.ReadOnlyField(source='component.name')

    class Meta:
        model = ComponentRelationship
        fields = ('id', 'name', 'date_added')


class ComponentSerializer(serializers.ModelSerializer):

    #products are the products that this component is a dependency of
    products = ParentProductSerializer(source='componentrelationship_set', many=True, required=False)
    dependencies = serializers.SerializerMethodField()
    owner = serializers.SerializerMethodField()
    
    class Meta:
        model = Component
        fields = ('id', 'name', 'owner', 'component_type', 'version', 'supplier', 'source', 'homepage', 'checksum', 'external_ids', 'comment', 'products', 'dependencies', )

    def get_dependencies(self, obj):
        p = Product.objects.filter(component=obj).first()
        if p:
            return list(p.dependencies.values_list('name', flat=True))
        return []

    def get_owner(self, obj):
        p = Product.objects.filter(component__id=obj.id).exclude(supplier__isnull=True).first()
        if p:
            g  = GroupSerializer(p.supplier)
            return g.data
        return ""
        
class ProductSerializer(serializers.ModelSerializer):

    component = ComponentSerializer()
    dependencies = ComponentRelationshipSerializer(source='componentrelationship_set', many=True)
    #supplier =
    
    class Meta:
        model = Product
        fields = ('component', 'dependencies', )


class StatusRevisionSerializer(serializers.ModelSerializer):
    status = ChoiceField(VUL_STATUS_CHOICES)
    version = serializers.CharField(source='version_value')
    version_end_range = serializers.CharField(source='version_name', required=False, allow_blank=True)
    version_affected = serializers.ChoiceField(VERSION_RANGE_CHOICES, required=False, allow_blank=True)
    statement = serializers.CharField(required=False, allow_blank=True)
    justification = serializers.ChoiceField(JUSTIFICATION_CHOICES, required=False, allow_blank=True)
    user = serializers.SerializerMethodField()
    diff = serializers.SerializerMethodField()
    
    class Meta:
        model = StatusRevision
        fields = ('status', 'version', 'version_affected', 'version_end_range', 'statement', 'justification', 'revision_number', 'user', 'created', 'modified', 'diff',)
    
    def get_user(self, obj):
        if obj.user:
            return obj.user.screen_name
        else:
            return "Unknown"
    
    def get_diff(self, obj):
        all_diffs = {}
        other_revision = obj.previous_revision
        baseText = other_revision.statement if other_revision is not None else ""
        newText = obj.statement

        differ = difflib.Differ(charjunk=difflib.IS_CHARACTER_JUNK)
        d = differ.compare(
            baseText.splitlines(keepends=True), newText.splitlines(keepends=True)
        )
        if len(list(d))>0:
            all_diffs['stmt_diff'] = d
        if other_revision:
            if other_revision.status != obj.status:
                all_diffs['status'] = f"Status changed from {other_revision.get_status_display()} to {obj.get_status_display()}"
            if (other_revision.version_name != obj.version_name) or (other_revision.version_affected != obj.version_affected) or (other_revision.version_value != obj.version_value):
                all_diffs['version'] = f"Version changed from {other_revision.version_value} {other_revision.version_affected} {other_revision.version_end_range} to {obj.version_value} {obj.version_affected} {obj.version_end_range}"
            if (other_revision.justification != obj.justification):
                all_diffs['justification'] = f"Justification changed from {other_revision.justification} to {obj.justification}"
            
        return all_diffs
        
class StatusSerializer(serializers.ModelSerializer):
    status = ChoiceField(VUL_STATUS_CHOICES)
    version = serializers.CharField(source='version_value')
    version_end_range = serializers.CharField(source='version_name', required=False, allow_blank=True)
    version_affected = serializers.ChoiceField(VERSION_RANGE_CHOICES, required=False, allow_blank=True)
    statement = serializers.CharField(required=False, allow_blank=True)
    justification = serializers.ChoiceField(JUSTIFICATION_CHOICES, required=False, allow_blank=True)
    
    class Meta:
        model = StatusRevision
        fields = ('status', 'version', 'version_affected', 'version_end_range', 'statement', 'justification')

class VulStatusSerializer(serializers.ModelSerializer):

    status = ChoiceField(source='current_revision.status', choices=VUL_STATUS_CHOICES)
    version = serializers.CharField(source='current_revision.version_value')
    version_end_range = serializers.CharField(source='current_revision.version_name')
    version_range = ChoiceField(VERSION_RANGE_CHOICES, source='current_revision.version_affected')
    statement = serializers.CharField(source='current_revision.statement')
    vul = VulSerializer()
    revisions = serializers.SerializerMethodField()
    revision_number = serializers.CharField(source='current_revision.revision_number')
    user = serializers.SerializerMethodField()
    created = serializers.DateTimeField(source='current_revision.created')
    modified = serializers.DateTimeField(source='current_revision.modified')
    justification = ChoiceField(source='current_revision.justification', choices=JUSTIFICATION_CHOICES)
    
    class Meta:
        model = ComponentStatus
        fields = ('id', 'status', 'version', 'version_end_range', 'version_range', 'user', 'statement', 'vul', 'revisions', 'revision_number', 'created', 'modified', 'share', 'justification', )

    def get_revisions(self, obj):
        return obj.statusrevision_set.count() - 1

    def get_user(self, obj):
        if obj.current_revision.user:
            return obj.current_revision.user.screen_name
        else:
            return "Unknown"

        
class StatusSummarySerializer(serializers.ModelSerializer):
    summary = serializers.SerializerMethodField()
    component = ComponentSerializer()
    affected_vuls = serializers.SerializerMethodField()
    unaffected_vuls = serializers.SerializerMethodField()
    fixed_vuls = serializers.SerializerMethodField()
    investigating_vuls = serializers.SerializerMethodField()

    class Meta:
        model = ComponentStatus
        fields = ('id', 'summary', 'component', 'affected_vuls', 'unaffected_vuls', 'fixed_vuls', 'investigating_vuls')

    def get_summary(self, obj):
        #this gets me the number of VEXs in each status category
        summary = []
        status_dict = dict(VUL_STATUS_CHOICES)
        s = ComponentStatus.objects.filter(vul__case=obj.vul.case, component=obj.component).annotate(status=F('current_revision__status')).values("status").annotate(count=Count("id")).order_by("status")
        for d in s:
            summary.append({'status':status_dict[int(d['status'])], 'count': d['count']})
        return summary

    def get_affected_vuls(self, obj):
        #this gets me affected status(es)
        affected = ComponentStatus.objects.filter(vul__case=obj.vul.case, component=obj.component, current_revision__status=1)
        serializer = VulStatusSerializer(affected, many=True)
        return serializer.data

    def get_unaffected_vuls(self, obj):
        unaffected= ComponentStatus.objects.filter(vul__case=obj.vul.case, component=obj.component, current_revision__status=0)
        serializer = VulStatusSerializer(unaffected, many=True)
        return serializer.data

    def get_fixed_vuls(self, obj):
        fixed = ComponentStatus.objects.filter(vul__case=obj.vul.case, component=obj.component, current_revision__status=2)
        serializer = VulStatusSerializer(fixed, many=True)
        return serializer.data

    def get_investigating_vuls(self, obj):
        investigating = ComponentStatus.objects.filter(vul__case=obj.vul.case, component=obj.component, current_revision__status=3)
        serializer = VulStatusSerializer(investigating, many=True)
        return serializer.data
    
        
class ComponentStatusSerializer(serializers.ModelSerializer):

    status = ChoiceField(source='current_revision.status', choices=VUL_STATUS_CHOICES)
    version = serializers.CharField(source='current_revision.version_value')
    version_end_range = serializers.CharField(source='current_revision.version_name')
    version_range = ChoiceField(VERSION_RANGE_CHOICES, source='current_revision.version_affected')
    statement = serializers.CharField(source='current_revision.statement')
    component = ComponentSerializer()
    vul = VulSerializer()
    revisions = serializers.SerializerMethodField()
    revision_number = serializers.CharField(source='current_revision.revision_number')
    user = serializers.SerializerMethodField()
    created = serializers.DateTimeField(source='current_revision.created')
    modified = serializers.DateTimeField(source='current_revision.modified')
    
    class Meta:
        model = ComponentStatus
        fields = ('status', 'version', 'version_end_range', 'version_range', 'user', 'statement', 'component', 'vul', 'revisions', 'revision_number', 'created', 'modified', )

        
    def get_revisions(self, obj):
        return obj.statusrevision_set.count() - 1

    def get_user(self, obj):
        if obj.current_revision.user:
            return obj.current_revision.user.screen_name
        else:
            return "Unknown"


class StatusActionSerializer(serializers.ModelSerializer):
    user = UserSerializer(source='component_status.current_revision.user')
    url = serializers.SerializerMethodField()
    change = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()

    class Meta:
        model = StatusRevision
        fields = ['user', 'title', 'created', 'url', 'change',]

    def get_url(self, obj):
        return reverse("cvdp:case", args=[obj.component_status.vul.case.case_id])

    def get_change(self, obj):
        return []

    def get_title(self, obj):
        if (obj.revision_number > 0):
            return f"modified status to {obj.get_status_display()} for vul {obj.component_status.vul} and component {obj.component_status.component.name} {obj.version_value}"
        else:
            return f"added {obj.get_status_display()} status for vul {obj.component_status.vul} and component {obj.component_status.component.name} {obj.version_value}"



class ComponentChangeSerializer(serializers.ModelSerializer):

    class Meta:
        model = ComponentChange
        fields = ['field', 'old_value', 'new_value']

        
class ComponentActionSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    #url = serializers.SerializerMethodField()
    change = serializers.SerializerMethodField()

    class Meta:
        model = ComponentAction
        fields = ['user', 'title', 'created','change',]

    def get_change(self, obj):
        changes = obj.componentchange_set.all()
        data = ComponentChangeSerializer(changes, many=True)
        return data.data
