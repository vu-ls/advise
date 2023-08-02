from cvdp.models import MessageThread, Message, UserThread
from rest_framework import serializers
from django.contrib.auth.models import Group
from django.urls import reverse
from authapp.models import User
from cvdp.serializers import ChoiceField, UserSerializer
from cvdp.cases.serializers import ContentSerializerField

from cvdp.groups.serializers import GroupSerializer


class MessageSerializer(serializers.ModelSerializer):

    sender = UserSerializer()
    content = ContentSerializerField()
    
    class Meta:
        model = Message
        fields = ('id', 'created', 'sender', 'content', )


class ThreadSerializer(serializers.ModelSerializer):

    last_message = serializers.SerializerMethodField()
    unread = serializers.SerializerMethodField()
    users = UserSerializer(many=True)
    groups = GroupSerializer(many=True)
    
    class Meta:
        model = MessageThread
        fields = ('id', 'subject', 'users', 'groups', 'messages', 'last_message', 'unread')

    def get_unread(self, obj):
        group = self.context.get('group')
        if group:
            return bool(obj.groupthread_set.filter(group=group, unread=True))
        user = self.context.get('user')
        return bool(obj.userthread_set.filter(user=user, unread=True))
        
    def get_last_message(self, obj):
        message = obj.latest_message
        serializer = MessageSerializer(message)
        return serializer.data
