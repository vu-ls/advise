from django.urls import path, include, re_path
from authapp.oauth2 import views
from allauth.socialaccount.providers.oauth2.urls import default_urlpatterns
from .provider import AdViseProvider

urlpatterns = default_urlpatterns(AdViseProvider)
"""
urlpatterns.extend([
#    path('login/', views.OAuth2LoginView.as_view(), name='login'),
    path('clients/', views.get_oauth2_clients, name='clients')
])
"""
