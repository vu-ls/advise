from rest_framework import serializers

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
        
    
    
        

