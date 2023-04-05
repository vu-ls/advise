from django.contrib.auth import views as auth_views
from django.urls import path, re_path, include
from authapp import views
from django.views.generic import TemplateView, RedirectView
from django.conf import settings
from django.urls import reverse_lazy

urlpatterns = [
    path('login/', views.InitLoginView.as_view(), name='login'),
    #path('login/', RedirectView.as_view(url='/accounts/login/'), name='login'),
    path('logout/', RedirectView.as_view(url='/accounts/logout/'), name='logout'),
    path('genapikey/', views.APITokenView.as_view(), name='apitoken'),
    path('pending/', TemplateView.as_view(template_name='authapp/pending.html'), name='pending'),
    path('password/', views.ChangePasswordView.as_view(), name='password'),
    path('password/set/', views.SetPasswordView.as_view(), name='set_password'),
    path('preferences/', views.PreferencesView.as_view(), name='preferences'),
    path('profile/', views.UpdateProfileView.as_view(),name='profile'),
    path('profile/mfa/', views.MFAAccessView.as_view(), name='mfaaccess'),
    path('profile/add/logo/', views.UpdateProfilePhoto.as_view(), name='addphoto'),
    path('account/help/', views.LoginHelpView.as_view(), name='loginhelp'),
    re_path('user/(?P<pk>[0-9]+)/resetmfa/$', views.ResetUserMFAView.as_view(), name='reset_mfa'),
    path('confirmed/', TemplateView.as_view(template_name='authapp/account_confirmed.html'), name='account_confirmed'),
    path('askadmin/', TemplateView.as_view(template_name='authapp/askadmin.html'), name='askadmin'),
]

