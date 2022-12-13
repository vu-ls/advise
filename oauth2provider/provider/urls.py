from django.urls import include, path, re_path
from django.contrib import admin
from django.views.generic import TemplateView, RedirectView
from provider import views

urlpatterns = [
    re_path('^$', RedirectView.as_view(pattern_name="provider:welcome"), name='index'),
    path('home/', views.WelcomeView.as_view(), name='welcome'),
    path('register/', views.RegistrationView.as_view(), name='register'),
    re_path(r'^mfa/removemfa/', views.MFARemoveView.as_view(), name='remove_mfa'),
    re_path(r'^mfa/setupmfa/', views.MFASetupView.as_view(), name='setup_mfa'),
    re_path(r'^mfa/', views.MFARequiredView.as_view(), name='mfa'),
]
