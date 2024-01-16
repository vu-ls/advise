from cvdp.models import *
from cvdp.components.models import ComponentStatus, Product
from django.core.exceptions import ObjectDoesNotExist
from cvdp.permissions import my_case_role, is_my_case, my_case_vendors, is_case_owner, my_components
from cvdp.serializers import ChoiceField, UserSerializer, DynamicFieldsModelSerializer
from django.db.models.functions import Concat
from cvdp.groups.serializers import GroupSerializer
from rest_framework import serializers
from django.contrib.auth.models import Group
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.db.models import Count, Q, CharField, Value
from cvdp.md_utils import markdown as md
from authapp.models import User
import difflib
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class CWESerializer(serializers.ModelSerializer):

    class Meta:
        model = CWEDescriptions
        fields = ('cwe', )


class CaseReportSerializer(serializers.Field):

    def to_representation(self, obj):
        user = self.context.get('user')
        if user and user.is_coordinator:
            return obj
        else:
            #remove private fields
            redacted_report = []
            for x in obj:
                if x.get('priv', False):
                    continue
                redacted_report.append(x)
            return redacted_report
    
    def to_internal_value(self, data):
        return data
        
class ReportSerializer(serializers.ModelSerializer):

    submitter = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    case_url = serializers.SerializerMethodField()
    transfer_reason = serializers.CharField(required=False)
    report = CaseReportSerializer()
    transfer = serializers.SerializerMethodField()
    
    class Meta:
        model = CaseReport
        fields = ('received', 'title', 'case_url', 'source', 'submitter', "report", "status", "copy", "transfer_reason", "transfer" )
        read_only_fields = ('received', 'title', 'case_url', 'submitter', 'status', 'copy', "transfer")

    """
    def get_report(self, obj):
        user = self.context.get('user')
        if user and user.is_coordinator:
            return obj.report
        else:
            #remove private fields
            redacted_report = []
            for x in obj.report:
                if x.get('priv', False):
                    continue
                redacted_report.append(x)
            return redacted_report
    """

    def get_transfer(self, obj):
        if obj.connection:
            return True
        return False
    
    def get_submitter(self, obj):
        if obj.entry:
            if obj.entry.created_by:
                return obj.entry.created_by.screen_name
        elif obj.connection:
            return obj.connection.group.name
        else:
            return "Anonymous"

    def get_status(self, obj):
        cr = Case.objects.filter(report=obj).first()
        if cr:
            return cr.get_status_display()
        return "Pending"

    def get_case_url(self, obj):
        cr = Case.objects.filter(report=obj).first()
        user = self.context.get('user')
        
        if user and cr and  cr.status == Case.ACTIVE_STATUS and is_my_case(user, cr.id):
            return reverse("cvdp:case", args=[cr.case_id])
        else:
            return ""

        
    def get_title(self, obj):
        if obj.entry:
            if obj.entry.form:
                return obj.entry.form.title
        return ""

class CoordReportSerializer(serializers.ModelSerializer):
    submitter = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    case_url = serializers.SerializerMethodField()
    transfer = serializers.SerializerMethodField()

    class Meta:
        model = CaseReport
        fields = ('received', 'title', 'case_url', 'source', 'submitter', "report", "status", "copy", "transfer", )

    def get_transfer(self, obj):
        if obj.connection:
            return True
        return False
        
    def get_submitter(self, obj):
        if obj.entry:
            if obj.entry.created_by:
                return obj.entry.created_by.screen_name
        elif obj.connection:
            return obj.connection.group.name
        else:
            return "Anonymous"

    def get_status(self, obj):
        cr = Case.objects.filter(report=obj).first()
        if cr:
            return cr.get_status_display()
        return "Pending"

    def get_case_url(self, obj):
        cr = Case.objects.filter(report=obj).first()
        user = self.context.get('user')

        if user and cr and  cr.status == Case.ACTIVE_STATUS and is_my_case(user, cr.id):
            return reverse("cvdp:case", args=[cr.case_id])
        else:
            return ""


    def get_title(self, obj):
        if obj.entry:
            if obj.entry.form:
                return obj.entry.form.title
        return ""

    
class CaseCoordinatorSerializer(serializers.ModelSerializer):

    case_identifier = serializers.CharField(source='get_caseid')
    created_by = serializers.SerializerMethodField()
    report = CoordReportSerializer()
    status = ChoiceField(Case.STATUS_CHOICES)
    owners = serializers.SerializerMethodField()
    advisory_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Case
        fields = ('case_id', 'case_identifier', 'owners', 'created_by', 'created', 'modified', 'status', 'title', 'summary', 'report', 'public_date', 'due_date', 'advisory_status', 'resolution', )
        lookup_field = "case_id"
        read_only_fields =("case_id", "case_identifier", "created_by", "created", "modified", "report", )

    def get_created_by(self, obj):
        if obj.created_by:
            return obj.created_by.screen_name
        else:
            return "Anonymous"

        
    def get_owners(self, obj):
        owners = CaseParticipant.objects.filter(case=obj, role="owner").values_list('contact__user__id', flat=True)
        users = User.objects.filter(id__in=owners)
        serializer = UserSerializer(users, many=True)
        return serializer.data

    def get_advisory_status(self, obj):
        advisory = CaseAdvisory.objects.filter(case=obj).first()
        if advisory:
            if advisory.date_published:
                return "PUBLISHED"
            elif AdvisoryRevision.objects.filter(advisory=advisory, date_shared__isnull=False).exists():
                if advisory.current_revision.date_shared:
                    return "LATEST DRAFT SHARED"
                else:
                    return "PREVIOUS DRAFT SHARED"
            else:
                return "DRAFT"
        else:
            return "NOT STARTED"


class PendingCaseSerializer(serializers.ModelSerializer):
    case_identifier = serializers.CharField(source='get_caseid')
    status = ChoiceField(Case.STATUS_CHOICES)

    class Meta:
        model = Case
        fields = ('case_id', 'case_identifier', 'created', 'modified', 'status',)
        lookup_field = "case_id"
        read_only_fields =("case_id", "case_identifier", "created", "modified",)


    
class CaseSerializer(serializers.ModelSerializer):
    case_identifier = serializers.CharField(source='get_caseid')
    report = ReportSerializer()
    status = ChoiceField(Case.STATUS_CHOICES)
    owners = serializers.SerializerMethodField()
    advisory_status = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    
    class Meta:
        model = Case
        fields = ('case_id', 'case_identifier', 'owners', 'created', 'created_by', 'modified', 'status', 'title', 'summary', 'report', 'public_date', 'due_date', 'advisory_status', )
        lookup_field = "case_id"
        read_only_fields =("case_id", "owners", "case_identifier", "created", "modified", "report", "created_by", )


    def get_owners(self, obj):
        owners = CaseParticipant.objects.filter(case=obj, role="owner").values_list('contact__user__id', flat=True)
        users = User.objects.filter(id__in=owners)
        serializer = UserSerializer(users, many=True)
        return serializer.data
        
    def get_created_by(self, obj):
        if obj.created_by:
            return obj.created_by.screen_name
        
    def get_advisory_status(self, obj):
        advisory = CaseAdvisory.objects.filter(case=obj).first()
        if advisory:
            if advisory.date_published:
                return "PUBLISHED"
            elif AdvisoryRevision.objects.filter(advisory=advisory, date_shared__isnull=False).exists():
                return "DRAFT"
            else:
                return "PENDING"
        else:
            return "NOT STARTED"

    
class UserCaseState:
    def __init__(self, user, contact, last_viewed, role, status_needed):
        self.user = user
        self.contact = str(contact)
        self.last_viewed = last_viewed
        self.role = role
        self.status_needed = status_needed
        if user.is_staff:
            self.delete_perm = True
    


class UserCaseStateSerializer(serializers.Serializer):
    user = UserSerializer()
    contact = serializers.CharField()
    last_viewed = serializers.DateTimeField()
    delete_perm = serializers.BooleanField(default=False)
    role = serializers.CharField()
    status_needed = serializers.BooleanField(default=False)


class Notification:
    def __init__(self, case, text):
        self.case = case
        self.text = text

class NotificationSerializer(serializers.Serializer):
    case = serializers.SerializerMethodField()
    url = serializers.SerializerMethodField()
    text = serializers.CharField()

    def get_case(self, obj):
        case = obj['case']
        return "%s" % case.case_id
        return ""

    def get_url(self, obj):
        case = obj['case']
        return reverse("cvdp:case", args=[case.case_id])
    
    
    
class ContentSerializerField(serializers.Field):

    def to_representation(self, obj):
        return md(obj)

    def to_internal_value(self, data):
        return data


class CaseParticipantSummarySerializer(serializers.Serializer):
    count = serializers.IntegerField()
    notified = serializers.IntegerField()
    vendors = serializers.IntegerField()

    
class CaseParticipantSerializer(DynamicFieldsModelSerializer):

    name = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    logocolor = serializers.SerializerMethodField()
    #profile = serializers.SerializerMethodField()
    participant_type = serializers.SerializerMethodField()
    added_by = serializers.CharField(source='user.screen_name', read_only=True)
    uuid = serializers.SerializerMethodField()
    roles_available = serializers.SerializerMethodField()
    users = serializers.SerializerMethodField()
    
    class Meta:
        model = CaseParticipant
        fields = ('id', 'name', 'participant_type', 'added_by', 'photo', 'logocolor', 'role', 'uuid',  'added', 'notified', 'roles_available', 'users')


    def get_name(self, obj):
        if obj.group:
            return obj.group.name
        elif obj.contact:
            if obj.contact.user:
                if obj.contact.user.screen_name:
                    return obj.contact.user.screen_name
            if obj.contact.name:
                return obj.contact.name
            else:
                return obj.contact.email
        else:
            return "?"

    def get_users(self, obj):
        if obj.group:
            #get users in group
            return list(User.objects.filter(groups__id=obj.group.id).exclude(api_account=True).values_list('screen_name', flat=True))
        else:
            return []
        
    def get_roles_available(self, obj):
        if obj.contact:
            if obj.contact.user:
                if obj.contact.user.is_coordinator:
                    return ["owner", "supplier", "reporter", "observer", "participant"]

        return ["supplier", "reporter", "observer", "participant"]

    def get_uuid(self, obj):
        if obj.group:
            return obj.group.groupprofile.uuid
        elif obj.contact:
            return obj.contact.uuid
        return ""
        
    def get_participant_type(self, obj):
        if obj.group:
            return "group"
        elif obj.contact:
            if obj.contact.user:
                return "user"
            else:
                return "contact"

    def get_photo(self, obj):
        request = self.context.get('request')
        if not request:
            return None
        if obj.group:
            if obj.group.groupprofile.logo:
                url = obj.group.groupprofile.logo.url
                return url
        elif obj.contact:
            if obj.contact.user:
                if obj.contact.user.userprofile.photo:
                    url = obj.contact.user.userprofile.photo.url
                    return url
                    #return obj.contact.user.userprofile.photo
        return None
            
    def get_logocolor(self, obj):
        if obj.group:
            return obj.group.groupprofile.icon_color
        elif obj.contact:
            return obj.contact.get_color()
        return "#827F7F"  #generic dark color

    def validate_role(self, value):
        """
        Check that this is a valid role for this participant
        """
        if self.instance:
            avail_roles = self.get_roles_available(self.instance)
            if value not in avail_roles:
                raise serializers.ValidationError("This role is not available to this participant")
        return value
    
    def update(self, participant, validated_data):
        logger.debug(validated_data)
        participant.role = validated_data.get('role')
        participant.save()
        return participant
    
class CaseThreadParticipantSerializer(serializers.ModelSerializer):

    participant = CaseParticipantSerializer()
    thread = serializers.CharField(source='thread.id')
    
    class Meta:
        model = CaseThreadParticipant
        fields = ('id', 'participant', 'thread', )
    
class CaseThreadSerializer(serializers.ModelSerializer):

    case = serializers.CharField(source='case.case_id')
    
    class Meta:
        model = CaseThread
        fields = ('id', 'case', 'created', 'subject', 'official', 'archived')


class PostReplySerializer(serializers.ModelSerializer):
    content = ContentSerializerField(source='post.current_revision.content')
    author_role = serializers.SerializerMethodField()
    group = GroupSerializer(source='post.group')
    author = serializers.SerializerMethodField()
    revisions = serializers.SerializerMethodField()
    revision_id = serializers.CharField(source='post.current_revision.id')
    created = serializers.DateTimeField(source='post.created')
    id = serializers.IntegerField(source='post.id')
    
    class Meta:
        model = PostReply
        fields = ('id', 'content', 'author_role', 'group', 'author', 'revisions', 'revision_id', 'created',)
    
    def get_revisions(self, obj):
        return obj.post.postrevision_set.count() - 1

    def get_author(self, obj):
        if obj.post.author:
            if obj.post.author.user:
                serializer = UserSerializer(obj.post.author.user)
                return serializer.data
            else:
                serializer = ContactSerializer(obj.post.author)
                return serializer.data
        else:
            #TODO: fake anonymous user                                          
            return "Unknown"


    def get_author_role(self, obj):
        if obj.post.author:
            if obj.post.author.user:
                return my_case_role(obj.post.author.user, obj.post.thread.case)
        else:
            return "Participant"


class PostTransferSerializer(serializers.Serializer):
    content = serializers.CharField()
    author = serializers.CharField()
    created = serializers.DateTimeField()


        
class PostSerializer(serializers.ModelSerializer):
    content = ContentSerializerField(source='current_revision.content') 
    author_role = serializers.SerializerMethodField()
    group = GroupSerializer()
    author = serializers.SerializerMethodField()
    revisions = serializers.SerializerMethodField()
    revision_id = serializers.CharField(source='current_revision.id')
    replies = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = ["id", "created", "author", "author_role", "pinned", "group", "content", "revisions", 'revision_id', 'replies']

    def update(self, post, validated_data):
        content = validated_data.get('current_revision')
        if content:
            content = content.get('content')
        pinned = validated_data.get('pinned', post.pinned)
        post.pinned=pinned
        post.save()
        
        if content:
            rev = PostRevision()
            rev.inherit_predecessor(post)
            rev.content = content
            rev.deleted = False
            post.add_revision(rev)
        return post
        """
    def set_content(self, obj):
        pass
        
    def get_content(self, obj):
        return mark_safe(md(obj.current_revision.content))
        """

    def get_replies(self, obj):
        pt = PostReply.objects.filter(reply__parent=obj)
        if pt:
            serializer = PostReplySerializer(pt, many=True)
            return serializer.data
        else:
            return []
    def get_revisions(self, obj):
        return obj.postrevision_set.count() - 1
    
    def get_author(self, obj):
        if obj.author:
            if obj.author.user:
                serializer = UserSerializer(obj.author.user)
                return serializer.data
            else:
                serializer = ContactSerializer(obj.author)
                return serializer.data
        else:
            #TODO: fake anonymous user 
            return "Unknown"
        
        
    def get_author_role(self, obj):
        if obj.author:
            if obj.author.user:
                return my_case_role(obj.author.user, obj.thread.case)
        else:
            return "Participant"    
    
class VulTagSerializer(serializers.ModelSerializer):

    class Meta:
        model=VulnerabilityTag
        fields = ('tag', )


class AffectedProductSerializer(serializers.ModelSerializer):

    vendor = serializers.SerializerMethodField()
    product = serializers.CharField(source='component.name')
    version = serializers.CharField(source='current_revision.version_value')
    version_affected = serializers.CharField(source='current_revision.version_affected')
    end_version_range = serializers.CharField(source='current_revision.version_name')
    
    class Meta:
        model = ComponentStatus
        fields = ('vendor', 'product', 'version', 'version_affected', 'end_version_range')

    def get_vendor(self, obj):
        product = Product.objects.filter(component=obj.component).first()
        if product:
            if product.supplier:
                return product.supplier.name
        if obj.component.supplier:
            return obj.component.supplier
        return ""



class VEXStatement(serializers.Serializer):
    vulnerability = serializers.CharField()
    products = serializers.ListField(
        child=serializers.CharField()
    )
    status = serializers.ChoiceField(choices=["affected", "unaffected", "fixed", "under_investigation"])
    
class VEXUploadSerializer(serializers.Serializer):
    author = serializers.CharField()
    role = serializers.CharField()
    timestamp = serializers.DateTimeField()
    version = serializers.IntegerField()
    statements = serializers.ListField(
        child=VEXStatement()
    )

    
class VEXSerializer(serializers.ModelSerializer):

    context = serializers.ReadOnlyField(default="https://openvex.dev/ns")
    id = serializers.SerializerMethodField()
    author = serializers.SerializerMethodField()
    role = serializers.ReadOnlyField(default="Document Creator")
    timestamp = serializers.SerializerMethodField()
    version = serializers.SerializerMethodField()
    statements = serializers.SerializerMethodField()

    class Meta:
        model = Vulnerability
        fields = ('context', 'id', 'author', 'role', 'timestamp', 'version', 'statements')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["@context"] = data.pop("context", "")
        data["@id"] = data.pop("id", "")
        return data

    def get_id(self, obj):
        return f"{settings.SERVER_NAME}{obj.case.get_absolute_url()}"

    def get_author(self, obj):
        user = self.context.get('user')
        if user:
            return user.get_full_name()
        else:
            return obj.case.get_owners

    def get_timestamp(self, obj):
        status = ComponentStatus.objects.filter(vul=obj).order_by('-current_revision__modified').first()
        return str(status.current_revision.modified)

    def get_version(self, obj):
        status = ComponentStatus.objects.filter(vul=obj).order_by('-current_revision__modified').first()
        return status.current_revision.revision_number

    def get_statements(self, obj):
        user = self.context.get('user')
        if user.is_coordinator:
            status = ComponentStatus.objects.filter(vul=obj)
        else:
            comps = my_components(user)
            status = ComponentStatus.objects.filter(vul=obj, component__in=comps)
            
        stmts = []
        #get affected
        affected = list(status.filter(current_revision__status=1).annotate(C=Concat('component__name',Value(' '), 'component__version', output_field=CharField())).values_list('C', flat=True))
        stmts.append({'vulnerability': obj.vul,
                      'products': affected,
                      "status": "affected"})
        fixed = list(status.filter(current_revision__status=2).annotate(C=Concat('component__name',Value(' '), 'component__version', output_field=CharField())).values_list('C', flat=True))
        if fixed:
            stmts.append({'vulnerability': obj.vul,
                          'products': fixed,
	                  "status": "fixed"})

        investigating = list(status.filter(current_revision__status=2).annotate(C=Concat('component__name',Value(' '), 'component__version', output_field=CharField())).values_list('C', flat=True))
        if investigating:
            stmts.append({'vulnerability': obj.vul,
                          'products': investigating,
                          "status": "under_investigation"})
        not_affected = list(status.filter(current_revision__status=0).annotate(C=Concat('component__name',Value(' '), 'component__version', output_field=CharField())).values_list('C', 'current_revision__justification'))
        if not_affected:
            #multiple justifications means multiple statements
            na = {}
            for x in not_affected:
                if x[1] in na:
                    na[x[1]].append(x[0])
                else:
                    na[x[1]] = [x[0]]
            for key, val in na.items():
                stmts.append({'vulnerability': obj.vul,
	                      'products': val,
                              "status": "not_affected",
                              "justification": key })
        
        return stmts
                     
        
class VulSerializer(serializers.ModelSerializer):

    vul = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()
    cvss_vector = serializers.SerializerMethodField()
    cvss_severity = serializers.SerializerMethodField()
    cvss_score = serializers.SerializerMethodField()
    ssvc_vector = serializers.SerializerMethodField()
    ssvc_decision = serializers.SerializerMethodField()
    ssvc_decision_tree = serializers.SerializerMethodField()
    ssvc_justifications = serializers.SerializerMethodField()
    affected_products = serializers.SerializerMethodField()
    case = serializers.CharField(source='case.caseid')
    url = serializers.SerializerMethodField()
    
    class Meta:
        model = Vulnerability
        fields = ('id', 'cve', 'description', 'vul', 'date_added', 'date_public', 'problem_types', 'references', 'tags', 'cvss_vector', 'cvss_severity', 'cvss_score', 'ssvc_vector', 'ssvc_decision', 'ssvc_decision_tree', 'ssvc_justifications', 'affected_products', 'case', 'url')

    def to_internal_value(self, data):
        if data.get('date_public') == '':
            data['date_public'] = None
        return super().to_internal_value(data)

    def get_vul(self, obj):
        return obj.vul

    def get_url(self, obj):
        return obj.get_absolute_url()
    
    def validate_cve(self, value):
        if value != None:
            if value.lower().startswith('cve-'):
                cve = value[4:]
                return cve
            else:
                return value
        return value

    
    def get_tags(self, obj):
        return list(obj.vulnerabilitytag_set.values_list('tag', flat=True))
        
    def get_cvss_vector(self, obj):
        try:
            if obj.vulcvss:
                return obj.vulcvss.vector
        except VulCVSS.DoesNotExist:
            return None

    def get_cvss_severity(self, obj):
        try:
            if obj.vulcvss:
                return obj.vulcvss.severity
        except VulCVSS.DoesNotExist:
            return None

    def get_cvss_score(self, obj):
        try:
            if obj.vulcvss:
                return obj.vulcvss.score
        except VulCVSS.DoesNotExist:
            return None

    def get_ssvc_vector(self, obj):
        try:
            if obj.vulssvc:
                return obj.vulssvc.vector
        except VulSSVC.DoesNotExist:
            return None

    def get_ssvc_decision(self, obj):
        try:
            if obj.vulssvc:
                return obj.vulssvc.final_decision
        except VulSSVC.DoesNotExist:
            return None

    def get_ssvc_decision_tree(self, obj):
        try:
            if obj.vulssvc:
                dec_tree = obj.vulssvc.decision_tree
                dec_tree.append({'label': 'date_scored', 'value': obj.vulssvc.last_edit})
                return dec_tree
        except VulSSVC.DoesNotExist:
            return None

    def get_ssvc_justifications(self, obj):
        try:
            if obj.vulssvc:
                return obj.vulssvc.justifications
        except VulSSVC.DoesNotExist:
            return None
        
    def get_affected_products(self, obj):
        #get all *Affected* status related to this vul
        user = self.context.get('user')
        if user:
            if user.is_coordinator:
                #if case owner, get all affected components
                status = ComponentStatus.objects.filter(vul=obj, current_revision__status=1)
            else:
                my_groups = my_case_vendors(user, obj.case)
                components = ComponentStatus.objects.filter(vul=obj, current_revision__status=1)
                case_components = components.values_list('component__id', flat=True)
                if my_groups and case_components:
                    products = Product.objects.filter(supplier__in=my_groups, component__in=case_components).values_list('component__id', flat=True)
                    #get all my components/or component status set to Share
                    status = components.filter(component__id__in=products)
                else:
                    status = components.filter(current_revision__user=user)
        else:
            #if user isn't present, we could possibly leak info that we shouldn't
            #status = ComponentStatus.objects.filter(vul=obj, current_revision__status=1)
            status = []
        serializer = AffectedProductSerializer(status, many=True)
        return serializer.data
    
    
class ArtifactSerializer(serializers.ModelSerializer):

    file = serializers.FileField(source='file.file')
    uuid = serializers.CharField(source='file.uuid', required=False)
    filename = serializers.CharField(source='file.filename', required=False)
    mime_type = serializers.CharField(source='file.mime_type', required=False)
    size = serializers.IntegerField(source='file.size', required=False)
    user = serializers.SerializerMethodField()
    url = serializers.SerializerMethodField()
    uploaded_date = serializers.SerializerMethodField()
    removable = serializers.SerializerMethodField()
    
    class Meta:
        model = CaseArtifact
        fields = ('file', 'filename', 'url', 'mime_type', 'size', 'user', 'uuid', 'uploaded_date', 'removable', 'shared')

    def get_url(self, obj):
        return reverse("cvdp:artifact", args=[obj.file.uuid])
        
    def get_user(self, obj):
        if obj.action:
            if obj.action.user:
                return obj.action.user.screen_name
        return ""

    def get_uploaded_date(self, obj):
        if obj.action:
            return obj.action.created
        else:
            return obj.file.uploaded_time

    def get_removable(self, obj):
        print(self.context)
        user = self.context.get('user')
        if obj.action:
            if user == obj.action.user:
                return True
        if user.is_staff:
            return True
        return False
            

class CVSSSerializer(serializers.ModelSerializer):

    scored_by = serializers.CharField(source='scored_by.screen_name', required=False)
    
    class Meta:
        model=VulCVSS
        fields = ('AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A', 'E', 'RL', 'RC', 'scored_by', 'last_modified', 'vector', 'score', 'severity')


class SSVCSerializer(serializers.ModelSerializer):

    user = serializers.CharField(source='user.screen_name', required=False)
    
    class Meta:
        model=VulSSVC
        fields = ('decision_tree', 'tree_type', 'final_decision', 'vector', 'user', 'last_edit', 'justifications')

class AdvisorySerializer(serializers.ModelSerializer):
    references = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    revision_number = serializers.IntegerField(read_only=True)
    revision_id = serializers.CharField(read_only=True)
    author = serializers.SerializerMethodField()
    user_message = serializers.SerializerMethodField()
    diff = serializers.SerializerMethodField()
    content = serializers.CharField(required=True)
    
    class Meta:
        model=AdvisoryRevision
        fields = ('title', 'content', 'references', 'revision_number', 'revision_id', 'user_message', 'author', 'created', 'diff')

    def get_author(self, obj):
        if obj.user:
            return obj.user.screen_name
        else:
            return "Unknown"

    def get_user_message(self, obj):
        if obj.user_message:
            return obj.user_message
        elif obj.automatic_log:
            return obj.automatic_log
        else:
            return "No log message"

    def get_diff(self, obj):

        other_revision = obj.previous_revision
        baseText = other_revision.content if other_revision is not None else ""
        newText = obj.content

        differ = difflib.Differ(charjunk=difflib.IS_CHARACTER_JUNK)
        diff = differ.compare(
            baseText.splitlines(keepends=True), newText.splitlines(keepends=True)
        )
        return list(diff)


class CSAFPublisherSerializer(serializers.ModelSerializer):
    category = serializers.ReadOnlyField(default='coordinator')
    contact_details = serializers.CharField(default=f"Email: {settings.CONTACT_EMAIL}")
    issuing_authority = serializers.CharField(default=f'{settings.ORG_NAME}')
    name = serializers.CharField(default=f'{settings.ORG_NAME}')
    namespace = serializers.CharField(default=f'{settings.SERVER_NAME}')

    class Meta:
        model = CaseAdvisory
        fields = ('category', 'contact_details', 'issuing_authority', 'name', 'namespace', )
        depth = 1


class CSAFDocumentRevisionHistory(serializers.ModelSerializer):
    number = serializers.CharField(source='version_number')
    date = serializers.SerializerMethodField()
    summary = serializers.SerializerMethodField()

    class Meta:
        model = AdvisoryRevision
        fields = ('number', 'summary', 'date')

    def get_date(self, obj):
        if obj.date_published:
            return obj.date_published
        else:
            return obj.date_shared

    def get_summary(self, obj):
        if obj.user_message:
            return obj.user_message
        else:
            return "Case update resulted in new information"
        
class CSAFTrackingSerializer(serializers.ModelSerializer):
    current_release_date = serializers.SerializerMethodField()
    generator = serializers.SerializerMethodField()
    id = serializers.CharField(source='advisory.case.get_caseid')
    initial_release_date = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()      #ReadOnlyField(default='final') #also could be 'draft' or 'interim'
    version = serializers.SerializerMethodField()
    revision_history = serializers.SerializerMethodField()

    class Meta:
        model = CaseAdvisory
        fields = ('current_release_date', 'generator', 'id', 'initial_release_date', 'status', 'version', 'revision_history', )
        depth = 1

    def get_initial_release_date(self, obj):
        if obj.advisory.date_published:
            return obj.advisory.date_published
        else:
            #get first shared
            revs = AdvisoryRevision.objects.filter(advisory__id=obj.advisory.id).exclude(date_shared__isnull=True).order_by('revision_number').first()
            if (revs):
                return revs.date_shared
            else:
                return None

    def get_current_release_date(self, obj):
        if obj.advisory.date_published:
            return obj.advisory.date_last_published
        else:
            # get last shared
            revs = AdvisoryRevision.objects.filter(advisory__id=obj.advisory.id).exclude(date_shared__isnull=True).order_by('-revision_number').first()
            if (revs):
                return revs.date_shared
            else:
                return None
        
        
    def get_status(self, obj):
        if obj.advisory.date_published:
            return "final"
        else:
            return "draft"
        
    def get_generator(self, obj):
        engine = {}
        engine['name'] = "AdVISE"
        engine['version'] = settings.VERSION
        return {'engine': engine}

    def get_version(self, obj):
        #get revision last published
        revs = AdvisoryRevision.objects.filter(advisory__id=obj.advisory.id).exclude(date_published__isnull=True).order_by('-revision_number')
        if (len(revs) > 0):
            return revs.first().version_number
        else:
            return '0'

    def get_revision_history(self, obj):
        if obj.advisory.date_published:
            revs = AdvisoryRevision.objects.filter(advisory__id=obj.advisory.id).exclude(date_published__isnull=True).order_by('-revision_number')
        else:
            revs = AdvisoryRevision.objects.filter(advisory__id=obj.advisory.id).exclude(date_shared__isnull=True).order_by('-revision_number')
        data =  CSAFDocumentRevisionHistory(revs, many=True)
        return data.data
    
class CSAFDocumentSerializer(serializers.ModelSerializer):
    category = serializers.ReadOnlyField(default='csaf_vex')
    csaf_version = serializers.ReadOnlyField(default='2.0')
    publisher = serializers.SerializerMethodField()
    #references = CSAFReferenceSerializer()
    title = serializers.CharField()
    tracking = serializers.SerializerMethodField()

    class Meta:
        model = CaseAdvisory
        fields = ('category', 'csaf_version', 'publisher', 'title', 'tracking', )
        depth = 1

    def get_publisher(self, obj):
        data = CSAFPublisherSerializer(obj)
        return data.data

    def get_tracking(self, obj):
        data =  CSAFTrackingSerializer(obj)
        return data.data


class CSAFProductSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    product_id = serializers.SerializerMethodField()

    class Meta:
        model = ComponentStatus
        fields = ('name', 'product_id', )

    def get_name(self, obj):
        vendor_name = self.context.get('vendor')
        return f"{vendor_name} {obj.component.name} {obj.current_revision.version_value}"

    def get_product_id(self, obj):
        return f"CSAFPID-{obj.component.id:04}"
    
class CSAFProductTreeVersionSerializer(serializers.ModelSerializer):
    category = serializers.ReadOnlyField(default='product_version')
    name= serializers.CharField(source='current_revision.version_value')
    product = serializers.SerializerMethodField()

    class Meta:
        model = ComponentStatus
        fields = ('category', 'name', 'product', )

    def get_product(self, obj):
        serializer = CSAFProductSerializer(obj, context=self.context)
        return serializer.data
    
class CSAFProductTreeNameSerializer(serializers.ModelSerializer):
    category = serializers.ReadOnlyField(default='product_name')
    name = serializers.CharField(source='component__name')
    branches = serializers.SerializerMethodField()

    class Meta:
        model = ComponentStatus
        fields = ('category', 'name', 'branches', )

    def get_branches(self, obj):
        #get actual product info
        vuls = self.context.get('vuls')
        vendor = self.context.get('vendor')
        vendor_name = self.context.get('vendor_name')
        component_name = obj.get('component__name')
        status = ComponentStatus.objects.filter(vul__in=vuls, component__product_info__supplier__id=vendor, component__name=component_name)
        products = CSAFProductTreeVersionSerializer(status, many=True, context={'vendor': vendor_name})
        return products.data

class CSAFProductTreeVendorSerializer(serializers.ModelSerializer):
    category = serializers.ReadOnlyField(default='vendor')
    name = serializers.CharField(source='component__product_info__supplier__name')
    branches = serializers.SerializerMethodField()

    class Meta:
        model = ComponentStatus
        fields = ('category', 'name', 'branches', )

    def get_branches(self, obj):
        logger.debug("in get_branches")
        logger.debug(obj.get('component__product_info__supplier__id'))
        vuls = self.context.get('vuls')
        vendor = obj.get('component__product_info__supplier__id')
        logger.debug(vendor)
        logger.debug(vuls)
        #get products for this vendor
        components = ComponentStatus.objects.filter(vul__in=vuls, component__product_info__supplier__id=vendor).values('component__name').order_by('component__name').annotate(num_components=Count("id"))
        logger.debug(components)
        
        data = CSAFProductTreeNameSerializer(components, many=True, context={'vuls': vuls, 'vendor': vendor, 'vendor_name': obj.get('component__product_info__supplier__name')})
        return data.data
        

class CSAFVulnerabilitySerializer(serializers.ModelSerializer):
    cve = serializers.SerializerMethodField()
    cwe = serializers.SerializerMethodField()
    notes = serializers.SerializerMethodField()
    title = serializers.CharField(source='description')
    product_status = serializers.SerializerMethodField()
    flags = serializers.SerializerMethodField()
    
    class Meta:
        model = Vulnerability
        fields = ('cve', 'cwe', 'notes', 'title', 'product_status', 'flags', )

    def get_fields(self):
        #pop flags field if vul doesn't have any not affected components
        fields = super().get_fields()
        if not ComponentStatus.objects.filter(vul=self.instance, current_revision__status=0).exclude(component__product_info__isnull=True).exists():
            fields.pop('flags')
        return fields

    def get_cve(self, obj):
        #this returns CVE-{obj.cve}
        return obj.vul
        
    def get_cwe(self, obj):
        #CSAF only allows 1 for some reason
        if obj.problem_types:
            for cwe in obj.problem_types:
                item = cwe.split(" ", 1)
                if len(item) > 1:
                    return {'id': item[0],
                            'name': item[1]}
                
        return {}

    def get_notes(self, obj):
        notes = []
        notes.append({'category': 'summary', 'text': obj.description})
        return notes

    def get_product_status(self, obj):
        affected = []
        fixed = []
        investigating = []
        not_affected = []
        ret = {}
        status = ComponentStatus.objects.filter(vul=obj).exclude(component__product_info__isnull=True).values_list('component__id', flat=True)
        for s in status.filter(current_revision__status = 1):
            affected.append(f"CSAFPID-{s:04}")
        for s in status.filter(current_revision__status = 2):
            fixed.append(f"CSAFPID-{s:04}")
        for s in status.filter(current_revision__status = 3):
            investigating.append(f"CSAFPID-{s:04}")
        for s in status.filter(current_revision__status = 0):
            not_affected.append(f"CSAFPID-{s:04}")
            
        if affected:
            ret['known_affected'] = affected
        if fixed:
            ret['fixed'] = fixed
        if investigating:
            ret['under_investigation'] = investigating
        if not_affected:
            ret['known_not_affected'] = not_affected

        return ret

    def get_flags(self, obj):
        #get unaffected products
        ret = {}
        status = ComponentStatus.objects.filter(vul=obj, current_revision__status=0).exclude(component__product_info__isnull=True).values_list('component__id', 'current_revision__justification')
        for x in status:
            if x[1] in ret:
                ret[x[1]].append(f"CSAFPID-{x[0]:04}")
            else:
                ret[x[1]] = [f"CSAFPID-{x[0]:04}"]
        flags = []
        if len(ret) == 0:
            self.fields.pop("flags")
            return
        
        for x,y in ret.items():
            flags.append({'label': x, 'product_ids': y})
        return flags
    
class CSAFAdvisorySerializer(serializers.ModelSerializer):
    document = serializers.SerializerMethodField()
    product_tree = serializers.SerializerMethodField()
    vulnerabilities = serializers.SerializerMethodField()
    
    class Meta:
        model = Case
        fields = ('document', 'product_tree', 'vulnerabilities', )
        depth = 1

    def get_document(self, obj):
        data = CSAFDocumentSerializer(obj.caseadvisory.current_revision)
        return data.data

    def get_product_tree(self, obj):
        vuls = Vulnerability.objects.filter(case=obj, cve__isnull=False).values_list('id', flat=True)
        logger.debug(f"vuls is {vuls}")
        status = ComponentStatus.objects.filter(vul__in=vuls).exclude(component__product_info__isnull=True).values('component__product_info__supplier__id', 'component__product_info__supplier__name').order_by('component__product_info__supplier__id').annotate(num_components=Count("id"))
        logger.debug(f"status is {status}")

        #sort by vendor
        
        data = CSAFProductTreeVendorSerializer(status, many=True, context={'vuls': vuls})
        return {'branches' : data.data}

    def get_vulnerabilities(self, obj):
        vuls = Vulnerability.objects.filter(case=obj, cve__isnull=False)
        data = []
        # can't use many here because we need to pop the "flags" field on an individual basis
        for v in vuls:
            d = CSAFVulnerabilitySerializer(v)
            data.append(d.data)
            #data = CSAFVulnerabilitySerializer(vuls, many=True)
        return data


class CaseChangeSerializer(serializers.ModelSerializer):

    class Meta:
        model = CaseChange
        fields = ['field', 'old_value', 'new_value']

    
                                             
class CaseActionSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    url = serializers.SerializerMethodField()
    change = serializers.SerializerMethodField()

    class Meta:
        model = CaseAction
        fields = ['user', 'title', 'created', 'url', 'change',]

    def get_url(self, obj):
        return reverse("cvdp:case", args=[obj.case.case_id])

    def get_change(self, obj):
        changes = obj.casechange_set.all()
        data = CaseChangeSerializer(changes, many=True)
        return data.data


class PostActionSerializer(serializers.ModelSerializer):
    #user = UserSerializer(source='post.author.user')
    user = serializers.SerializerMethodField()
    url = serializers.SerializerMethodField()
    change = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    
    class Meta:
        model = PostRevision
        fields = ['user', 'title', 'created', 'url', 'change',]

    def get_user(self, obj):
        if obj.post.author:
            user_serializer = UserSerializer(obj.post.author.user)
            return user_serializer.data
        #return obj.post.author.user
        else:
            return {"name": obj.post.author_text}
        
    def get_url(self, obj):
        return reverse("cvdp:case", args=[obj.post.thread.case.case_id])

    def get_change(self, obj):
        return []

    def get_title(self, obj):
        if (obj.revision_number > 0):
            return "modified post"
        elif PostReply.objects.filter(post=obj.post).exists():
            return "replied to post"
        else:
            return "added post"
        
class AdvisoryActionSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    url = serializers.SerializerMethodField()
    change = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()

    class Meta:
        model = PostRevision
        fields = ['user', 'title', 'created', 'url', 'change',]

    def get_url(self, obj):
        return reverse("cvdp:case", args=[obj.advisory.case.case_id])

    def get_change(self, obj):
        return []

    def get_title(self, obj):
        if (obj.revision_number > 0):
            return "modified case advisory"
        else:
            return "created case advisory"

    
class CaseTransferSerializer(serializers.ModelSerializer):

    action = CaseActionSerializer(read_only=True)
    group = serializers.CharField(source='connection.group.name', read_only=True)
    case = serializers.CharField(source='action.case.case_id')
    
    class Meta:
        model = CaseTransfer
        fields = ['id', 'connection', 'case', 'group', 'transfer_reason', 'remote_case_id', 'accepted', 'action', 'data_transferred']

        
