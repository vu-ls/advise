from cvdp.models import GroupProfile, ContactAssociation, Contact
from rest_framework import serializers
from django.contrib.auth.models import Group
from authapp.models import APIToken
from django.urls import reverse

class GroupSerializer(serializers.ModelSerializer):
    type = serializers.SerializerMethodField()
    url = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    logocolor = serializers.SerializerMethodField()
    uuid = serializers.SerializerMethodField()
    support_email = serializers.CharField(source='groupprofile.support_email', allow_blank=True, required=False)
    support_phone = serializers.CharField(source='groupprofile.support_phone', allow_blank=True, required=False)
    website = serializers.CharField(source='groupprofile.website',  allow_blank=True, required=False)
    mailing_address = serializers.CharField(source='groupprofile.mailing_address', allow_blank=True, required=False)
    
    class Meta:
        model=Group
        fields = ('id', 'name', 'type', 'url', 'photo', 'logocolor', 'uuid',  'support_email', 'support_phone', 'website', 'mailing_address',)

    def get_url(self, obj):
        return reverse("cvdp:group", args=[obj.id])

    def get_type(self, obj):
        if obj.groupprofile:
            return obj.groupprofile.vendor_type
        else:
            return "group"

    def get_photo(self, obj):
        if obj.groupprofile:
            return obj.groupprofile.get_logo()
        return ""

    def get_logocolor(self, obj):
        if obj.groupprofile:
            return obj.groupprofile.icon_color
        return ""

    def get_uuid(self, obj):
        if obj.groupprofile:
            return obj.groupprofile.uuid
        return ""

    def update(self, group, validated_data):
        print("IN UPDATE")
        print(validated_data)
        data = validated_data.get('groupprofile')
        if (data):
            group.groupprofile.support_email = data.get('support_email')
            group.groupprofile.support_phone = data.get('support_phone')
            group.groupprofile.website = data.get('website')
            group.groupprofile.mailing_address = data.get('mailing_address')
            group.groupprofile.save()
        return group



class GroupAPIAccountSerializer(serializers.ModelSerializer):

    class Meta:
        model=APIToken
        fields = ('last_four', 'created', 'last_used', )
    
    
class GroupProfileSerializer(serializers.ModelSerializer):
    group = GroupSerializer(required=False)

    class Meta:
        model=GroupProfile
        fields=['group', 'active', 'vendor_type']

    def create(self, validated_data):
        group_data = validated_data.pop('vendor_type')
        g = Group(name=validated_data.pop('name'))
        g.save()
        profile, created = GroupProfile.objects.update_or_create(group=g,
                                                                 active=True,
                                                                 vendor_type=group_data)

        return profile


    
class ContactSerializer(serializers.ModelSerializer):
    type = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    url = serializers.SerializerMethodField()
    
    class Meta:
        model = Contact
        fields = ['email', 'phone', 'name', 'type', 'user_name', 'url', 'uuid']

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.screen_name
        else:
            return ""

    def get_url(self, obj):
        return reverse("cvdp:contact", args=[obj.id])

    def get_type(self, obj):
        if obj.user:
            return "Contact/User"
        return "Contact"

    
class ContactAssociationSerializer(serializers.ModelSerializer):

    group = serializers.CharField(source='group.name', required=False)

    url = serializers.SerializerMethodField()
    
    contact = ContactSerializer(required=False)

    class Meta:
        model = ContactAssociation
        fields = ['id', 'group', 'contact', 'verified', 'url', 'group_admin']
        read_only_fields = ('id', )
        
    def get_url(self, obj):
        return reverse("cvdp:contact", args=[obj.contact.id])


    

        


        
        
