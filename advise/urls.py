"""advise URL Configuration

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
from django.urls import path, include, re_path
from django.conf.urls.static import static
from django.views.generic import TemplateView, RedirectView
from django.conf import settings
from authapp import views as authviews
from cvdp import views as cvdpviews
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

handler404 = cvdpviews.page_not_found_view
handler500 = cvdpviews.error_view
handler403 = cvdpviews.permission_denied_view
handler400 = cvdpviews.bad_request_view

schema_view = get_schema_view(
   openapi.Info(
      title="AdVISE API",
      default_version='v1',
       description="The Advance Vulnerability Information Sharing Environment API. Most endpoints require credentials. A registered user can create an API key within their AdVISE profile.",
      terms_of_service="https://vu.ls/policies/terms/",
      contact=openapi.Contact(email="vuls@vu.ls"),
      license=openapi.License(name="GPLv2 LICENSE"),
   ),
   public=True,
   permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    re_path('^$', RedirectView.as_view(url='advise/')),
    path('admin/', admin.site.urls),
    path('accounts/social/connections/', RedirectView.as_view(url="/advise/auth/profile/mfa/")),
    path('accounts/password/set/', RedirectView.as_view(url='/advise/auth/password/')),
    path('accounts/password/change/', RedirectView.as_view(url='/advise/auth/password/')),
    path('accounts/confirm-email/', RedirectView.as_view(url='/advise/auth/verify/email/')),
    path('accounts/2fa/', RedirectView.as_view(url='/advise/auth/profile/mfa/')),
    path('accounts/', include('allauth.urls')),

    path('advise/',include(('cvdp.urls', 'cvdp'), namespace="cvdp")),
    path('advise/auth/', include(('authapp.urls', 'authapp'), namespace='authapp')),
    re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    re_path(r'^swagger/$', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    re_path(r'^redoc/$', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),

]

if "adscore" in settings.INSTALLED_APPS:
    urlpatterns.append(path('advise/score/', include(('adscore.urls', 'adscore'), namespace="adscore")))

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.ATTACHMENTS_URL, document_root=settings.ATTACHMENTS_ROOT)
    
