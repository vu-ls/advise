from django.shortcuts import render
import logging
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.urls import reverse, reverse_lazy
from django.views import generic, View
from django.utils.timesince import timesince
from django.views.generic.edit import FormView, UpdateView, FormMixin, CreateView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.forms.models import inlineformset_factory
from authapp.views import PendingTestMixin
from django.http import HttpResponse, Http404, JsonResponse, HttpResponseNotAllowed, HttpResponseServerError, HttpResponseForbidden, HttpResponseRedirect, HttpResponseBadRequest
from authapp.models import User
from django.utils.safestring import mark_safe
import traceback
from cvdp.manage.forms import *
from rest_framework import exceptions, generics, status, authentication, viewsets, mixins, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from cvdp.permissions import GroupWritePermission, PendingUserPermission
from cvdp.manage.serializers import *
from cvdp.cases.serializers import ReportSerializer
from cvdp.manage.models import ReportingForm
from cvdp.models import CaseReport
from cvdp.lib import *
import json

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


"""
Reports Page - React App - 'myreports'
"""
class ReportsView(LoginRequiredMixin, PendingTestMixin, generic.ListView):
    template_name = 'cvdp/myreports.html'
    login_url = "authapp:login"
    model = CaseReport

    def get_context_data(self, **kwargs):
        context = super(ReportsView, self).get_context_data(**kwargs)
        context['myreportspage'] = 1
        return context

class ReportsAPIView(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = (IsAuthenticated, PendingUserPermission)

    def list(self, request, *args, **kwargs):
        content = self.get_queryset()
        return Response(self.serializer_class(content, many=True,
                                           context={'user': request.user}).data)
    
    def get_queryset(self):
        return CaseReport.objects.filter(entry__created_by=self.request.user).order_by('-entry__created')

#TODO - anyone can submit a report - add anonymous reporting feature
class ReportView(LoginRequiredMixin, PendingTestMixin, generic.TemplateView):
    template_name = 'cvdp/report.html'
    login_url="authapp:login"
    success_url = 'results.html'

    def get_context_data(self, **kwargs):
        context = super(ReportView, self).get_context_data(**kwargs)

        form = ReportingForm.objects.all().first()

        context['form'] = form.get_form()
        context['reportpage'] = 1
        context['intro'] = form.intro
        
        return context

    def post(self, request, *args, **kwargs):
        logger.debug(f"{self.__class__.__name__} post: {self.request.POST}")

        rform = ReportingForm.objects.all().first()
        
        form = rform.get_form(self.request.POST)
        if form.is_valid():
            #create form entry
            fe = FormEntry(form=rform,
                           created_by=self.request.user)
            fe.save()
            
            logger.debug(form.cleaned_data)
            
            #make the answers
            pp = rform.get_pretty_answers(form.cleaned_data)

            logger.debug(pp)
            
            #create case report
            cr = CaseReport(entry=fe,
                            report=pp)
            cr.save()

            new_case_id = generate_case_id()
            #now create the case
            case = Case(report= cr,
                 case_id = new_case_id,
                 title=f"{rform.title} form entry")

            case.save()

            #add reporter to Case as reporter
            contact = Contact.objects.filter(user=self.request.user).first()

            add_new_case_participant(case.official_thread, contact.uuid, self.request.user, "reporter")

            messages.success(
                self.request,
                "Got it! Thanks for your vulnerability report."
            )
            
            return redirect("cvdp:reports")
