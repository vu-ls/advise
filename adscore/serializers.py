from adscore.models import *
from django.urls import reverse
from datetime import datetime, timedelta
from rest_framework import serializers

import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class SSVCScoreSerializer(serializers.ModelSerializer):

    ssvc_vector = serializers.CharField(source='vector')
    ssvc_decision = serializers.CharField(source='final_decision')
    ssvc_decision_tree = serializers.JSONField(source='decision_tree')
    ssvc_justifications = serializers.JSONField(source='justifications', required=False)
    user = serializers.CharField(source = 'user.screen_name', required=False)
    
    class Meta:
        model = SSVCScore
        fields = ('ssvc_decision_tree', 'tree_type', 'ssvc_decision', 'ssvc_vector', 'user', 'last_edit', 'ssvc_justifications')



class AdScoreSerializer(serializers.ModelSerializer):
    ssvcscore = SSVCScoreSerializer()
    locked = serializers.SerializerMethodField()

    class Meta:
        model = Vul
        fields = ('cve', 'description', 'date_added', 'last_modified', 'published', 'problem_types', 'references', 'status', 'ssvcscore', 'locked')

    def get_locked(self, obj):
        try:
            vullock = obj.vullock
        except VulLock.DoesNotExist:
            return False

        user = self.context.get('user')
        if vullock.user != user:
            return True
        else:
            #this is the user that locked it
            return False
