from django.contrib import admin
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from provider.views import LoginView
from .models import User

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('username', 'first_name', 'last_name', 'is_staff', 'email', 'screen_name', 'email_confirmed')
    fieldsets = UserAdmin.fieldsets + ((None,{'fields':('screen_name', 'title', 'organization', 'email_confirmed')}),)

admin.site.register(User, CustomUserAdmin)
admin.site.login = LoginView.as_view()
admin.site.site_header = "OAuth2 Provider Admin"
admin.site.site_title = "OAuth2 Admin Portal"
