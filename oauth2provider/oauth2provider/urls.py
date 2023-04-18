"""oauth2provider URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, re_path, include
from django.views.generic import TemplateView, RedirectView
from provider import views
from django.contrib.auth.views import LoginView
from django_otp.forms import OTPAuthenticationForm
import oauth2_provider.views as oauth2_views
from django.conf import settings


urlpatterns = [
    re_path('^$', RedirectView.as_view(url='provider/')),
    path('provider/', include(('provider.urls', 'provider'), namespace='provider')),
    path('admin/', admin.site.urls),
    path('logout/', RedirectView.as_view(url='/accounts/logout/'), name='account_logout'),
    re_path(r'^accounts/login', views.LoginView.as_view(), name='login'),
    path('accounts/password_change/done/', views.PasswordChangeDoneView.as_view(), name='password_change_done'),
    re_path(r'^accounts/', include('django.contrib.auth.urls')),
    re_path(r'^profile/$', views.profile),
]

oauth2_endpoint_views = [
    path('authorize/', oauth2_views.AuthorizationView.as_view(), name='authorize'),
    path('token/', oauth2_views.TokenView.as_view(), name="token"),
    path('revoke-token/', oauth2_views.RevokeTokenView.as_view(), name="revoke-token"),
]

#these aren't necessary and can all be done through admin which has benefit of controlling perms/access
#the following urls shouldn't be accessed by a regular user
if settings.DEBUG:
    oauth2_endpoint_views += [
        path('applications/', oauth2_views.ApplicationList.as_view(), name="list"),
        path('applications/register/', oauth2_views.ApplicationRegistration.as_view(), name="register"),
        path('applications/<pk>/', oauth2_views.ApplicationDetail.as_view(), name="detail"),
        path('applications/<pk>/delete/', oauth2_views.ApplicationDelete.as_view(), name="delete"),
        path('applications/<pk>/update/', oauth2_views.ApplicationUpdate.as_view(), name="update"),
    ]

    # OAuth2 Token Management endpoints
    oauth2_endpoint_views += [
        path('authorized-tokens/', oauth2_views.AuthorizedTokensListView.as_view(), name="authorized-token-list"),
        path('authorized-tokens/<pk>/delete/', oauth2_views.AuthorizedTokenDeleteView.as_view(),
             name="authorized-token-delete"),
    ]

urlpatterns += [
    path('o/', include((oauth2_endpoint_views, 'oauth2_provider'), namespace='oauth2_provider'))
]


