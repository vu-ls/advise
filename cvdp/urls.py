from django.urls import include, path, re_path
from django.contrib.auth import views as auth_views
from cvdp import views
from cvdp.groups import views as groupviews
from cvdp.cases import views as caseviews
from cvdp.messages import views as msgviews
from cvdp.manage import views as manageviews
from cvdp.report import views as reportviews
from cvdp.components import views as componentviews
from authapp import views as authapp_views

from django.conf import settings
from django.contrib import admin
from rest_framework.routers import DefaultRouter
from django.views.generic import TemplateView, RedirectView

router = DefaultRouter()
router.register(r'group', groupviews.GroupDetailAPIView, basename="groupdetailapi")
router.register(r'contacts', groupviews.ContactAPIView, basename='contactapi')
router.register(r'cases', caseviews.CaseAPIView, basename='caseapi')

post_detail = caseviews.PostAPIView.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy',
})
post_list = caseviews.PostAPIView.as_view({
    'get': 'list',
    'post': 'create'
})
thread_detail = caseviews.CaseThreadAPIView.as_view({
    'get': 'retrieve',
    'put': 'update',
    'delete': 'destroy'
})
thread_list = caseviews.CaseThreadAPIView.as_view({
    'get': 'list',
    'post': 'create'
})
    

urlpatterns = [
    path('api/', include(router.urls)),
    re_path('^$', RedirectView.as_view(pattern_name="cvdp:dashboard"), name='index'),
    path('profile/newcolor/', views.GenerateNewRandomColor.as_view(), name='newcolor'),
    path('dashboard/', views.DashboardView.as_view(), name='dashboard'),

    re_path('^quickSearch/$', views.quickSearch, name='quicksearch'),
    path('search/', views.SearchAllView.as_view(), name='search'),
    path('api/search/', views.APISearchView.as_view(), name='apisearch'),
    path('reports/', reportviews.ReportsView.as_view(), name='reports'),
    path('report/', reportviews.ReportView.as_view(), name='report'),
    re_path('^report/add/case/(?P<caseid>\d+)/$', reportviews.AddReportView.as_view(), name='addreport'),
    re_path('^report/case/(?P<caseid>\d+)/add/$', reportviews.AddCaseReportView.as_view(), name='add_case_report'),
    path('inbox/', msgviews.InboxView.as_view(), name='inbox'),
    re_path('^inbox/(?P<contact>[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/$', msgviews.InboxView.as_view(), name='msg_contact'),
    re_path('^artifact/(?P<path>.*)/$', views.ArtifactView.as_view(), name='artifact'),
    path('api/form/submissions/', reportviews.ReportsAPIView.as_view({'get': 'list'}), name='reportsapi'),
    path('api/inbox/unread/', msgviews.UnreadMessageAPI.as_view(), name='unread'),
    re_path('^api/inbox/thread/(?P<pk>\d+)/$', msgviews.MessageAPIView.as_view({'get':'list', 'post': 'create'}), name='msgapi'),
    path('api/inbox/', msgviews.ThreadAPIView.as_view({'get':'list', 'post': 'create'}), name='inboxapi'),
    path('group/admin/', groupviews.GroupAdminView.as_view(), name='groupadmin'),
    path('api/manage/group/admin/', groupviews.GroupAdminAPIView.as_view({'get': 'list'}), name='groupadminapi'),
    re_path('^api/manage/group/(?P<pk>[0-9]+)/api/$', groupviews.GroupAPIAccountView.as_view({'get': 'list', 'post': 'create'}), name='groupapikeys'),
    re_path('^api/manage/group/(?P<pk>[0-9]+)/api/(?P<key>[0-9a-zA-Z]+)/$', groupviews.GroupAPIAccountView.as_view({'delete': 'destroy', 'patch':'partial_update'}), name='rmgroupapikey'),
    re_path('^api/manage/group/(?P<pk>[0-9]+)/admin/$', groupviews.GroupAdminAPIView.as_view({'patch': 'partial_update', 'get': 'retrieve'}), name='groupadminapi'),
    re_path('^api/manage/group/admin/(?P<pk>[0-9]+)/$', groupviews.GroupAdminAPIView.as_view({'get': 'retrieve'}), name='groupadminapi'),
    re_path('^groups/(?P<pk>[0-9]+)/$', groupviews.GroupDetailView.as_view(), name='group'),
    re_path('^groups/(?P<pk>[0-9]+)/components/$', groupviews.GroupComponentsView.as_view(), name='group_components'),
    path('groups/search/', groupviews.GroupSearchView.as_view(), name='searchgroups'),
    path('groups/new/', groupviews.CreateGroupView.as_view(), name='newgroup'),
    path('contact/new/', groupviews.CreateContactView.as_view(), name='newcontact'),
    re_path('^contact/new/(?P<pk>[0-9]+)/$', groupviews.CreateContactView.as_view(), name='newcontact'),
    re_path('^contact/(?P<slug>[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/$', groupviews.ContactView.as_view(), name='contact'),
    #re_path('^group/api/(?P<pk>[0-9]+)/$', groupviews.GroupAPIView.as_view(), name='groupapi'),
    path('api/groups/', groupviews.GroupAPIView.as_view(), name='groupapi'),
    re_path('^api/groups/(?P<pk>[0-9]+)/contacts/$', groupviews.ContactAssociationAPIView.as_view({'get':'list', 'post':'create'}), name='assoc_api'),
    re_path('^api/groups/contacts/(?P<pk>[0-9]+)/$', groupviews.ContactAssociationAPIView.as_view({'patch': 'partial_update', 'delete':'destroy'}), name='assoc_api_detail'),
    re_path('^api/contact/(?P<contact>[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/$', groupviews.GetContactAPIView.as_view(), name='get_contact_api'),
    re_path('^api/contact/(?P<contact>[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/activity/$', groupviews.ContactActivityAPIView.as_view({'get': 'list'}), name='contact_activityapi'),
    re_path('^api/group/(?P<group>[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/activity/$', groupviews.ContactActivityAPIView.as_view({'get': 'list'}), name='group_activityapi'),
    re_path('^api/contact/activity/$', groupviews.ContactActivityAPIView.as_view({'get': 'list'}), name='contactactivityapi'),

    
    path('api/case/notifications/', caseviews.CaseNotificationAPI.as_view(), name='notifications'), 
    re_path('^case_search/$', caseviews.CaseFilter.as_view(), name='casesearch'),
    path('case/new/', caseviews.CreateNewCaseView.as_view(), name='newcase'),
    re_path('^case/(?P<caseid>[0-9]+)/$', caseviews.CaseView.as_view(), name='case'),
    re_path('^case/(?P<caseid>[0-9]+)/edit/$', caseviews.EditCaseView.as_view(), name='edit_case'),
    re_path('^case/(?P<caseid>[0-9]+)/advisory/$', caseviews.EditAdvisoryView.as_view(), name='advisory'),

    re_path('^api/case/(?P<caseid>[0-9]+)/advisory/latest/$', caseviews.AdvisoryAPIView.as_view({'get': 'retrieve', 'patch': 'partial_update'}), name='advisoryapi'),
    re_path('^api/case/(?P<caseid>[0-9]+)/advisory/$', caseviews.AdvisoryAPIView.as_view({'get': 'list', 'post': 'create'}), name='advisoryapi-list'),
    re_path('^api/case/(?P<caseid>[0-9]+)/advisory/csaf/$', caseviews.CSAFAdvisoryAPIView.as_view(), name='csafapi'),
    #path('case/search/results/', caseviews.CaseFilterResults.as_view(), name='caseresults'),
    #re_path('^case/(?P<caseid>[0-9]+)?/post/filter/', caseviews.CasePostFilterView.as_view(), name='searchposts'),
    re_path('^case/(?P<caseid>[0-9]+)/participants/$', caseviews.ManageCaseParticipants.as_view(), name='caseparticipants'),
    #re_path('^case/post/(?P<pk>[0-9]+)/$', caseviews.PostView.as_view(), name='post'),
    #re_path('^case/posts/(?P<pk>[0-9]+)/$', caseviews.ThreadPostsView.as_view(), name='posts'),
    re_path('^case/thread/post/diff/(?P<revision_id>[0-9]+)/$', caseviews.PostDiffView.as_view(), name='diff'),
    re_path('^api/case/(?P<caseid>\d+)/threads/archived/$', caseviews.ArchivedThreadView.as_view({'get': 'list'}), name='archived'),
    re_path('^api/case/thread/(?P<pk>\d+)/posts/$', post_list, name='postlistapi'),
    re_path('^api/case/thread/post/(?P<pk>[0-9]+)/$', post_detail, name='postapi'),
    re_path('^api/case/(?P<caseid>\d+)/threads/$', thread_list, name='threadlistapi'),
    re_path('^api/case/thread/(?P<pk>[0-9]+)/$', thread_detail, name='threadapi'),
    re_path('^api/case/thread/(?P<pk>[0-9]+)/participants/$', caseviews.CaseThreadParticipantAPIView.as_view({'get': 'list', 'post':'create'}), name='thread_participant_api'),
    re_path('^api/case/thread/participant/(?P<pk>[0-9]+)/$', caseviews.CaseThreadParticipantAPIView.as_view({'delete':'destroy'}), name='thread_participant_api'),
    re_path('^api/case/(?P<caseid>\d+)/user/$', caseviews.UserCaseStateAPIView.as_view(), name='usercaseapi'),
 
    re_path('^api/case/(?P<caseid>\d+)/activity/$', caseviews.CaseActivityAPIView.as_view(), name='activityapi'),
    re_path('^api/case/activity/$', caseviews.CaseActivityAPIView.as_view(), name='allactivityapi'),
    re_path('^api/case/(?P<caseid>\d+)/participants/$', caseviews.CaseParticipantAPIView.as_view({'get':'list', 'post':'create'}), name='case_participant_api_list'),
    re_path('^api/case/participant/(?P<pk>[0-9]+)/$', caseviews.CaseParticipantAPIView.as_view({'patch': 'partial_update', 'delete': 'destroy'}), name='case_participant_api'),
    re_path('^api/case/(?P<caseid>\d+)/participants/summary/$', caseviews.CaseParticipantSummaryAPIView.as_view(), name='case_participant_summary_api'),
    re_path('^case/(?P<caseid>\d+)/participants/notify/$', caseviews.NotifyVendorsView.as_view(), name='notifyvendors'),
    re_path('^api/case/(?P<caseid>[0-9]+)/vuls/$', caseviews.VulAPIView.as_view({'get': 'list', 'post':'create'}), name='vulapi'),
    re_path('^api/case/(?P<caseid>[0-9]+)/artifacts/$', caseviews.CaseArtifactAPIView.as_view({'get': 'list', 'post':'create'}), name='artifactapi'),
    re_path('^api/case/artifact/(?P<uuid>.*)/$', caseviews.CaseArtifactAPIView.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete':'destroy'}), name='artifactapi-detail'),
    re_path('^api/vul/(?P<pk>[0-9]+)/$', caseviews.VulAPIView.as_view({'get': 'retrieve', 'delete':'destroy', 'patch': 'partial_update'}), name='vulapi-detail'),

    re_path('^case/vul/(?P<pk>[0-9]+)/cvss/$', caseviews.ScoreVulCVSSView.as_view(), name='cvss'),
    re_path('^api/case/vul/(?P<pk>[0-9]+)/cvss/$', caseviews.CVSSVulView.as_view({'get':'retrieve', 'post': 'create', 'patch': 'partial_update', 'delete': 'destroy'}), name='cvssapi'),
    re_path('^api/case/vul/(?P<pk>[0-9]+)/ssvc/$', caseviews.SSVCVulView.as_view({'get': 'retrieve', 'post': 'create', 'patch': 'partial_update', 'delete': 'destroy'}), name='ssvcapi'),
    
    
    path('manage/users/', manageviews.UserAdminView.as_view(), name='user_admin'),
    path('api/manage/users/pending/', manageviews.PendingUsersAPI.as_view({'get': 'list'}), name='pendingusers'),
    path('api/manage/users/new/', manageviews.NewUsersAPIView.as_view({'get': 'list'}), name='newusers'),
    re_path('^api/manage/users/pending/(?P<pk>[0-9]+)/$', manageviews.PendingUsersAPI.as_view({'patch': 'partial_update'}), name='pendingusers'), 
    path('manage/users/assignroles/', manageviews.AssignRolesView.as_view(), name='assign_roles'),
    path('manage/forms/create/', manageviews.CreateNewReportingForm.as_view(), name='create_form'),
    path('manage/forms/', manageviews.FormManagement.as_view(), name='manage_forms'),
    re_path('^manage/forms/(?P<pk>\d+)/design/$', manageviews.DesignReportingForm.as_view(), name='design_form'),
    #re_path('^manage/forms/(?P<pk>\d+)/design/question/$', manageviews.QuestionForm.as_view(), name='newquestion'),
    #re_path('^manage/forms/question/(?P<pk>\d+)/$', manageviews.QuestionDetail.as_view(), name='question'),
    re_path('^api/manage/form/(?P<pk>\d+)/$', manageviews.ReportingFormAPIView.as_view({'get': 'retrieve', 'delete': 'destroy'}), name='form_api'),
    re_path('^manage/forms/(?P<pk>\d+)/edit/$', manageviews.CreateNewReportingForm.as_view(), name='editform'),
    re_path('^api/manage/form/question/(?P<pk>\d+)/$', manageviews.QuestionAPIView.as_view({'get': 'retrieve', 'delete': 'destroy', 'patch': 'partial_update'}), name='question_api'),
    re_path('^api/manage/form/(?P<pk>\d+)/question/$', manageviews.QuestionAPIView.as_view({'post': 'create', 'get': 'list'}), name='question_api'),
    path('manage/cve/', manageviews.CVEServicesDashboard.as_view(), name='cve_services'),
    re_path('^manage/cve/(?P<pk>\d+)/$', manageviews.CVEServicesDashboard.as_view(), name='cve_services'),
    path('manage/cve/add/', manageviews.CVEServicesAccountManagement.as_view(), name='add_cve_account'),
    re_path('^manage/cve/(?P<pk>\d+)/edit/$', manageviews.CVEServicesAccountManagement.as_view(), name='edit_cve_account'),

    path('api/manage/cve/account/', manageviews.CVEAccountAPI.as_view({'get': 'list', 'post':'create'}), name='cve_api'),
    re_path('^api/manage/cve/account/(?P<pk>\d+)/$', manageviews.CVEAccountAPI.as_view({'get': 'retrieve', 'patch':'update', 'delete': 'destroy'}), name='cve_api'),
    path('api/user/assignments/', views.assignable_users_api),
    path('api/manage/email/templates/', manageviews.EmailTemplateAPI.as_view({'get': 'list'}), name='emailtmpl_api'),
    path('api/manage/autoassignment/', manageviews.AutoAssignmentAPIView.as_view({'get': 'list', 'post':'create'}), name='autoassign_api'),
    re_path('^api/manage/autoassignment/(?P<pk>\d+)/$', manageviews.AutoAssignmentAPIView.as_view({'delete': 'destroy', 'get': 'list', 'patch':'partial_update'}), name='autoassign_api'),
    
    re_path('^api/case/(?P<caseid>\d+)/assign/$', caseviews.assign_case),
    path('triage/', views.TriageView.as_view(), name='triage'),
    path('api/triage/', views.TriageAPIView.as_view({'get': 'list'}), name='triageapi'),
    re_path(r'^triage/(?P<pk>[0-9]+)/$', views.TriageView.as_view(), name='triage'),
    path('api/cwe/', caseviews.CWEAPIView.as_view({'get': 'list'}), name='cweapi'),
    re_path('^api/group/(?P<pk>[0-9]+)/components/$', componentviews.GroupComponentsAPIView.as_view({'get': 'list', 'post': 'create'}), name='group_components_api'),
    path('api/components/', componentviews.ComponentAPIView.as_view({'get': 'list', 'post': 'create'}), name='componentapi'),
    re_path('^api/component/(?P<pk>\d+)/$', componentviews.ComponentAPIView.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='componentapi-detail'),
    path('components/', componentviews.ComponentView.as_view(), name='components'),
    path('components/add/', componentviews.AddComponentView.as_view(), name='addcomponent'),
    path('components/update/owner/', componentviews.ChangeComponentOwnershipView.as_view(), name='change_owner'),
    re_path('^components/(?P<pk>\d+)/edit/$', componentviews.AddComponentView.as_view(), name='addcomponent'),
    re_path('^api/components/(?P<pk>\d+)/dependency/$', componentviews.ProductAPIView.as_view({'get':'retrieve', 'patch':'partial_update'}), name='dependencyapi'), 
    path('api/products/', componentviews.ProductAPIView.as_view({'get': 'list', 'post': 'create'}), name='productapi'),

    re_path('^api/case/(?P<caseid>[0-9]+)/components/$', componentviews.ComponentStatusAPIView.as_view({'get':'list', 'post':'create'}), name='statusapi'),
    re_path('^api/case/component/(?P<pk>[0-9]+)/status/$', componentviews.ComponentStatusAPIView.as_view({'get':'retrieve', 'delete':'destroy', 'patch': 'partial_update'}), name='statusapi-detail'),
    
    
]


