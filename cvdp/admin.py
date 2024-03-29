from django.contrib import admin

# Register your models here.

from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from authapp.models import User
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.contrib.auth import views as auth_views
from django.contrib.auth.models import Group
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from cvdp.models import UserProfile, GroupProfile, Contact, CaseThreadParticipant, CaseParticipant, EmailTemplate, Case, AssignmentRole, UserAssignmentWeight, CaseReport, GlobalSettings, MessageThread, UserThread, CaseThread, Vulnerability, CaseResolutionOptions
from cvdp.manage.models import AdVISEConnection, AdviseTask, AdviseScheduledTask
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from allauth.mfa.models import Authenticator

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = "User Profile"
    fk_name = 'user'

class VulAdmin(admin.ModelAdmin):
    list_display = ('get_vul_id', 'cve', 'case', 'description')
    search_fields=['description', 'case__case_id', 'cve']
    actions = ['get_vul_id']
    title = "Deleted Vulnerabilities"


    def get_vul_id(self, instance):
        return instance.vul
    get_vul_id.short_description = "Vul ID"

    def has_delete_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        return False
    

class CustomUserAdmin(BaseUserAdmin):
    model = User
    inlines = (UserProfileInline, )
    list_display = ('username', 'first_name', 'last_name', 'is_staff', 'email', 'screen_name', 'is_coordinator', 'api_account')
    list_select_related = ('userprofile',)
    list_filter = ('is_staff', 'is_coordinator', 'api_account', )
    fieldsets = BaseUserAdmin.fieldsets + ((None,{'fields':('screen_name', 'title', 'org', 'pending', 'is_coordinator', 'api_account')}),)


class GroupProfileInline(admin.StackedInline):
    model = GroupProfile
    can_delete=False
    verbose_name_plural = 'Group Details'

class GroupAdmin(BaseGroupAdmin):
    inlines = (GroupProfileInline, )
    list_display = ('name', 'get_group_type', 'get_group_uuid')
    search_fields=['name']

    def get_group_type (self, instance):
        if instance.groupprofile:
            return instance.groupprofile.vendor_type
        return "None"
    get_group_type.short_description="Group Type"
    
    def get_group_uuid(self, instance):
        if instance.groupprofile:
            return instance.groupprofile.uuid
        return "None"
    get_group_uuid.short_description="UUID"

    
class AdVISEAdminSite(admin.AdminSite):
    site_header = "AdVISE Administration"
    site_title = "AdVISE"
    index_title = "AdVISE Site Administration"

@admin.register(EmailTemplate)
class EmailTemplateAdmin (admin.ModelAdmin):
   list_display = ('template_name', 'template_type', 'subject', 'plain_text', 'locale' )
   search_fields = ('template_name', 'locale', 'plain_text', )
   list_filter = ('locale', 'template_type', )

   def has_delete_permission(self, request, obj=None):
        return False


class CaseOwnerFilter(admin.SimpleListFilter):
    title = "Owner"
    parameter_name = 'owner'

    def lookups(self, request, model_admin):
        return [(0, '--------')] + [(q.id, q.username) for q in get_user_model().objects.filter(is_staff=True)]

    def queryset(self, request, queryset):
        if self.value() == 0:
            #get unassigned cases
            assignments = CaseParticipant.objects.filter(role="owner").values_list('case__id', flat=True)
            return queryset.exclude(id__in=assignments)
        elif self.value():
            assignments = CaseParticipant.objects.filter(contact__user__id=self.value(), role="owner").values_list('case__id', flat=True)
            return queryset.filter(id__in=assignments)
        else:
            return queryset
    
@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ('case_id', 'title', 'created', 'status', 'case_get_owners')
    search_fields = ('case_id', 'title', )
    list_filter = ('status', CaseOwnerFilter)

    def has_delete_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        return False

    def case_get_owners(self, obj):
        return obj.get_owners

    case_get_owners.short_description = _('Case Owners')

class CustomAuthenticator(admin.ModelAdmin):
    list_display = ('user', 'type')
    search_fields=['user__email']
    title = "MFA"

    def has_delete_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        return False


class ConnectionAdmin(admin.ModelAdmin):
    list_display = ('get_group_name', 'url', )

    def get_group_name(self, obj):
        return obj.group.name
    
class ContactAdmin(admin.ModelAdmin):
    search_fields=['email', 'name']
    list_display=['email', 'name', 'user_id',]

    
    def has_delete_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        return False

admin.site.site_header = "AdVISE Admin"
admin.site.site_title = "AdVISE Admin Portal"

admin.site.register(User, CustomUserAdmin)
admin.site.register(GlobalSettings)
admin.site.unregister(Group)
admin.site.register(Group, GroupAdmin)
admin.site.register(Contact, ContactAdmin)
admin.site.register(CaseThreadParticipant)
admin.site.register(CaseParticipant)
admin.site.register(AssignmentRole)
admin.site.register(MessageThread)
admin.site.register(UserAssignmentWeight)
admin.site.register(CaseReport)
admin.site.register(CaseResolutionOptions)
admin.site.register(UserThread)
admin.site.register(AdVISEConnection, ConnectionAdmin)
admin.site.register(CaseThread)
admin.site.register(Vulnerability, VulAdmin)
admin.site.register(AdviseTask)
admin.site.register(AdviseScheduledTask)
admin.site.register(Authenticator, CustomAuthenticator)
