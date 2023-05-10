from rest_framework import serializers
from authapp.models import User
from django.core.exceptions import ObjectDoesNotExist

class ChoiceField(serializers.ChoiceField):

    def to_representation(self, obj):
        if obj == '' and self.allow_blank:
            return obj
        return self._choices[obj]

    def to_internal_value(self, data):
        # To support inserts with the value
        if data == '' and self.allow_blank:
            return ''

        for key, val in self._choices.items():
            if val == data:
                return key
        self.fail('invalid_choice', input=data)


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='screen_name')
    logocolor = serializers.CharField(source='userprofile.logocolor')
    photo = serializers.ImageField(source='userprofile.photo')
    contact = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'name', 'org', 'photo', 'logocolor', 'title', 'contact')

    def get_contact(self, obj):
        try:
            return str(obj.contact.uuid)
        except ObjectDoesNotExist:
            return None
        
class GenericSerializer(serializers.Serializer):
    type = serializers.SerializerMethodField()
    url = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    modified = serializers.SerializerMethodField()

    def get_modified(self, obj):
        try:
            if obj.modified:
                return obj.modified
        except:
            pass

        try:
            if obj.groupprofile.modified:
                return obj.groupprofile.modified
        except:
            pass
        return obj.created
    

    def get_type(self, obj):
        return str(type(obj))

    def get_url(self, obj):
        return obj.get_absolute_url()

    def get_title(self, obj):
        try:
            if obj.full_title:
                return obj.full_title
        except:
            pass
        
        try:
            if obj.title:
                return obj.title
        except:
            pass
        try:
            if obj.name:
                return obj.name
        except:
            pass
        try:
            if obj.group.name:
                return obj.group.name
        except:
            pass

        try:
            if obj.vul:
                return obj.vul
        except:
            return "?"
        
    
    
        

