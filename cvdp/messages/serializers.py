from cvdp.models import MessageThread, Message, UserThread
from rest_framework import serializers
from django.contrib.auth.models import Group
from django.urls import reverse
from authapp.models import User
from cvdp.serializers import ChoiceField
from cvdp.cases.serializers import UserSerializer, ContentSerializerField


class MessageSerializer(serializers.ModelSerializer):

    sender = UserSerializer()
    content = ContentSerializerField()
    
    class Meta:
        model = Message
        fields = ('id', 'sender', 'created', 'content')


class ThreadSerializer(serializers.ModelSerializer):

    last_message = serializers.SerializerMethodField()
    unread = serializers.SerializerMethodField()
    users = UserSerializer(many=True)
    
    class Meta:
        model = MessageThread
        fields = ('id', 'subject', 'users', 'messages', 'last_message', 'unread')

    def get_unread(self, obj):
        user = self.context.get('user')
        return bool(obj.userthread_set.filter(user=user, unread=True))
        
    def get_last_message(self, obj):
        message = obj.latest_message
        serializer = MessageSerializer(message)
        return serializer.data
