from cvdp.manage.models import *
from cvdp.models import UserAssignmentWeight, AssignmentRole, CVEServicesAccount, CaseReport, EmailTemplate, CaseResolutionOptions
from rest_framework import serializers
from django.contrib.auth.models import Group
from django.urls import reverse
from authapp.models import User
from cvdp.serializers import ChoiceField, UserSerializer
from cvdp.groups.serializers import GroupSerializer
from django.conf import settings

class QuestionSerializer(serializers.ModelSerializer):

    question_type = ChoiceField(choices=FIELD_NAMES)
    
    class Meta:
        model = FormQuestion
        fields = ('id', 'question', 'question_type', 'question_choices', 'required', 'private', )

        
class EmailTemplateSerializer(serializers.ModelSerializer):

    class Meta:
        model = EmailTemplate
        fields = ('id', 'template_name', 'template_type', 'subject', 'plain_text', )
        
class ReportingFormSerializer(serializers.ModelSerializer):

    class Meta:
        model = ReportingForm
        fields = ("id", "title", "description", 'intro', 'send_ack_email', 'email_from', 'email_subject', 'email_answers', 'email_message', 'login_required', )


class ResolutionSerializer(serializers.ModelSerializer):

    class Meta:
        model = CaseResolutionOptions
        fields = ('description', 'id', )
        
class AssignmentWeightSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='user.screen_name')
    userid = serializers.CharField(source='user.id')
    probability = serializers.SerializerMethodField()
    
    class Meta:
        model = UserAssignmentWeight
        fields = ('userid', 'name', 'weight', 'probability', )

    def get_probability(self, obj):
        return obj.probability

        
class AutoAssignmentSerializer(serializers.ModelSerializer):

    users = AssignmentWeightSerializer(many=True)
    
    class Meta:
        model = AssignmentRole
        fields = ('id', 'role', 'users', )

    def create(self, validated_data):
        user_data = validated_data.pop('users')
        role = AssignmentRole.objects.create(**validated_data)
        return role


class CVEAccountSerializer(serializers.ModelSerializer):
    server_type = ChoiceField(choices=CVEServicesAccount.SERVER_TYPES)
    server = serializers.SerializerMethodField()
    api_key = serializers.CharField(read_only=True);
    
    class Meta:
        model = CVEServicesAccount
        fields = ('id', 'org_name', 'email', 'active', 'server_type', 'server', 'group', 'api_key')

    def get_server(self, obj):
        for i in settings.CVE_SERVICES_API_URLS:
            if obj.server_type == i[0]:
                return i[1]
        return "Not Found"
    
        
class ConnectionSerializer(serializers.ModelSerializer):

    incoming_api_key = serializers.SerializerMethodField()
    created_by = UserSerializer()
    group = GroupSerializer()
    
    class Meta:
        model = AdVISEConnection
        fields = ("id", "group", "url", "external_key", "incoming_api_key", "created", "created_by", "last_used", "disabled")
        read_only_fields = ("id", "created", "created_by", "last_used")

        
    def get_incoming_api_key(self, obj):
        if obj.incoming_key:
            return obj.incoming_key.last_four
        else:
            return ""

        
class TagSerializer(serializers.ModelSerializer):

    user = UserSerializer()
    category = ChoiceField(choices = DefinedTag.TAG_CATEGORY)
    
    class Meta:
        model = DefinedTag
        fields = ('id', 'tag', 'description', 'user', 'created', 'category')
        read_only_fields = ('id', 'user', 'created')

class TagCategorySerializer(serializers.Serializer):

    category = serializers.SerializerMethodField()


    def get_category(self, obj):
        data = {}
        for key, val in DefinedTag.TAG_CATEGORY:
            # get all tags in category
            tags = DefinedTag.objects.filter(category=key)
            tag_serializer = TagSerializer(tags, many=True)
            data[val] = tag_serializer.data
        return data
    
            
