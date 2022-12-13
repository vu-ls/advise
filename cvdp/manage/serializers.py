from cvdp.manage.models import *
from cvdp.models import UserAssignmentWeight, AssignmentRole, CVEServicesAccount, CaseReport, EmailTemplate
from rest_framework import serializers
from django.contrib.auth.models import Group
from django.urls import reverse
from authapp.models import User
from cvdp.serializers import ChoiceField



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
        fields = ("id", "title", "description", 'intro', 'send_ack_email', 'email_from', 'email_subject', 'email_answers', 'email_message', 'login_required', 'allow_file_upload',)


        
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
        if obj.server_type == "prod":
            return "https://cveawg.mitre.org/api/"
        elif obj.server_type == "dev":
            return "https://cveawg-dev.mitre.org/api/"
        else:
            return "https://cveawg-test.mitre.org/api/"
    
        
