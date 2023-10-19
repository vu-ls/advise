from django.urls import include, path, re_path
from adscore import views
from django.conf import settings

urlpatterns = [
    path('', views.ScoreIndexView.as_view(), name='index'),
    re_path('^(?P<cve>CVE-\d+-\d+)/$', views.ScoreIndexView.as_view(), name='score-cve'),
    path('api/vuls/', views.VulAPIView.as_view({'get': 'list'}), name='vulsapi'),
    re_path('^api/vuls/(?P<cve>CVE-\d+-\d+)/$', views.VulAPIView.as_view({'get': 'retrieve', 'patch': 'partial_update', 'post': 'create'}), name='vul_edit_lock'),
    re_path('^api/vuls/(?P<cve>CVE-\d+-\d+)/score/', views.ScoreAPIView.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='scoreapi'),
    re_path('^api/(?P<cve>CVE-\d+-\d+)/activity/$', views.ScoreActivityAPIView.as_view({'get': 'list'}), name='score-activity'),
]

