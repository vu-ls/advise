import os
from django.shortcuts import render
import re
import shlex
import logging
from itertools import chain
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.core.paginator import Paginator
from django.urls import reverse, reverse_lazy
from django.views import generic, View
from django.views.generic.edit import FormView, UpdateView, FormMixin, CreateView
from django.http import HttpResponse, Http404, JsonResponse, HttpResponseNotAllowed, HttpResponseServerError, HttpResponseForbidden, HttpResponseRedirect, HttpResponseBadRequest
from authapp.models import User
from django.core.exceptions import ValidationError, PermissionDenied
from django.utils.translation import gettext as _
from authapp.views import PendingTestMixin
from cvdp.lib import check_permissions
# Create your views here.
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
import traceback
from cvdp.forms import *
from rest_framework.views import APIView
from rest_framework import exceptions, generics, status, authentication, viewsets, mixins, filters
from cvdp.cases.views import StandardResultsPagination
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from cvdp.permissions import *
from cvdp.cases.serializers import *
from cvdp.groups.serializers import ContactSerializer, GroupSerializer
from cvdp.serializers import GenericSerializer, UserSerializer
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth import get_user_model
import json

User = get_user_model()

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

@login_required(login_url="authapp:login")
def assignable_users_api(request):
    if not request.user.is_coordinator:
        raise PermissionDenied
    ret_value = {}
    assignable_users = User.objects.filter(is_active=True, is_coordinator=True).order_by('screen_name').exclude(screen_name__isnull=True).distinct()
    users = UserSerializer(assignable_users, many=True)
    ret_value['users'] = users.data
    #get roles that have users
    roles = UserAssignmentWeight.objects.all().values_list('role__id', flat=True).distinct()
    ret_value["roles"] = list(AssignmentRole.objects.filter(id__in=roles).values_list('role', flat=True))
    data = json.dumps(ret_value)
    mimetype='application/json'
    return HttpResponse(data, mimetype)


class DashboardView(LoginRequiredMixin, PendingTestMixin,  generic.TemplateView):
    template_name = "cvdp/dashboard.html"
    login_url = "authapp:login"

    def get_context_data(self, **kwargs):
        context = super(DashboardView, self).get_context_data(**kwargs)

        #check group permissions
        check_permissions(self.request.user)
        context['dashboard'] = 1
        return context


class ArtifactView(LoginRequiredMixin, PendingTestMixin, generic.TemplateView):

    def get(self, request, *args, **kwargs):
        logger.debug(self.kwargs['path'])
        attachment = Attachment.objects.filter(uuid=self.kwargs['path']).first()
        #all the permission checks!!!
        if attachment:
            #check permissions
            ca = CaseArtifact.objects.filter(file=attachment).first()
            if ca:
                if not(is_my_case(self.request.user, ca.case.id)):
                    raise PermissionDenied()
            else:
                #check thread artifacts
                ta = ThreadArtifact.objects.filter(file=attachment).first()
                if ta:
                    if not(is_my_case_thread(self.request.user, ta.thread)):
                        raise PermissionDenied()
                else:
                    #check messages
                    ma = MessageAttachment.objects.filter(file=attachment).first()
                    if ma:
                        if ma.thread:
                            if not(is_my_msg_thread(self.request.user, ma.thread)):
                                raise PermissionDenied()
                        else:
                            if ma.user != self.request.user:
                                if not(self.request.user.is_coordinator):
                                    raise PermissionDenied()

            mime_type = attachment.mime_type
            if attachment.file.storage.exists(attachment.file.name):
                # TODO: We should be doing this URL magic and serving from
                #       potentially cached storage. Right now, we're going
                #       quick-and-dirty and doing the same thing we did when
                #       this was only dealing with local files. [JDW]
                #url = attachment.file.storage.url(str(attachment.file.name), parameters={'Content-Disposition': f'attachment; filename="{attachment}"'})
                #logger.debug(f"in ArtifactView: built url {url}")
                #response = HttpResponseRedirect(url)
                with attachment.file.storage.open(str(attachment.file.name)) as fh:
                    response = HttpResponse(fh.read(), content_type = mime_type)
                    response['Content-Disposition'] = f"attachment; filename=\"{attachment}\""
                    response["Content-type"] = mime_type
                    response["Cache-Control"] = "must-revalidate"
                    response["Pragma"] = "must-revalidate"
                    return response

        raise Http404


class GenerateNewRandomColor(LoginRequiredMixin, PendingTestMixin, generic.TemplateView):
    template_name = 'cvdp/notemplate.html'
    login_url="authapp:login"

    def get(self, request, *args, **kwargs):
        self.request.user.userprofile.logocolor = "#"+''.join([random.choice('0123456789ABCDEF') for j in range(6)])
        self.request.user.userprofile.save()
        messages.success(
            self.request,
            "Hope you like your new color!"
        )
        return redirect("authapp:profile")


def quickSearch(request):
    input = request.GET.get('searchbar', False)
    if input:
        response = redirect("cvdp:search")
        input=input.replace('#', '%23')
        response['Location'] += '?q='+input
        return response
    else:
        return redirect("cvdp:search")

def process_query(s, live=True):
    query = re.sub(r"[!'()|&<>]", ' ', s).strip()
    # get rid of empty quotes
    query = re.sub(r'""', '', query)
    if query == '"':
        return None
    if query.startswith(settings.CASE_IDENTIFIER):
        query = query[len(settings.CASE_IDENTIFIER):]

    if query:
        #sub spaces between quotations with <->
        #if re.search(r'\"', query) and not re.search(r'\".*\"', query):
        try:
            query = '&'.join(shlex.split(query))
        except ValueError:
            query = query + '"'
            query = re.sub(r'\s+', '&', query)
        query = re.sub(r'\s+', '<->', query)
        # Support prefix search on the last word. A tsquery of 'toda:*' will
        # match against any words that start with 'toda', which is good for
        # search-as-you-type.
        if query.endswith("<->"):
            query = query[:-3]
    if query and live:
        query += ':*'

    return query

class APISearchView(APIView):
    permission_classes = (IsAuthenticated, PendingUserPermission)
    search_fields = ['name']
    filterset_fields = ['type']

    def get_view_name(self):
        return "Search AdVISE"

    def get(self, request, format=None):
        logger.debug(request.query_params)
        groups = []
        contacts = []
        components = []
        cases = []
        vuls = []
        artifacts = []
        advisory = []
        # kind of hacky but will work for now
        # -----------------------------------------------------------
        page_number = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size ', 20)
	# -----------------------------------------------------------
        search_term = self.request.GET.get('name', None)
        logger.debug(f"SEARCH TERM IS {search_term}")
        search_query = None
        
        search_type = self.request.GET.get('type', "All").lower()
        logger.debug(search_type)
        if search_term:
            search_query = process_query(search_term)

        if (search_type in ['all', 'cases']):
            logger.debug("INS EARH TYPE")
            mycases = my_cases(self.request.user)
            cases = Case.objects.search_my_cases(mycases, search_query)
            vuls = Vulnerability.objects.search_my_cases(mycases, search_query)
            advisory = CaseAdvisory.objects.search_my_cases(mycases, search_query)
            #artifacts isn't doing full text search so use search_term
            artifacts = CaseArtifact.objects.search_my_cases(mycases, search_term)
        if (search_type in ['all', 'components']):
            components = Component.objects.search_my_components(my_components(self.request.user), search_query)
        if (search_type in ['all', 'contacts']):
            if self.request.user.is_coordinator:
                if search_term:
                    
                    groups = GroupProfile.objects.filter(group__name__icontains=search_term).order_by('-modified')
                    contacts = Contact.objects.filter(name__icontains=search_term).exclude(user__api_account=True).order_by('-modified')
                else:
                    groups = GroupProfile.objects.all().order_by('-modified')
                    contacts = Contact.objects.all().exclude(user__api_account=True).order_by('-modified')

        results = chain(groups, contacts, cases, components, vuls, advisory, artifacts)
        qs = sorted(results,
                    key = lambda instance: instance.modified,
                    reverse = True)
        gp = Paginator(qs, page_size)

        serializer = GenericSerializer(gp.page(page_number), many=True)

        return Response({"data": serializer.data, "count": gp.count, "pages": gp.num_pages, "page_size": page_size}, status=status.HTTP_200_OK)


class SearchAllView(LoginRequiredMixin, PendingTestMixin, generic.TemplateView):
    template_name = 'cvdp/search.html'
    login_url = "authapp:login"

    def get_context_data(self, **kwargs):
        context = super(SearchAllView, self).get_context_data(**kwargs)
        context['search'] = self.request.GET.get('q', False)
        return context

class TriageView(LoginRequiredMixin, UserPassesTestMixin, generic.ListView):
    template_name = 'cvdp/triage.html'
    login_url = "authapp:login"
    model = Case

    def test_func(self):
        return self.request.user.is_coordinator

    def get_context_data(self, **kwargs):
        context = super(TriageView, self).get_context_data(**kwargs)
        context['triagepage'] = 1
        return context

    def get_queryset(self):
        #get all owners
        owners = CaseParticipant.objects.filter(role="owner").values_list('case__id', flat=True)
        return Case.objects.filter(status=Case.ACTIVE_STATUS).exclude(id__in=owners)

class TriageAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission, CoordinatorPermission)
    serializer_class = CaseSerializer
    pagination_class=StandardResultsPagination

    def get_queryset(self):
        #get all owners
        owners = CaseParticipant.objects.filter(role="owner").values_list('case__id', flat=True)
        return Case.objects.exclude(status=Case.INACTIVE_STATUS).exclude(id__in=owners).order_by('-created')


def page_not_found_view(request, exception):
    data = {}
    return render(request, "cvdp/404.html", data, status=404)

def error_view(request):
    data = {}
    return render(request, "cvdp/500.html", data, status=500)

def permission_denied_view(request, exception):
    data = {}
    return render(request, "cvdp/403.html", data, status=403)

def bad_request_view(request, exception):
    data = {}
    return render(request, "cvdp/400.html", data, status=400)
