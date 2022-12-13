from django.contrib import admin
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('username', 'first_name', 'last_name', 'is_staff', 'email', 'screen_name')
    fieldsets = UserAdmin.fieldsets + ((None,{'fields':('screen_name', 'title', 'organization',)}),)

admin.site.register(User, CustomUserAdmin)
