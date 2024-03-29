from django.shortcuts import render
import logging
from django.shortcuts import render, redirect, get_object_or_404
from django.utils.encoding import smart_str
from django.contrib import messages
from django.urls import reverse, reverse_lazy
from django.views import generic, View
from django.utils.timesince import timesince
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_cookie
from django.views.generic.edit import FormView, UpdateView, FormMixin, CreateView
from django.utils.decorators import method_decorator
from django.http import HttpResponse, Http404, JsonResponse, HttpResponseNotAllowed, HttpResponseServerError, HttpResponseForbidden, HttpResponseRedirect, HttpResponseBadRequest
from itertools import chain
from authapp.models import User
from django.utils.safestring import mark_safe
from cvdp.md_utils import markdown as md
from django.core.exceptions import ValidationError, PermissionDenied
from django.utils.translation import gettext as _
from django_filters.rest_framework import DjangoFilterBackend
import django_filters
from authapp.views import  PendingTestMixin
from cvdp.utils import process_query
from rest_framework import exceptions, generics, status, authentication, viewsets, mixins, filters
import json
import difflib
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.views import APIView
from cvdp.permissions import *
from cvdp.cases.serializers import *
from cvdp.components.serializers import StatusActionSerializer
from cvdp.components.models import StatusRevision, ComponentStatusUpload
from cvdp.lib import *
# Create your views here.
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.auth.decorators import login_required, user_passes_test
import traceback
from cvdp.cases.forms import *
from django.core.paginator import Paginator
from random import randint
from cvdp.models import *
from django.conf import settings

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def get_staff():
    return User.objects.filter(is_staff=True)

def get_coordinators():
    return User.objects.filter(is_coordinator=True).exclude(screen_name__isnull=True)

def _my_groups(user):
    groups = user.groups.all()
    if not groups:
        return []
    return groups.values_list('id', flat=True)

def assigned_cases(user):
    my_cases = CaseParticipant.objects.filter(contact__user=user, role='owner').values_list('case')
    return Case.objects.filter(id__in=my_cases).order_by('-modified')

def _my_case_roles(user, case):
    #return Case Participant list
    user_groups = user.groups.values_list('id', flat=True)
    #get my contact
    contact = Contact.objects.filter(user=user).first()
    if user_groups:
        return CaseParticipant.objects.filter(case__id=case).filter(Q(contact=contact) | Q(group__in=user_groups)).exclude(notified__isnull=True)
    else:
        return CaseParticipant.objects.filter(case__id=case, contact=contact).exclude(notified__isnull=True)


def _my_case_threads(user, case):
    if user.is_superuser or user.is_staff or user.is_coordinator:
        return CaseThread.objects.filter(case=case)

    #get my participant
    participants = _my_case_roles(user, case.id)
    ctp = CaseThreadParticipant.objects.filter(participant__in=participants).values_list('thread__id', flat=True)
    return CaseThread.objects.filter(id__in=ctp)

def _my_threads(user):
    user_groups = user.groups.values_list('id', flat=True)
    #get my contact
    contact = Contact.objects.filter(user=user).first()
    if user_groups:
        cps = CaseThreadParticipant.objects.filter(Q(participant__contact=contact) | Q(participant__group__in=user_groups)).exclude(participant__notified__isnull=True).values_list('thread__id', flat=True)
    else:
        cps = CaseThreadParticipant.objects.filter(participant__contact=contact).exclude(participant__notified__isnull=True).values_list('thread__id', flat=True)
    return CaseThread.objects.filter(id__in=cps)


#assignee is CONTACT being assigned
#user is person making the change
def assign_case_user(case, assignee, user):
    thread = CaseThread.objects.filter(case=case, official=True).first()
    add_new_case_participant(thread, assignee.uuid, user, 'owner')

@login_required(login_url="authapp:login")
def assign_case(request, caseid):
    if not request.user.is_coordinator:
        raise PermissionDenied
    
    case = get_object_or_404(Case, case_id=caseid)
    logger.debug(request.POST)
    title = ""
    if request.POST.get('user'):
        user = get_object_or_404(User, id=request.POST.get('user'))
        title = f"assigned case to {user.screen_name}"
    elif request.POST.get('role'):
        #get role
        role = get_object_or_404(AssignmentRole, role=request.POST.get('role'))
        user = auto_assignment(role.id)
        title = f"auto assigned case to {user.screen_name}"
    else:
        raise Http404
    contact = Contact.objects.filter(user=user).first()
    if contact == None:
        raise Http404

    #replaces below code
    try:
        assign_case_user(case, contact, request.user)
    except InvalidRoleException:
        return JsonResponse({'error': 'Invalid case owner'}, status=400)
    """
    thread = CaseThread.objects.filter(case=case, official=True).first()
    add_new_case_participant(thread, contact.uuid, request.user, 'owner')
    """
    action = create_case_action(title, request.user, case)
    #create the case change
    create_case_change(action, "owner", None, user.screen_name)

    return JsonResponse({'status':'success'}, status=200)


@login_required(login_url="authapp:login")
def unassign_case(request, caseid):
    if not request.user.is_coordinator:
        raise PermissionDenied

    case = get_object_or_404(Case, case_id=caseid)
    #is this my case? - don't allow rando coordinator (non staff) to unassign cases
    if not(is_case_owner_or_staff(request.user, case.id)):
        raise PermissionDenied
    
    users = request.POST.getlist('users[]', None)
    if (users):
        #UNASSIGN
        for u in users:
            unassign = get_object_or_404(User, id=u)
            contact = Contact.objects.filter(user=unassign).first()
            if (contact):
                participant = CaseParticipant.objects.filter(case=case, contact=contact, role="owner").first()
            else:
                participant = None
            if (participant):
                old_value = participant.contact.user.screen_name
                title = f"unassigned {old_value} from case"
        
	        # remove from  all threads
                threads = CaseThreadParticipant.objects.filter(participant=participant)
                for t in threads:
                    t.delete()
                participant.delete()
                action = create_case_action(title, request.user, case)
                create_case_change(action, "owner", old_value, None)
            else:
                return JsonResponse({'error': 'User not assigned'}, status=400)
                
        return JsonResponse({'status': 'success'}, status=200)
    else:
        raise Http404
    

class StandardResultsPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size= 100


class CaseNotificationAPI(APIView):
    # With cookie: cache requested url for each user for a minute
    permission_classes = (IsAuthenticated, PendingUserPermission)

    @method_decorator(cache_page(60))
    @method_decorator(vary_on_cookie)
    def get(self, request, format=None):
        data = []
        #any new posts?
        #should this be assigned cases for coordinators?
        cases = my_cases(request.user)
        for case in cases:
            cv = CaseViewed.objects.filter(case=case, user=request.user).first()
            if cv:
                threads = _my_case_threads(request.user, case)
                unseen_posts = Post.objects.filter(thread__in=threads, created__gte=cv.date_viewed).exclude(author__user=request.user).count()
                if unseen_posts:
                    data.append({'case': case, 'text': f'You have {unseen_posts} new post in {case.caseid}'})

                advisory = AdvisoryRevision.objects.filter(advisory__case=case, date_shared__gte=cv.date_viewed).exclude(date_shared__isnull=True)
                if advisory:
                    data.append({'case': case, 'text': f'There is a new draft of the advisory in {case.caseid} to view'})

                vuls = Vulnerability.objects.filter(case=case, date_added__gte=cv.date_viewed).exclude(user=request.user)
                if vuls:
                    data.append({'case': case, 'text': f'There is {len(vuls)} new vulnerabilities in {case.caseid} to view'})
                artifacts = CaseArtifact.objects.filter(case=case, shared=True, action__created__gte=cv.date_viewed).exclude(action__user=request.user)
                if artifacts:
                    data.append({'case': case, 'text': f'There are {len(artifacts)} new files in {case.caseid}'})

            else:
                data.append({'case': case, 'text': f'You have a new case to view: {case.caseid}.'})

        serializer = NotificationSerializer(data, many=True)
        return Response(serializer.data)



class CreateNewCaseView(LoginRequiredMixin, UserPassesTestMixin, FormView):
    form_class = CreateCaseForm
    template_name = "cvdp/newcase.html"
    login_url= "authapp:login"

    def get_success_url(self):
        return

    def test_func(self):
        return self.request.user.is_coordinator

    def get_initial(self):
        initial = {}
        initial['case_id'] = generate_case_id()
        return initial

    def form_invalid(self, form):
        logger.debug("INVALID FORM")
        logger.debug(f"{self.__class__.__name__} errors: {form.errors}")

        return render(self.request, 'cvdp/newcase.html',
                      {'form': form,})

    def post(self, request, *args, **kwargs):
        logger.debug(f"{self.__class__.__name__} post: {self.request.POST}")

        form_class = self.get_form_class()
        form = self.get_form(form_class)
        if form.is_valid():
            return self.form_valid(form)
        else:
            return self.form_invalid(form)

    def form_valid(self, form):
        logger.debug(f"VALID FORM {form.cleaned_data}")
        case = form.save()
        case.created_by = self.request.user
        case.save()

        if form.cleaned_data.get('auto_assign'):
            contact = Contact.objects.filter(user=self.request.user).first()
            thread = CaseThread.objects.filter(case=case, official=True).first()
            add_new_case_participant(thread, contact.uuid, self.request.user, 'owner')
            action = create_case_action(f"assigned case to {self.request.user.screen_name}", self.request.user, case)
            create_case_change(action, "owner", None, self.request.user.screen_name)

        return redirect("cvdp:case", case.case_id)


class EditCaseView(LoginRequiredMixin, UserPassesTestMixin, generic.UpdateView):
    form_class = EditCaseForm
    model = Case
    login_url = "authapp:login"
    template_name = 'cvdp/edit_case.html'

    def test_func(self):
        case = get_object_or_404(Case, case_id=self.kwargs.get('caseid'))
        return is_case_owner_or_staff(self.request.user, case.id)

    def get_object(self, queryset=None):
        return Case.objects.get(case_id=self.kwargs.get('caseid'))

    def form_valid(self, form):
        case = form.save(user=self.request.user)
        return HttpResponseRedirect(case.get_absolute_url())


class AdvisoryAPIView(viewsets.ModelViewSet):
    serializer_class = AdvisorySerializer
    permission_classes = (IsAuthenticated, PendingUserPermission, CaseAccessPermission)

    #TODO - add if advisory is shared to participants?

    def get_view_name(self):
        return f"Case Advisory API"

    def get_object(self):
        ca = CaseAdvisory.objects.filter(case__case_id=self.kwargs['caseid']).first()
        if ca:
            if self.request.user.is_coordinator or ca.current_revision.date_shared or ca.current_revision.date_published:
                return ca.current_revision
            #get last shared?
            if ca.date_published:
                #get last published
                return AdvisoryRevision.objects.filter(advisory=ca).exclude(date_published__isnull=True).order_by('-revision_number').first()
            elif AdvisoryRevision.objects.filter(advisory=ca).exclude(date_shared__isnull=True).exists():
                #has any revision been shared at any point?
                return AdvisoryRevision.objects.filter(advisory=ca).exclude(date_shared__isnull=True).order_by('-revision_number').first()
        elif self.request.user.is_coordinator:
            raise Http404
        #this revision has not been shared
        raise PermissionDenied()


    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return AdvisoryRevision.objects.none()

        if self.request.user.is_coordinator:
            return AdvisoryRevision.objects.filter(advisory__case__case_id=self.kwargs['caseid']).order_by('-revision_number')
        else:
            return AdvisoryRevision.objects.filter(advisory__case__case_id=self.kwargs['caseid']).exclude(date_shared__isnull=True).order_by('-revision_number')

    def update(self, request, **kwargs):
        #only case owners can share advisory
        ca = get_object_or_404(CaseAdvisory, case__case_id=self.kwargs['caseid'])
        if not is_case_owner_or_staff(self.request.user, ca.case.id):
            raise PermissionDenied()

        revision = ca.current_revision
        if request.data.get('share'):

            if revision.date_shared:
                revision.date_shared = None
                #unshare?
                action = create_case_action("unshared Advisory draft", self.request.user, ca.case)
            else:
                revision.date_shared = timezone.now()
                action = create_case_action("shared Advisory draft", self.request.user, ca.case, True)

            if not ca.date_published:
                #giv this revision a version number
                revcount = AdvisoryRevision.objects.filter(advisory=ca).exclude(date_shared__isnull=True).count() + 1
                revision.version_number = f"0.{revcount}.0"
                
            revision.save()

        elif request.data.get('publish'):

            log = ""
            version = ""
            if not ca.date_published:
                version = "1.0.0"
            else:
                #get last published version
                revs = AdvisoryRevision.objects.filter(advisory=ca).exclude(date_published__isnull=True).order_by('-revision_number').first()
                version = revs.version_number

            if not version:
                version = "1.0.0"
                
            version_list = version.split('.')
            if len(version_list) < 3:
                #this is wrong
                if (len(version_list) > 0):
                    #just use first number
                    version = f"{version_list[0]}.0.0"
            if revision.date_published:
                if (revision.version_number == version):
                    # this was the last published version
                    # revision already published/ content hasn't changed
                    log = request.data.get('log', 'non-content update')
                    #bump minor version
                    version = f"{version_list[0]}.{int(version_list[1])+1}.0"
                else:
                    log = request.data.get('log', 'Content update')
                    #bump major version
                    version = f"{int(version_list[0])+1}.0.0"
            else:
                log = request.data.get('log', revision.user_message)
                version = f"{int(version_list[0])+1}.0.0"
            

            ca.add_revision(AdvisoryRevision(user=self.request.user,
                                             title=revision.title,
                                             content=revision.content,
                                             references=revision.references,
                                             date_published=timezone.now(),
                                             version_number = version,
                                             user_message=log),
                            save=True)

            if ca.date_published:
                action = create_case_action("re-published advisory", self.request.user, ca.case, True)
            else:
                action = create_case_action("published advisory", self.request.user, ca.case, True)
                ca.date_published = timezone.now()
            ca.date_last_published = timezone.now()
            ca.save()

        return Response({}, status=status.HTTP_202_ACCEPTED)

    def create(self, request, *args, **kwargs):
        case = get_object_or_404(Case, case_id=self.kwargs['caseid'])

        #only case owners can create advisory
        if not is_case_owner(self.request.user, case.id):
            raise PermissionDenied()

        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            advisory, created = CaseAdvisory.objects.update_or_create(case=case)

            advisory.add_revision(AdvisoryRevision(user=self.request.user,
                                                   title=request.data['title'],
                                                   content=request.data['content'],
                                                   references=request.data.get('references'),
                                                   user_message=request.data.get('user_message', '')),
                                  save=True)

            if created:
                action = create_case_action("created initial case advisory draft", self.request.user, case)
            else:
                action = create_case_action("modified case advisory", self.request.user, case)

            serializer = self.serializer_class(instance=advisory.current_revision)
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            logger.debug(serializer.errors)
            return Response(serializer.errors,
                            status=status.HTTP_400_BAD_REQUEST)


class CSAFAdvisoryAPIView(generics.RetrieveAPIView):
    serializer_class = CSAFAdvisorySerializer
    permission_classes = (IsAuthenticated, PendingUserPermission, CaseAccessPermission)

    def get_view_name(self):
        return "Case Advisory in CSAF format"

    def get_object(self):
        caseid = self.kwargs['caseid']
        case = get_object_or_404(Case, case_id=caseid)
        return case

class VulVEXAPIView(generics.RetrieveAPIView):
    serializer_class = VEXSerializer
    permission_classes = (IsAuthenticated, PendingUserPermission, CaseObjectAccessPermission)

    def get_view_name(self):
        return "Vulnerability Status in VEX format"

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"user": self.request.user})
        return context

    def get_object(self):
        vul = get_object_or_404(Vulnerability, id=self.kwargs['pk'])
        self.check_object_permissions(self.request, vul.case)
        #this vulnerability also has to have some status associated with it.
        if self.request.user.is_coordinator:
            if ComponentStatus.objects.filter(vul=vul).exists():
                return vul
            else:
                raise Http404
        else:
            #can only get component status for this vulnerability for components this user
            #has access to
            my_components = my_components(self.request.user)
            if ComponentStatus.objects.filter(vul=vul, component__in=my_components).exists():
                return vul
            else:
                raise Http404

class AdviseFilterBackend(DjangoFilterBackend):
    def get_filterset_kwargs(self, request, queryset, view):
        kwargs = super().get_filterset_kwargs(request, queryset, view)
        if hasattr(view, 'get_filterset_kwargs'):
            kwargs.update(view.get_filterset_kwargs())

        return kwargs

class CaseAPIFilter(django_filters.FilterSet):

    owner = django_filters.MultipleChoiceFilter(
        field_name="owner",
        method="filter_owner",
        choices=[],
        label="owner"
    )

    status = django_filters.MultipleChoiceFilter(
        field_name="status",
        method="filter_status",
        choices=Case.STATUS_CHOICES,
        label="status"
    )

    owned = django_filters.BooleanFilter(
        field_name="owned",
        method="filter_my_cases",
        label="owned"
    )

    def filter_my_cases(self,queryset, name, value):
        #return cases owned  by me if staff, otherwise ignore
        if self.request.user.is_coordinator and value:
            cases = CaseParticipant.objects.filter(contact__user=self.request.user, role="owner").values_list('case')
            return queryset.filter(id__in=cases)
        else:
            return queryset

    def filter_owner(self, queryset, name, value):
        cases = CaseParticipant.objects.filter(contact__user__id__in=value, role="owner").values_list('case')
        #get all the cases owned by value, then filter the given queryset
        return queryset.filter(id__in=cases)

    def filter_status(self, queryset, name, value):
        return queryset.filter(status__in=value)

    def __init__(self, *args, **kwargs):
        super(CaseAPIFilter, self).__init__(*args, **kwargs)
        users = User.objects.filter(is_coordinator=True, is_active=True)
        self.filters["owner"].extra['choices'] = [(q.id, q.screen_name) for q in users]


def _search_cases(mycases, searchterm):
    search_query = None

    if searchterm:
        search_query = process_query(searchterm)

    cases = list(Case.objects.search_my_cases(mycases, search_query).values_list('id', flat=True))
    vuls = list(Vulnerability.objects.search_my_cases(mycases, search_query).values_list('case__id', flat=True))
    advisory = list(CaseAdvisory.objects.search_my_cases(mycases, search_query).values_list('case__id', flat=True))
    artifacts = list(CaseArtifact.objects.search_my_cases(mycases, searchterm).values_list('case__id', flat=True))
    case_list = cases + vuls + advisory + artifacts

    dedup = list(dict.fromkeys(case_list))

    return Case.objects.filter(id__in=dedup)

class CaseAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission, CaseObjectAccessPermission)
    lookup_field = "case_id"
    filterset_class=CaseAPIFilter
    pagination_class=StandardResultsPagination

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Case.objects.none()
        # get cases I have access to
        myc = my_cases(self.request.user)
        if self.request.GET.get('search'):
            return _search_cases(myc, self.request.GET['search'])
        return myc

    def get_serializer_class(self):
        if (self.kwargs.get('case_id')):
            case = get_object_or_404(Case, case_id=self.kwargs['case_id'])
            if self.request.user.is_coordinator:
                return CaseCoordinatorSerializer
            if case.status == Case.PENDING_STATUS:
                return PendingCaseSerializer
        return CaseSerializer

    def get_object(self):
        case = get_object_or_404(Case, case_id=self.kwargs['case_id'])
        self.check_object_permissions(self.request, case)
        return case

    def update(self, request, **kwargs):
        instance = self.get_object()
        #only case owners can update a case
        if not is_case_owner_or_staff(self.request.user, instance.id):
            raise PermissionDenied()

        data = request.data

        logger.debug(request.data)
        sc = self.get_serializer_class()
        serializer = sc(instance=instance, data=data, partial=True)
        if serializer.is_valid():
            action = create_case_action("modified case details", request.user, instance, True)
            for field, val in data.items():
                if (val != getattr(instance, field, None)):
                    if (field == "status"):
                        create_case_change(action, field, instance.get_status_display(), val);
                    else:
                        create_case_change(action, field, getattr(instance, field), val);
            serializer.save()
            logger.debug(serializer.data)
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            logger.debug(serializer.errors)
            return Response(serializer.errors,
                            status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        return Response({}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

class CasesView(LoginRequiredMixin, PendingTestMixin, generic.TemplateView):
    template_name = 'cvdp/searchcases.html'
    login_url = "authapp:login"
    model = Case

    def get_context_data(self, **kwargs):
        context = super(CasesView, self).get_context_data(**kwargs)
        context['status'] = [{"id": u[0], "name": u[1]} for u in Case.STATUS_CHOICES]
        if self.request.user.is_coordinator:
            context['owner'] = [{"id":u.id, "name":u.screen_name} for u in get_coordinators()]
        context['casepage']=1
        return context


class PostAPIView(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes= (IsAuthenticated, PendingUserPermission, CaseThreadObjectAccessPermission)
    search_fields = ['current_revision__content']
    pagination_class=StandardResultsPagination

    def get_view_name(self):
        return f"Case Posts"

    def get_object(self):
        obj = get_object_or_404(Post, id=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj.thread)
        return obj

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Post.objects.none()
        logger.debug(self.request.build_absolute_uri())
        logger.debug(f"host: {self.request.get_host()}")
        logger.debug(f"USE_X_FORWARDED_HOST: {settings.USE_X_FORWARDED_HOST}")
        if "HTTP_X_FORWARDED_HOST" in self.request.META:
            logger.debug(f"HTTP_X_FORWARDED_HOST: {self.request.META['HTTP_X_FORWARDED_HOST']}")
        if "HTTP_X_FORWARDED_PROTO" in self.request.META:
            logger.debug(f"HTTP_X_FORWARDED_PROTO: {self.request.META['HTTP_X_FORWARDED_PROTO']}")
        case = get_object_or_404(CaseThread, id=self.kwargs['pk'])
        self.check_object_permissions(self.request, case)
        if self.request.GET.get('pinned'):
            return Post.objects.filter(thread=case, current_revision__isnull=False).exclude(pinned=False).exclude(postreply__isnull=False).order_by('-created')
        else:
            return Post.objects.filter(thread=case, current_revision__isnull=False).exclude(pinned=True).exclude(postreply__isnull=False).order_by('-created')

    #TODO Implement destroy

    def update(self, request, **kwargs):
        logger.debug("IN POST UPDATE VIEW")
        instance = self.get_object()
        #only post author's and superusers can edit someone's post
        contact = get_object_or_404(Contact, user=self.request.user)
        if not(instance.author == contact or self.request.user.is_superuser):
            raise PermissionDenied()
        data = request.data
        logger.debug(request.data)
        if (instance.thread.archived):
            return Response({'error': 'This thread has been archived and is read-only.'},
                            status=status.HTTP_400_BAD_REQUEST)
        serializer = self.serializer_class(instance=instance, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            instance.current_revision.set_from_request(self.request)
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            logger.debug(serializer.errors)
            return Response(serializer.errors,
                            status=status.HTTP_400_BAD_REQUEST)

    def create(self, request, *args, **kwargs):
        logger.debug("IN POST CREATE VIEW")
        logger.debug(request.data)
        thread = get_object_or_404(CaseThread, id=self.kwargs['pk'])
        self.check_object_permissions(self.request, thread)
        if (thread.archived):
            return Response({'error': 'This thread has been archived and is read-only.'},
                            status=status.HTTP_400_BAD_REQUEST)
        contact = Contact.objects.filter(user=self.request.user).first()
        #get my group for case?
        groups = my_case_vendors(self.request.user, thread.case)
        post = Post(thread = thread,
                    author = contact)
        author_text = f"{self.request.user.screen_name}"
        if groups:
            post.group = groups[0]
            author_text = f"{author_text} from {groups[0].name}"
        #add some info about author in case user/group is ever removed - we can still
        # create a transcript of what happened/ who said what
        post.author_text = author_text
        post.save()
        post.add_revision(PostRevision(content=request.data['content']), save=True)
        if request.data.get('reply'):
            #this is a reply to another post
            parent = Post.objects.filter(id=request.data['reply']).first()
            #is this post a reply itself?
            old_pr = PostReply.objects.filter(post=parent).first()
            if old_pr:
                pt = old_pr.reply
            else:
                #create the thread
                pt, created = PostThread.objects.update_or_create(parent=parent)

            #create the reply
            pr = PostReply(reply=pt,
                           post=post)
            pr.save()
            serializer = self.serializer_class(parent)
        else:
            serializer = self.serializer_class(post)

        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

class ArchivedThreadView(viewsets.ModelViewSet):
    serializer_class = CaseThreadSerializer
    permission_classes = (IsAuthenticated, PendingUserPermission, CaseAccessPermission)

    def get_view_name(self):
        return f"Archived Case Threads"

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CaseThread.objects.none()

        case = get_object_or_404(Case, case_id=self.kwargs['caseid'])
        #todo only allow threads user has access to
        logger.debug("IN ARCHIVED CASETHREADAPIVIEW")
        my_threads = _my_case_threads(self.request.user, case)
        #get archived threads user has access to
        logger.debug(my_threads)
        return my_threads.filter(archived=True)


class CaseThreadAPIView(viewsets.ModelViewSet):
    serializer_class = CaseThreadSerializer
    permission_classes = (IsAuthenticated, PendingUserPermission, CaseObjectAccessPermission)

    def get_view_name(self):
        return f"Case Threads"

    def get_object(self):
        thread = get_object_or_404(CaseThread, id=self.kwargs['pk'])
        if is_my_case_thread(self.request.user, thread):
            return thread
        else:
            raise PermissionDenied

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CaseThread.objects.none()

        if self.kwargs.get('caseid'):
            case = get_object_or_404(Case, case_id=self.kwargs['caseid'])
            self.check_object_permissions(self.request, case)
            #todo only allow threads user has access to
            logger.debug("IN CASETHREADAPIVIEW")
            my_threads = _my_case_threads(self.request.user, case)
            if self.request.GET.get('official'):
                return my_threads.filter(case=case, archived=False, official=True)
            else:
                return my_threads.filter(case=case, archived=False)

    def destroy(self, request, *args, **kwargs):
        thread = get_object_or_404(CaseThread, id=self.kwargs['pk'])
        if not(is_case_owner_or_staff(self.request.user, thread.case.id)):
               raise PermissionDenied()

        if (thread.archived):
            #this thread is already archived, so unarchive
            thread.archived=False
            thread.save()
            return Response({}, status=status.HTTP_202_ACCEPTED)

        #check to see if this thread has posts?
        if Post.objects.filter(thread=thread).exists():
            #if so, we want to archive vs delete
            thread.archived=True
            thread.save()
            action = create_case_action(f"archived case thread with subject \"{thread.subject}\"",
                                        request.user, thread.case)
        else:
            thread.delete()
            action = create_case_action(f"deleted empty case thread with subject \"{thread.subject}\"",
                                        request.user, thread.case)

        return Response({}, status=status.HTTP_202_ACCEPTED)


    def create(self, request, *args, **kwargs):
        case = get_object_or_404(Case, case_id=self.kwargs['caseid'])

        if not(is_case_owner(self.request.user, case.id)):
            raise PermissionDenied()
        logger.debug(f"IN CREATE THREAD {self.request.POST}")
        subject = self.request.POST.get('subject')
        if subject:
            ct = CaseThread(case=case,
                            created_by=self.request.user,
                            subject=subject)
            ct.save()

            #add the person that created it!
            cp = CaseParticipant.objects.filter(contact__user=self.request.user).first()
            ctp = CaseThreadParticipant(thread=ct,
                                        participant=cp,
                                        added_by=self.request.user)
            ctp.save()


            serializer = CaseThreadSerializer(ct)

            action = create_case_action(f"created new case thread with subject \"{subject}\"",
                                        request.user, case)

            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            logger.debug("NEEEEEED A SUBJECT")
            return Response({'error': 'subject is required'},
                            status=status.HTTP_400_BAD_REQUEST)



class CaseParticipantAPIView(viewsets.ModelViewSet):
    serializer_class = CaseParticipantSerializer
    permission_classes = (IsAuthenticated, PendingUserPermission, CaseObjectAccessPermission)
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['role']

    def get_view_name(self):
        return f"Case Participants"

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        if not self.request.user.is_coordinator:
            #fields to DROP
            kwargs['fields'] = ['id', 'added_by', 'added', 'notified', 'roles_available', 'uuid']

        return serializer_class(*args, **kwargs)

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CaseParticipant.objects.none()

        logger.debug("IN CASE PARTICIPANT API");
        c = get_object_or_404(Case, case_id=self.kwargs['caseid'])
        self.check_object_permissions(self.request, c)
        if self.request.user.is_coordinator:
            return CaseParticipant.objects.filter(case=c).order_by('contact__name')
        else:
            return CaseParticipant.objects.filter(case=c).exclude(notified__isnull=True).order_by('contact__name')

    def get_object(self):
        obj = get_object_or_404(CaseParticipant, id=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj.case)
        return obj

    def update(self, request, **kwargs):
        logger.debug("IN UPDATE")
        instance = self.get_object()
        logger.debug("updating case participant")
        data = request.data
        logger.debug(request.data)
        serializer = self.serializer_class(instance=instance, data=data, partial=True)
        if serializer.is_valid():
            if request.data['role'] == 'owner':
                #doing this so we can send the assignment email
                cp = add_new_case_participant(instance.case.official_thread, instance.contact.uuid, request.user, request.data['role'])
                action = create_case_action(f"assigned {instance.name} to case", request.user, instance.case)
                action.participant=instance
                action.save()
            else:
                action = create_case_action(f"updated case participant {instance.name}", request.user, instance.case)
                action.participant=instance
                action.save()
                for field, val in data.items():
                    if (val != getattr(instance, field, None)):
                        create_case_change(action, field, getattr(instance, field), val);
                serializer.save()

            #get updated object
            instance = CaseParticipant.objects.get(id=instance.id)
            serializer = self.get_serializer(instance)
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            logger.debug(serializer.errors)
            return Response(serializer.errors,
                            status=status.HTTP_400_BAD_REQUEST)

    def create(self, request, *args, **kwargs):
        logger.debug(self.request.POST)
        case = get_object_or_404(Case, case_id=self.kwargs['caseid'])
        self.check_object_permissions(request, case)
        names = self.request.POST.getlist('names[]', [])
        role = self.request.POST.get('role', 'supplier')
        role = role.lower()
        if not(any(role in i for i in CaseParticipant.CASE_ROLES)):
            return Response({'error': 'Invalid Role'},
                            status=status.HTTP_400_BAD_REQUEST)
        thread = CaseThread.objects.filter(case=case, official=True).first()
        added = []
        for n in names:
            try:
                cp = add_new_case_participant(thread, n, self.request.user, role)
                if cp:
                    added.append(cp.name)
            except InvalidRoleException as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        if added:
            action = create_case_action(f"added participants to case: {(', ').join(added)}", request.user, case)
        return Response({}, status=status.HTTP_202_ACCEPTED)

    def destroy(self, request, *args, **kwargs):
        participant = self.get_object()
        self.check_object_permissions(request, participant.case)
        action = create_case_action(f"removed participant {participant.name} from case", request.user, participant.case)
        # get all threads
        threads = CaseThreadParticipant.objects.filter(participant=participant)
        for t in threads:
            t.delete()

        participant.delete()
        return Response({}, status=status.HTTP_202_ACCEPTED)


class CaseParticipantSummaryAPIView(generics.GenericAPIView):
    permission_classes = (IsAuthenticated, PendingUserPermission, CaseObjectAccessPermission)
    serializer_class = CaseParticipantSummarySerializer

    def get_view_name(self):
        return "Case Participant Summary View"

    def summarize(self, request, *args, **kwargs):
        # make sure the filters of the parent class get applied
        queryset = self.filter_queryset(self.get_queryset())
        # do summary stuff here
        stats = {'count': queryset.count(),
                 'notified': queryset.filter(notified__isnull=False).count(),
                 'vendors': queryset.filter(role='supplier').count()}
        return Response(stats)

    def get_queryset(self):
        c = get_object_or_404(Case, case_id=self.kwargs['caseid'])
        if self.request.user.is_coordinator:
            return CaseParticipant.objects.filter(case=c)
        else:
            return CaseParticipant.objects.filter(case=c).exclude(notified__isnull=True)

    def get(self, request, *args, **kwargs):
        logger.debug("IN CASE PARTICIPANT SUMMARY API");
        c = get_object_or_404(Case, case_id=self.kwargs['caseid'])
        self.check_object_permissions(self.request, c)
        return self.summarize(request, *args, **kwargs)


class CaseThreadParticipantAPIView(viewsets.ModelViewSet):
    serializer_class = CaseThreadParticipantSerializer
    permission_classes = (IsAuthenticated, PendingUserPermission, CaseThreadObjectAccessPermission)

    def get_view_name(self):
        return f"Case Thread Participants"

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CaseThreadParticipant.objects.none()
        logger.debug("IN THREADAPI");
        casethread = get_object_or_404(CaseThread, id=self.kwargs['pk'])
        self.check_object_permissions(self.request, casethread)
        ret= CaseThreadParticipant.objects.filter(thread=casethread).order_by('participant__title')
        return ret

    def create(self, request, *args, **kwargs):
        logger.debug(self.request.POST)
        thread = get_object_or_404(CaseThread, id=self.kwargs['pk'])
        if not(is_case_owner_or_staff(request.user, thread.case.id)):
            #only case owners can add participants to a thread
            raise PermissionDenied
        names = self.request.POST.getlist('names[]', [])

        role = self.request.POST.get('role', None)

        if thread.official and not role:
            role = 'supplier' #set default
            
        if (role):
            role = role.lower()

            if not(any(role in i for i in CaseParticipant.CASE_ROLES)):
                return Response({'error': 'Invalid Role'},
                                status=status.HTTP_400_BAD_REQUEST)
        added = []
        for n in names:
            try:
                cp = add_new_case_participant(thread, n, self.request.user, role)
                if cp:
                    added.append(cp.name)
            except InvalidRoleException as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if thread.official:
            if role == "owner":
                title = f" assigned {(', ').join(added)} to the case"
            elif len(added) > 1:
                title = f"added {role}s to case: {(', ').join(added)}"
            else:
                title = f"added {added[0]} to case as {role}."
        else:
            if len(added) >  1:
                title = f"added participant to case thread \"{thread.subject}\": {(', ').join(added)}"
            else:
                title = f"added {added[0]} to case thread \"{thread.subject}\"."

        action = create_case_action(title, request.user, thread.case)

        return Response({}, status=status.HTTP_202_ACCEPTED)

    def destroy(self, request, *args, **kwargs):
        participant = get_object_or_404(CaseThreadParticipant, id=self.kwargs['pk'])
        if not(is_case_owner_or_staff(request.user, participant.thread.case.id)):
            raise PermissionDenied()

        if participant.thread.official:
            #this is the official thread, so remove from Case too
            action = create_case_action(f"removed participant {participant.participant.name} from case", request.user, participant.thread.case)
            participant.participant.delete()
        else:
            action = create_case_action(f"removed participant {participant.participant.name} from case thread \"{thread.subject}\"", request.user, participant.thread.case)
            participant.delete()
        return Response({}, status=status.HTTP_202_ACCEPTED)

class UserCaseStateAPIView(generics.RetrieveAPIView):
    serializer_class = UserCaseStateSerializer
    permission_classes = (IsAuthenticated, PendingUserPermission, CaseAccessPermission)

    def get_view_name(self):
        return f"User Case State"

    def get_object(self):
        user = self.request.user
        contact = get_object_or_404(Contact, user__id=user.id)
        #get case last viewed state
        case = get_object_or_404(Case, case_id=self.kwargs['caseid'])
        role = my_case_role(user, case)
        logger.debug(f"{self.request.user.screen_name} is {role}")
        status_needed = False
        if (role != "owner" and user.is_coordinator):
            #this is a special role - because coordinators should be able to do
            # some special editing things, like inital assignment,
            role = "coordinator"
        elif (role == "supplier"):
            status_needed = get_status_status(case, user)
        cv = CaseViewed.objects.filter(case=case, user=user).first()
        if (cv):
            cs = UserCaseState(user, contact.uuid, cv.date_viewed, role, status_needed)
        else:
            cs = UserCaseState(user, contact.uuid, None, role, status_needed)

        #update time viewed
        cviewed, created = CaseViewed.objects.update_or_create(case=case, user=user,
                                                               defaults={'date_viewed':timezone.now})
        return cs


class PostDiffView(LoginRequiredMixin, UserPassesTestMixin, generic.DetailView):
    model = PostRevision
    pk_url_kwarg = 'revision_id'
    login_url = "authapp:login"
    template_name = "cvdp/postdiff.html"

    def test_func(self):
        revision = self.get_object()
        thread = revision.post.thread
        return is_my_case_thread(self.request.user, thread) and PendingTestMixin.test_func(self)

    def get(self, request, *args, **kwargs):
        revision = self.get_object()

        context = {"next_revision": "", "previous_revision": "", "revision_number": revision.revision_number, "last_modified": timesince(revision.modified)}

        other_revision = revision.previous_revision

        baseText = other_revision.content if other_revision is not None else ""
        newText = revision.content

        differ = difflib.Differ(charjunk=difflib.IS_CHARACTER_JUNK)
        diff = differ.compare(
            baseText.splitlines(keepends=True), newText.splitlines(keepends=True)
        )
        if revision.previous_revision:
            context['previous_revision'] = revision.previous_revision.id

        if revision.revision_number < revision.post.current_revision.revision_number:
            nextrev = PostRevision.objects.filter(revision_number=revision.revision_number+1, post=revision.post).first()
            if nextrev:
                context['next_revision'] = nextrev.id
        context['diff'] = list(diff)
        data = json.dumps(context)
        mimetype = 'application/json'
        return HttpResponse(data, mimetype)


class CWEAPIView(viewsets.ModelViewSet):
    serializer_class = CWESerializer
    permission_classes = (IsAuthenticated, PendingUserPermission, CoordinatorPermission)

    def get_view_name(self):
        return "Get available CWE descriptions"

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CWEDescriptions.objects.none()

        return CWEDescriptions.objects.all()

class VulAPIView(viewsets.ModelViewSet):
    serializer_class = VulSerializer
    permission_classes = (IsAuthenticated, PendingUserPermission, CaseObjectAccessPermission)

    def get_view_name(self):
        return f"Case Vulnerabilities"

    def list(self, request, *args, **kwargs):
        content = self.get_queryset()
        return Response(self.serializer_class(content, many=True,
                                           context={'user': request.user}).data)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"user": self.request.user})
        return context

    def get_queryset(self):
        logger.debug("IN VULS API");
        if getattr(self, 'swagger_fake_view', False):
            return Vulnerability.objects.none()

        case = get_object_or_404(Case, case_id=self.kwargs['caseid'])
        self.check_object_permissions(self.request, case)
        return Vulnerability.objects.filter(case=case, deleted=False)

    def get_object(self):
        object = get_object_or_404(Vulnerability, id=self.kwargs['pk'])
        self.check_object_permissions(self.request, object.case)
        return object

    def create(self, request, *args, **kwargs):
        logger.debug("IN VUL CREATE VIEW")
        logger.debug(request.data)

        case = get_object_or_404(Case, case_id=self.kwargs['caseid'])
        self.check_object_permissions(request, case)
        if request.data.get('cve'):
            if request.data['cve'].lower().startswith('cve-'):
                cve = request.data['cve'][4:]
            else:
                cve = request.data['cve']

            if Vulnerability.objects.filter(case=case, cve=cve).exists():
                return Response({'detail':'CVE already exists for this case.'}, status=status.HTTP_400_BAD_REQUEST)
        data = request.data
        data['case'] = self.kwargs['caseid']
        serializer = self.serializer_class(data=data)
        if serializer.is_valid():
            vul = serializer.save(case=case)
            vul.user=self.request.user
            vul.save()
            """
            vul = Vulnerability(case=case,
                                cve=cve,
                                user=self.request.user,
                                description=request.data.get('description'))
            vul.save()
            """
            action = create_case_action("added new vulnerability", request.user, case, True)
            action.vulnerability = vul
            action.save()
            #serializer = self.serializer_class(vul)
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, **kwargs):
        logger.debug("IN VUL UPDATE VIEW")
        instance = get_object_or_404(Vulnerability, id=self.kwargs['pk'])
        self.check_object_permissions(request, instance.case)
        data = request.data
        if data.get('tags'):
            for tag in data['tags']:
                tag, created = VulnerabilityTag.objects.update_or_create(vulnerability=instance, tag=tag,
                                                                             defaults={'user':self.request.user})

        logger.debug(request.data)
        serializer = self.serializer_class(instance=instance, data=data, partial=True)
        if serializer.is_valid():
            action = create_case_action("modified vulnerability details", request.user, instance.case, True)
            action.vulnerability = instance
            action.save()
            for field, val in data.items():
                try:
                    oldval = getattr(instance, field)
                except AttributeError:
                    continue
                if (val != oldval):
                    create_case_change(action, field, getattr(instance, field), val);

            serializer.save()
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            logger.debug(serializer.errors)
            return Response(serializer.errors,
	                    status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        vul = get_object_or_404(Vulnerability, id=self.kwargs['pk'])
        self.check_object_permissions(request, vul.case)
        action = create_case_action(f"deleted vulnerability {vul.vul}", request.user, vul.case, True)
        action.vulnerability = vul
        action.save()

        if vul.case.status == Case.PENDING_STATUS:
            vul.delete()
        else:
            vul.deleted=True
            vul.save()

        return Response({}, status=status.HTTP_202_ACCEPTED)


class UploadPostFile(LoginRequiredMixin, UserPassesTestMixin, generic.TemplateView):
    login_url = "authapp:login"
    template_name='cvdp/notemplate.html'

    def test_func(self):
        casethread = get_object_or_404(CaseThread, id=self.kwargs['pk'])
        if is_my_case_thread(self.request.user, casethread):
            return True
        return False

    def post(self, request, *args, **kwargs):
        casethread = get_object_or_404(CaseThread, id=self.kwargs['pk'])
        logger.debug(f"Files Post: {self.request.FILES}")

        artifact = add_artifact(self.request.FILES['image'])
        ca = ThreadArtifact(file=artifact,
                            thread=casethread,
                            user=self.request.user)
        ca.save()
        url = reverse("cvdp:artifact", args=[ca.file.uuid])
        return JsonResponse({'status': 'success', 'image_url': url}, status=200)


class CaseArtifactAPIView(viewsets.ModelViewSet):
    serializer_class = ArtifactSerializer
    permission_classes = (IsAuthenticated, PendingUserPermission, CaseObjectAccessWritePermission)

    def get_view_name(self):
        return f"Case Artifacts"

    def list(self, request, *args, **kwargs):
        content = self.get_queryset()
        logger.debug("IN GET CASE A")
        return Response(self.serializer_class(content, many=True,
                                           context={'user': request.user}).data)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"user": self.request.user})
        return context

    def update(self, request, **kwargs):
        logger.debug(f"IN CASE ARTIFACT PATCH {self.kwargs['uuid']}")
        ca = get_object_or_404(CaseArtifact, file__uuid=self.kwargs['uuid'])
        self.check_object_permissions(request, ca.case)
        #only coordinators can change permissions
        if not(request.user.is_coordinator):
            raise PermissionDenied()


        if ca.shared:
            action = create_case_action(f"unshared artifact {ca.file.filename}", request.user, ca.case)
            ca.shared=False
            ca.save()
        else:
            ca.shared=True
            action = create_case_action(f"shared artifact {ca.file.filename}", request.user, ca.case, True)
            ca.save()

        action.artifact = ca
        action.save()

        return Response({}, status=status.HTTP_202_ACCEPTED)

    def get_object(self):
        ca = get_object_or_404(CaseArtifact, file__uuid=self.kwargs['uuid'])
        logger.debug(f"IN CASE ARTIFACT!!! {ca.file.file.size}")

        self.check_object_permissions(self.request, ca.case)
        return ca

    def get_queryset(self):
        logger.debug("IN Artifact API");
        if getattr(self, 'swagger_fake_view', False):
            return CaseArtifact.objects.none()
        if self.kwargs.get('caseid'):
            case = get_object_or_404(Case, case_id=self.kwargs['caseid'])
            self.check_object_permissions(self.request, case)
            if self.request.user.is_coordinator:
                return CaseArtifact.objects.filter(case=case).order_by('-action__created')
            return CaseArtifact.objects.filter(case=case, shared=True).order_by('-action__created')

    def create(self, request, *args, **kwargs):
        logger.debug("IN ARTIFACT CREATE VIEW")
        logger.debug(request.data)
        logger.debug(request.FILES)
        case = get_object_or_404(Case, case_id=self.kwargs['caseid'])
        self.check_object_permissions(request, case)

        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            logger.debug("SERIALIZER WOOOOOOT");
            artifact = add_artifact(request.data['file'])
            action = create_case_action(f"uploaded document", self.request.user, case)
            b_action = Action.objects.get(id=action.action_ptr_id)
            ca = CaseArtifact(action=b_action,
                         file=artifact,
                         case=case)
            #by default any file shared by a non-coordinator is shared with the group
            if not(self.request.user.is_coordinator):
                ca.shared=True
                #also share activity
                action.action_type=1
                action.save()

            ca.save()

            serializer = ArtifactSerializer(ca, context={'user': request.user})
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            return Response(serializer.errors,
                            status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        #get artifact
        ca = get_object_or_404(CaseArtifact, file__uuid=self.kwargs['uuid'])
        if request.user.is_superuser or request.user.is_staff:
            action = create_case_action(f"deleted artifact {ca.file.filename}", request.user, ca.case)
            ca.delete()
            return Response({}, status=status.HTTP_202_ACCEPTED)
        if (ca.action.user == request.user):
            ca.shared=False
            action = create_case_action(f"unshared artifact {ca.file.filename}", request.user, ca.case)
            ca.save()
            #TODO - ADD AUDIT LOG
            return Response({}, status.HTTP_202_ACCEPTED)
        if (is_case_owner_or_staff(self.request.user, ca.case.id)):
            ca.shared=False
            action = create_case_action(f"unshared artifact {ca.file.filename}", request.user, ca.case)
            ca.save()
            return Response({}, status.HTTP_202_ACCEPTED)
        raise PermissionDenied()


class ArtifactTransferAPIView(viewsets.ModelViewSet):
    serializer_class = ArtifactSerializer
    permission_classes = (IsAuthenticated, CaseTransferAccessPermission)

    def create(self, request, *args, **kwargs):
        logger.debug(f"{self.__class__.__name__} post: {self.request.data}")
        logger.debug("IN ARTIFACT Transfer VIEW")
        logger.debug(request.FILES)
        case = get_object_or_404(Case, case_id=self.kwargs['caseid'])

        #get connection
        connection = AdVISEConnection.objects.filter(incoming_key=request.user.auth_token).first()

        if not request.FILES:
            return Response({'detail': 'No files present'},
                            status=status.HTTP_400_BAD_REQUEST)

        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            logger.debug(request.data['file'])
            fname = smart_str(request.data['file'].name)
            logger.debug(f"size {request.data['file'].size}")
            logger.debug(fname)
            if CaseArtifact.objects.filter(file__filename=fname, case=case).exists():
                return Response({'detail': f'File {fname} already transferred'}, status=status.HTTP_400_BAD_REQUEST)

            if connection:
                action = create_case_action(f"transferred document: {fname} from {connection.group.name}",
                                            self.request.user, case)

            else:
                #TODO: REMOVE THIS
                action = create_case_action(f"Group transferred document {fname}",
                                            self.request.user, case)

                """action = Action(title=f"Group transferred document: {fname}",
                                user=self.request.user)

                action.save()"""

            file = request.data['file']
            artifact = add_artifact(file)

            b_action = Action.objects.get(id=action.action_ptr_id)

            ca = CaseArtifact(action=b_action,
                              file=artifact,
                              case=case)
            ca.save()
            logger.debug("ADDED ARTIFACT")

            return Response({}, status=status.HTTP_202_ACCEPTED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ThreadTransferAPIView(viewsets.ModelViewSet):
    serializer_class = PostTransferSerializer
    permission_classes = (IsAuthenticated, CaseTransferAccessPermission)

    def create(self, request, *args, **kwargs):
        logger.debug("IN THREAD TRANSFER VIEW")
        logger.debug(request.data)

        case = get_object_or_404(Case, case_id=self.kwargs['caseid'])
        if not(request.data.get('posts')):
            return Response({'detail': 'posts are required'}, status=status.HTTP_400_BAD_REQUEST)
        #confirm thread hasn't already been transferred
        prev = CaseThread.objects.filter(case=case, subject="Transferred Case Thread").first()
        if prev:
            return Response({'detail': 'Thread has already been transferred'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            serializer = self.serializer_class(data=request.data['posts'], many=True)
            if serializer.is_valid():
                #create the case thread
                ct = CaseThread(case=case,
                                created_by=self.request.user,
                                subject="Transferred Case Thread",
                                archived=True)
                ct.save()
                for p in request.data['posts']:
                    post = Post(thread=ct,
                                author_text=p['author'],
                                created=p['created'])
                    post.save()
                    post.add_revision(PostRevision(content=p['content']), save=True)
                    if p.get('replies'):
                        for r in p['replies']:
                            s = self.serializer_class(data=r)
                            if s.is_valid():
                                pr = Post(thread=ct,
                                          author_text=r['author'],
                                          created=r['created'])
                                pr.save()
                                pr.add_revision(PostRevision(content=r['content']), save=True)
                                pt, created = PostThread.objects.update_or_create(parent=post)
                                pr = PostReply(reply=pt, post=pr)
                                pr.save()
                            else:
                                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

                create_case_action(f"transferred case thread with {len(request.data['posts'])} posts", request.user, case)
                return Response({}, status=status.HTTP_202_ACCEPTED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except:
            logger.debug(traceback.format_exc())
            return Response({'detail': 'An error occurred during transfer.'},
                            status=status.HTTP_400_BAD_REQUEST)


class StatusTransferAPIView(viewsets.ModelViewSet):
    serializer_class = VEXUploadSerializer
    permission_classes = (IsAuthenticated, CaseTransferAccessPermission)

    def create(self, request, *args, **kwargs):
        logger.debug(f"{self.__class__.__name__} post: {self.request.data}")
        logger.debug("IN STATUS TRANSFER VIEW")
        case = get_object_or_404(Case, case_id=self.kwargs['caseid'])
        if not request.data.get('vex'):
            return Response({'detail': 'vex is required field'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.serializer_class(data=request.data['vex'])
        if serializer.is_valid():
            #get connection
            connection = AdVISEConnection.objects.filter(incoming_key=request.user.auth_token).first()
            if connection:
                action = create_case_action(f"transferred status from {connection.group.name}", self.request.user, case)
            else:
                action = create_case_action(f"uploaded status", self.request.user, case)
            cs = ComponentStatusUpload(vex=request.data['vex'],
                                       user=self.request.user,
                                       case=case)
            cs.save()

            return Response({}, status=status.HTTP_202_ACCEPTED)
        else:
            print(serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VulTransferAPIView(viewsets.ModelViewSet):
    serializer_class = VulSerializer
    permission_classes = (IsAuthenticated, CaseTransferAccessPermission)

    def create(self, request, *args, **kwargs):
        logger.debug("IN VUL TRANSFER VIEW")
        logger.debug(request.data)
        case = get_object_or_404(Case, case_id=self.kwargs['caseid'])
        try:
            #make sure description exists, before saving anything
            for vul in request.data:
                if not vul.get('description'):
                    return Response({'description': 'This field is required'}, status=status.HTTP_400_BAD_REQUEST)

            for vul in request.data:
                cve = None
                if vul.get('cve'):
                    if vul['cve'].lower().startswith('cve-'):
                        cve = vul['cve'][4:]
                    else:
                        cve = vul['cve']
                    #don't replace an already exisiting CVE
                    old_vul = Vulnerability.objects.filter(cve=cve, case=case).first()
                    if old_vul:
                        return Response({'detail': 'Vul already exists.'}, status=status.HTTP_400_BAD_REQUEST)
                vul = Vulnerability(case=case,
                                    cve=cve,
                                    user=self.request.user,
                                    description=vul.get('description'))
                vul.save()
                action = create_case_action("transferred new vulnerability", request.user, case, True)
                action.vulnerability = vul
                action.save()
                serializer = self.serializer_class(vul)

            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

        except:
            logger.debug(traceback.format_exc())
            return Response({'detail': 'Invalid format'}, status=status.HTTP_400_BAD_REQUEST)


class AdvisoryTransferAPIView(viewsets.ModelViewSet):
    serializer_class = AdvisorySerializer
    permission_clases = (IsAuthenticated, CaseTransferAccessPermission)

    def create(self, request, *args, **kwargs):
        logger.debug("IN ADVISORY TRANSFER VIEW")
        logger.debug(request.data)
        case = get_object_or_404(Case, case_id=self.kwargs['caseid'])
        try:
            serializer = self.serializer_class(data=request.data)
            if serializer.is_valid():
                advisory, created = CaseAdvisory.objects.update_or_create(case=case)

                advisory.add_revision(AdvisoryRevision(user=self.request.user,
                                                       title=request.data['title'],
                                                       content=request.data['content'],
                                                       references=request.data.get('references'),
                                                       user_message=request.data.get('user_message', '')),
                                  save=True)

                if created:
                    action = Action(title="transferred initial Advisory draft",
                                    user=self.request.user)
                else:
                    action = Action(title="transferred new version of Advisory",
                                    user=self.request.user)

                action.save()
                serializer = self.serializer_class(instance=advisory.current_revision)
                return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
            else:
                logger.debug(serializer.errors)
                return Response(serializer.errors,
                                status=status.HTTP_400_BAD_REQUEST)
        except:
            return Response({'detail': 'error occurred during transfer'},
                            status=status.HTTP_400_BAD_REQUEST)

class ScoreVulCVSSView(LoginRequiredMixin, UserPassesTestMixin, FormView):
    form_class = CVSSForm
    login_url = "authapp:login"
    template_name = "cvdp/cvss.html"

    def test_func(self):
        vul = get_object_or_404(Vulnerability, id=self.kwargs['pk'])
        return is_case_owner_or_staff(self.request.user, vul.case.id)

    def get_context_data(self, **kwargs):
        context = super(ScoreVulCVSSView, self).get_context_data(**kwargs)
        vul = get_object_or_404(Vulnerability, id=self.kwargs['pk'])
        vulcvss = VulCVSS.objects.filter(vul=vul).first()
        if vulcvss:
            context['form'] = CVSSForm(instance=vulcvss)
        else:
            context['form'] = CVSSForm()

        return context


class CVSSVulView(viewsets.ModelViewSet):
    serializer_class = CVSSSerializer
    permission_classes= (IsAuthenticated, PendingUserPermission, CaseObjectAccessPermission)

    def get_view_name(self):
        return f"Vul CVSS Score"

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return VulCVSS.objects.none

    def get_object(self):
        obj = get_object_or_404(VulCVSS, vul=self.kwargs.get('pk'))
        self.check_object_permissions(self.request, obj.vul.case)
        return obj

    def create(self, request, *args, **kwargs):
        logger.debug(request.data)

        vul = get_object_or_404(Vulnerability, id=self.kwargs.get('pk'))
        self.check_object_permissions(request, vul.case)
        logger.debug(request.data)
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            vcvss = VulCVSS(vul=vul, scored_by=self.request.user, **serializer.validated_data)
            logger.debug(vcvss)
            vcvss.save()
            action = create_case_action(f"scored vulnerability (CVSS) {vul.vul}", request.user, vul.case, True)
            action.vulnerability=vul
            action.save()

            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        logger.debug(serializer.errors)
        return Response(serializer.errors,
                        status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        vul = get_object_or_404(Vulnerability, id=self.kwargs.get('pk'))
        if not(is_case_owner_or_staff(request.user, vul.case.id)):
            raise PermissionDenied()
        vcvss = VulCVSS.objects.filter(vul=vul).first()
        if vcvss:
            action = create_case_action(f"removed CVSS Score for vulnerability {vul.vul}", request.user, vul.case)
            action.vulnerability=vul
            action.save()
            vcvss.delete()
            return Response({}, status=status.HTTP_202_ACCEPTED)
        return Response({}, status.HTTP_400_BAD_REQUEST)

    def update(self, request, **kwargs):
        vul = get_object_or_404(Vulnerability, id=self.kwargs.get('pk'))
        if not(is_case_owner_or_staff(request.user, vul.case.id)):
            raise PermissionDenied()
        logger.debug(request.data)
        serializer = self.serializer_class(instance=vul.vulcvss, data=request.data, partial=True)
        if serializer.is_valid():
            action = create_case_action(f"modified CVSS score for vulnerability {vul.vul}", request.user, vul.case, True)
            action.vulnerability=vul
            action.save()
            oldscore = vul.vulcvss.score
            oldvector = vul.vulcvss.vector
            x = serializer.save()
            x.scored_by = self.request.user
            x.save()
            if oldscore != x.score:
                create_case_change(action, "score", oldscore, x.score)
            if oldvector != x.vector:
                create_case_change(action, "vector", oldvector, x.vector)
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        logger.debug(serializer.errors)
        return Response(serializer.errors,
                        status=status.HTTP_400_BAD_REQUEST)

class SSVCVulView(viewsets.ModelViewSet):
    serializer_class = SSVCSerializer
    permission_classes = (IsAuthenticated, PendingUserPermission, CaseObjectAccessPermission)

    def get_view_name(self):
        return f"Vul SSVC Score"

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return VulSSVC.objects.none()

    def get_object(self):
        obj = get_object_or_404(VulSSVC, vul=self.kwargs.get('pk'))
        self.check_object_permissions(self.request, obj.vul.case)
        return obj

    def create(self, request, *args, **kwargs):
        logger.debug(request.data)

        vul = get_object_or_404(Vulnerability, id=self.kwargs.get('pk'))
        if not (is_case_owner_or_staff(request.user, vul.case.id)):
            raise PermissionDenied()

        logger.debug(request.data)
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            ssvc = VulSSVC(vul=vul, user=self.request.user, **serializer.validated_data)
            logger.debug(ssvc)
            ssvc.save()
            action = create_case_action(f"scored vulnerability (SSVC) {vul.vul}", request.user, vul.case, True)
            action.vulnerability=vul
            action.save()
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        logger.debug(serializer.errors)
        return Response(serializer.errors,
                        status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        vul = get_object_or_404(Vulnerability, id=self.kwargs.get('pk'))
        if not(is_case_owner_or_staff(request.user, vul.case.id)):
            raise PermissionDenied()

        vcvss = VulSSVC.objects.filter(vul=vul).first()
        if vcvss:
            action = create_case_action(f"removed SSVC score for vulnerability {vul.vul}", request.user, vul.case)
            action.vulnerability=vul
            action.save()
            vcvss.delete()
            return Response({}, status=status.HTTP_202_ACCEPTED)
        return Response({}, status.HTTP_400_BAD_REQUEST)

    def update(self, request, **kwargs):
        vul = get_object_or_404(Vulnerability, id=self.kwargs.get('pk'))
        if not(is_case_owner_or_staff(request.user, vul.case.id)):
            raise PermissionDenied()
        logger.debug(request.data)
        #does ssvc score exist?
        if VulSSVC.objects.filter(vul=vul).exists():
            serializer = self.serializer_class(instance=vul.vulssvc, data=request.data, partial=True)
            if serializer.is_valid():
                olddecision=vul.vulssvc.final_decision
                x = serializer.save()

                action = create_case_action(f"modified SSVC score for vulnerability {vul.vul}", request.user, vul.case, True)
                action.vulnerability=vul
                action.save()

                if olddecision != x.final_decision:
                    create_case_change(action, "final_decision", olddecision, x.final_decision)
                x.user = self.request.user
                x.last_edit = timezone.now()
                x.save()
                return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
            logger.debug(serializer.errors)
            return Response(serializer.errors,
			    status=status.HTTP_400_BAD_REQUEST)
        else:
            serializer = self.serializer_class(data=request.data)
            if serializer.is_valid():
                ssvc = VulSSVC(vul=vul, user=self.request.user, **serializer.validated_data)
                logger.debug(ssvc)
                ssvc.save()
                action = create_case_action(f"scored vulnerability (SSVC) {vul.vul}", request.user, vul.case, True)
                action.vulnerability=vul
                action.save()
                return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
            logger.debug(serializer.errors)
            return Response(serializer.errors,
                            status=status.HTTP_400_BAD_REQUEST)

class NotifyVendorsView(LoginRequiredMixin, UserPassesTestMixin, generic.TemplateView):
    login_url = "authapp:login"
    template_name = 'cvdp/notmpl.html'
    #http_method_names=['post']

    def test_func(self):
        case = get_object_or_404(Case, case_id=self.kwargs.get('caseid'))
        return is_case_owner_or_staff(self.request.user, case.id)


    def post(self, request, *args, **kwargs):
        logger.debug(f"{self.__class__.__name__} post: {self.request.POST}")
        case = get_object_or_404(Case, case_id=self.kwargs.get('caseid'))
        participants = self.request.POST.getlist('participants[]', None)

        subject = self.request.POST.get('subject', None)
        content = self.request.POST.get('content', None)

        if not participants and "all" in request.path:
            #get all participants that haven't been notified
            participants = CaseParticipant.objects.filter(case=case).exclude(notified__isnull=False).values_list('id', flat=True)

        if not participants or not subject or not content:
            return JsonResponse({'message': 'participants, subject, and content required'}, status=400)

        part_list = []
        for p in participants:
            cp = get_object_or_404(CaseParticipant, id=p)
            notify_case_participant(cp, subject, content, self.request.user)
            part_list.append(cp.name)

        action = create_case_action(f"notified participants: {', '.join(part_list)}", self.request.user, case)

        return JsonResponse({'message': 'success'}, status=200)

class CaseActivityAPIView(APIView):
    serializer_class = CaseActionSerializer
    permission_classes = (IsAuthenticated, PendingUserPermission, CaseObjectAccessPermission)

    def get_view_name(self):
        return f"Case Activity"

    def get(self, request, *args, **kwargs):

        # -----------------------------------------------------------
        page_number = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 20)
        search = request.query_params.get('q', None)
        if search:
            search = search.lower()
        # -----------------------------------------------------------
        logger.debug(f"page_number is {page_number}")
        logger.debug(request.query_params)

        cases = []
        if self.kwargs.get('caseid'):
            case = get_object_or_404(Case, case_id=self.kwargs['caseid'])
            self.check_object_permissions(self.request, case)
            cases.append(case)
        else:
            # get all activity
            cases = my_cases(self.request.user)

        if self.request.user.is_coordinator:
            actions = CaseAction.objects.filter(case__in=cases)
            action_serializer = CaseActionSerializer(actions, many=True)
            case_actions = action_serializer.data

            posts = PostRevision.objects.filter(post__thread__case__in=cases)
            post_serializer = PostActionSerializer(posts, many=True)
            post_actions = post_serializer.data

            #this is now done through caes actions
            #advisory = AdvisoryRevision.objects.filter(advisory__case__in=cases)
            #advisory_serializer = AdvisoryActionSerializer(advisory, many=True)
            #advisory_actions = advisory_serializer.data

            status = StatusRevision.objects.filter(component_status__vul__case__in=cases)
            status_serializer = StatusActionSerializer(status, many=True)
            status_actions = status_serializer.data

        else:
            actions = CaseAction.objects.filter(case__in=cases, action_type=1)
            action_serializer = CaseActionSerializer(actions, many=True)
            case_actions = action_serializer.data

            #only get posts in threads this user has access to
            my_threads = _my_threads(request.user)
            posts = PostRevision.objects.filter(post__thread__in=my_threads)
            post_serializer = PostActionSerializer(posts, many=True)
            post_actions = post_serializer.data

            #only get advisory if shared
            #advisory = AdvisoryRevision.objects.filter(advisory__case__in=cases).exclude(date_shared__isnull=True)
            #advisory_serializer = AdvisoryActionSerializer(advisory, many=True)
            #advisory_actions = advisory_serializer.data

            status = StatusRevision.objects.filter(component_status__vul__case__in=cases, component_status__share=True)
            status_serializer =	StatusActionSerializer(status, many=True)
            status_actions = status_serializer.data


        #results = case_actions + post_actions + advisory_actions + status_actions
        results = case_actions + post_actions + status_actions
        qs = sorted(results,
                    key=lambda instance: instance['created'],
                    reverse=True)

        if (search):
            res = list(filter(lambda elem: search in [elem['title'].lower(), elem['user']['name'].lower()], qs))
            qs = res

        paginator = Paginator(qs, page_size)
        data = paginator.page(page_number)
        if data.has_next():
            next_page = data.next_page_number()
        else:
            next_page = None

        return Response({'results':data.object_list, 'next_page': next_page})

class GroupCasesAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission, CoordinatorPermission)
    serializer_class = CaseSerializer
    pagination_class=StandardResultsPagination

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Case.objects.none()
        # get cases group is involved in
        group = get_object_or_404(Group, groupprofile__uuid=self.kwargs.get('group'))
        cp = CaseParticipant.objects.filter(group=group).values_list('case__id', flat=True)
        return Case.objects.filter(id__in=cp)

class ContactCasesAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission, CoordinatorPermission)
    serializer_class = CaseSerializer
    pagination_class=StandardResultsPagination

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Case.objects.none()
        # get cases contact is involved in
        contact = get_object_or_404(Contact, uuid=self.kwargs.get('contact'))
        cp = CaseParticipant.objects.filter(contact=contact).values_list('case__id', flat=True)
        return Case.objects.filter(id__in=cp)

class ContactActivityAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission, CoordinatorPermission)
    serializer_class = CaseActionSerializer
    pagination_class=StandardResultsPagination

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Case.objects.none()
        # get cases contact is involved in
        contact = get_object_or_404(Contact, uuid=self.kwargs.get('contact'))
        if contact.user:
            return CaseAction.objects.filter(user=contact.user).order_by('-created')

        cp = CaseParticipant.objects.filter(contact=contact)
        return CaseAction.objects.filter(participant__in=cp).order_by('-created')


class CaseTransferAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, CoordinatorPermission)
    serializer_class = CaseTransferSerializer
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CaseTransfer.objects.none()
        if self.kwargs.get('caseid'):
            return CaseTransfer.objects.filter(action__case__case_id=self.kwargs['caseid'])
        return CaseTransfer.objects.all()

    def get_object(self):
        ct = get_object_or_404(CaseTransfer, id=self.kwargs['pk'])
        return ct

    def create(self, request, *args, **kwargs):
        logger.debug(request.data)
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            case = get_object_or_404(Case, case_id=request.data['case'])
            connection = get_object_or_404(AdVISEConnection, id=request.data['connection'])
            dt = request.data.get('data_transferred')
            if dt:
                dt = json.loads(dt)
            else:
                dt = ["case"]
            action = create_case_action(f"transferred {', '.join(dt)} to {connection.group.name}", request.user, case, True)
            action.save()

            ct = CaseTransfer(connection=connection,
                              action=action,
                              data_transferred = dt,
                              transfer_reason=request.data['transfer_reason'],
                              remote_case_id=request.data['remote_case_id'])
            ct.save()

            case.status=Case.INACTIVE_STATUS
            case.resolution = f'Transferred to {connection.group.name}'
            case.save()

            serializer = self.serializer_class(ct)

            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

        else:
            logger.debug(serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
