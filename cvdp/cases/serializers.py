from cvdp.models import *
from cvdp.components.models import ComponentStatus, Product
from cvdp.permissions import my_case_role, is_my_case
from cvdp.serializers import ChoiceField
from cvdp.groups.serializers import GroupSerializer
from rest_framework import serializers
from django.contrib.auth.models import Group
from django.urls import reverse
from django.utils.safestring import mark_safe
from cvdp.md_utils import markdown as md
from authapp.models import User
import difflib

class CWESerializer(serializers.ModelSerializer):

    class Meta:
        model = CWEDescriptions
        fields = ('cwe', )


class ReportSerializer(serializers.ModelSerializer):

    submitter = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    case_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CaseReport
        fields = ('received', 'title', 'case_url', 'source', 'submitter', "report", "status", )

    def get_submitter(self, obj):
        if obj.entry:
            if obj.entry.created_by:
                return obj.entry.created_by.screen_name
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
        
        if user and cr and  cr.status == Case.ACTIVE_STATUS and is_my_case(user, cr):
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
    report = ReportSerializer()
    status = ChoiceField(Case.STATUS_CHOICES)
    owners = serializers.SerializerMethodField()
    advisory_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Case
        fields = ('case_id', 'case_identifier', 'owners', 'created_by', 'created', 'modified', 'status', 'title', 'summary', 'report', 'public_date', 'due_date', 'advisory_status', )
        lookup_field = "case_id"
        read_only_fields =("case_id", "case_identifier", "created_by", "created", "modified", "report",)

    def get_created_by(self, obj):
        if obj.created_by:
            return obj.created_by.screen_name
        else:
            return "Anonymous"

    def get_owners(self, obj):
        return list(CaseParticipant.objects.filter(case=obj, role="owner").values_list('contact__user__screen_name', flat=True))


    def get_advisory_status(self, obj):
        advisory = CaseAdvisory.objects.filter(case=obj).first()
        if advisory:
            if advisory.date_published:
                return "PUBLISHED"
            elif advisory.current_revision.date_shared:
                return "DRAFT SHARED"
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
    advisory_status = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = ('case_id', 'case_identifier', 'created', 'modified', 'status', 'title', 'summary', 'report', 'public_date', 'due_date', 'advisory_status', )
        lookup_field = "case_id"
        read_only_fields =("case_id", "case_identifier", "created", "modified", "report",)


    def get_advisory_status(self, obj):
        advisory = CaseAdvisory.objects.filter(case=obj).first()
        if advisory:
            if advisory.date_published:
                return "PUBLISHED"
            elif advisory.current_revision.date_shared:
                return "DRAFT"
            else:
                return "PENDING"
        else:
            return "NOT STARTED"
    
class UserCaseState:
    def __init__(self, user, contact, last_viewed, role):
        self.user = user
        self.contact = contact
        self.last_viewed = last_viewed
        self.role = role
        if user.is_staff:
            self.delete_perm = True
    

class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='screen_name')
    logocolor = serializers.CharField(source='userprofile.logocolor')
    photo = serializers.ImageField(source='userprofile.photo')

    class Meta:
        model = User
        fields = ('id', 'name', 'org', 'photo', 'logocolor', 'title',)
        

class UserCaseStateSerializer(serializers.Serializer):
    user = UserSerializer()
    contact = serializers.IntegerField()
    last_viewed = serializers.DateTimeField()
    delete_perm = serializers.BooleanField(default=False)
    role = serializers.CharField()    
        
class ContentSerializerField(serializers.Field):

    def to_representation(self, obj):
        return md(obj)

    def to_internal_value(self, data):
        return data


class CaseParticipantSerializer(serializers.ModelSerializer):

    name = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    logocolor = serializers.SerializerMethodField()
    #profile = serializers.SerializerMethodField()
    participant_type = serializers.SerializerMethodField()
    added_by = serializers.CharField(source='user.screen_name')
    uuid = serializers.SerializerMethodField()
    roles_available = serializers.SerializerMethodField()
    
    class Meta:
        model = CaseParticipant
        fields = ('id', 'name', 'participant_type', 'added_by', 'photo', 'logocolor', 'role', 'uuid',  'added', 'notified', 'roles_available')


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

    def get_roles_available(self, obj):
        if obj.contact:
            if obj.contact.user:
                if obj.contact.user.is_coordinator:
                    return ["owner", "vendor", "reporter", "observer", "participant"]

        return ["vendor", "reporter", "observer", "participant"]

    def get_uuid(self, obj):
        if obj.group:
            return obj.group.groupprofile.uuid
        elif obj.contact:
            return obj.contact.uuid
        return ""
        
    def get_participant_type(self, obj):
        if obj.group:
            return "group"
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
        print(self.instance)
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
        fields = ('id', 'case', 'created', 'subject', 'official')


class PostReplySerializer(serializers.ModelSerializer):
    content = ContentSerializerField(source='post.current_revision.content')
    author_role = serializers.SerializerMethodField()
    group = GroupSerializer(source='post.group')
    author = serializers.SerializerMethodField()
    revisions = serializers.SerializerMethodField()
    revision_id = serializers.CharField(source='post.current_revision.id')
    created = serializers.DateTimeField(source='post.created')
    
    class Meta:
        model = PostReply
        fields = ('content', 'author_role', 'group', 'author', 'revisions', 'revision_id', 'created',)
    
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
        
        
class VulSerializer(serializers.ModelSerializer):

    vul = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()
    cvss_vector = serializers.SerializerMethodField()
    cvss_severity = serializers.SerializerMethodField()
    cvss_score = serializers.SerializerMethodField()
    ssvc_vector = serializers.SerializerMethodField()
    ssvc_decision = serializers.SerializerMethodField()
    ssvc_decision_tree = serializers.SerializerMethodField()
    affected_products = serializers.SerializerMethodField()
    
    class Meta:
        model = Vulnerability
        fields = ('id', 'cve', 'description', 'vul', 'date_added', 'date_public', 'problem_types', 'references', 'tags', 'cvss_vector', 'cvss_severity', 'cvss_score', 'ssvc_vector', 'ssvc_decision', 'ssvc_decision_tree', 'affected_products')

    def to_internal_value(self, data):
        if data.get('date_public') == '':
            data['date_public'] = None
        return super().to_internal_value(data)

    def get_vul(self, obj):
        return obj.vul

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
                return obj.vulssvc.decision_tree
        except VulSSVC.DoesNotExist:
            return None

    def get_affected_products(self, obj):
        #get all *Affected* status related to this vul
        status = ComponentStatus.objects.filter(vul=obj, current_revision__status=1)
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
        fields = ('decision_tree', 'tree_type', 'final_decision', 'vector', 'user', 'last_edit')

class AdvisorySerializer(serializers.ModelSerializer):
    references = serializers.CharField(required=False)
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
