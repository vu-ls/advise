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
from cvdp.permissions import CoordinatorPermission, PendingUserPermission, is_case_owner, is_case_owner_or_staff
from cvdp.manage.serializers import *
from cvdp.cases.serializers import ReportSerializer, CoordReportSerializer
from cvdp.manage.models import ReportingForm
from cvdp.models import CaseReport, CaseReportOriginal
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

class OrigReportAPIView(viewsets.ModelViewSet):
    serializer_class = CoordReportSerializer
    permission_classes = (IsAuthenticated, CoordinatorPermission)

    def get_view_name(self):
        return f"Original Case Report"
    
    def get_object(self):
        orig = get_object_or_404(CaseReportOriginal, case__case_id=self.kwargs['caseid'])
        return orig.report
        

class AddReportView(LoginRequiredMixin, UserPassesTestMixin, generic.TemplateView):
    template_name = 'cvdp/add_report.html'
    login_url = "authapp:login"

    def test_func(self):
        return self.request.user.is_coordinator or self.request.user.is_staff

    def get_context_data(self, **kwargs):
        context = super(AddReportView, self).get_context_data(**kwargs)

        form = ReportingForm.objects.all().first()
        if (form):
            context['form'] = form.get_form()
            context['intro'] = form.intro

        case = get_object_or_404(Case, case_id=self.kwargs.get('caseid'))
        if case.report:
            context['error'] = "This case already has a report"
        if not is_case_owner(self.request.user, case.id):
            context['error'] = "You must be the case owner to add a report."

        return context

class AddCaseReportView(LoginRequiredMixin, UserPassesTestMixin, generic.TemplateView):
    http_method_names = ['post']
    template_name='cvdp/notemplate.html'
    login_url = "authapp:login"

    def test_func(self):
        case = get_object_or_404(Case, case_id=self.kwargs.get('caseid'))
        return is_case_owner(self.request.user, case.id)

    def post(self, request, *args, **kwargs):
        logger.debug(f"{self.__class__.__name__} post: {self.request.POST}")

        case = get_object_or_404(Case, case_id=self.kwargs['caseid'])
        if case.report:
            return JsonResponse({'message': 'This case already has a report.'}, status=status.HTTP_400_BAD_REQUEST)

        rform = ReportingForm.objects.all().first()

        form = rform.get_form(self.request.POST)
        if form.is_valid():
            #create form entry
            fe = FormEntry(form=rform)
            if self.request.user.is_authenticated:
                fe.created_by=self.request.user
            fe.save()

            logger.debug(form.cleaned_data)

            #make the answers
            pp = rform.get_pretty_answers(form.cleaned_data)

            logger.debug(pp)

            #create case report
            cr = CaseReport(entry=fe,
                            report=pp)
            cr.save()

            case.report = cr
            case.save()

            serializer = ReportSerializer(cr)

            return JsonResponse({'message': 'success', 'data': serializer.data}, status=status.HTTP_202_ACCEPTED)

        else:
            return JsonResponse({'message': form.errors}, status=status.HTTP_400_BAD_REQUEST)


class EditReportView(LoginRequiredMixin, UserPassesTestMixin, generic.TemplateView):
    login_url="authapp:login"
    template_name='cvdp/edit_report.html'

    def test_func(self):
        case = get_object_or_404(Case, case_id=self.kwargs.get('caseid'))
        return is_case_owner_or_staff(self.request.user, case.id)

    def get_context_data(self, **kwargs):
        context = super(EditReportView, self).get_context_data(**kwargs)

        cform = ReportingForm.objects.all().first()
        context['current_form'] = cform.get_form()

        case = get_object_or_404(Case, case_id=self.kwargs.get('caseid'))
        context['case'] = case
        if case.report:
            if self.request.GET.get('add'):
                context['form'] = case.report.entry.form.get_current_form_and_initial(case.report.report)
            else:
                context['form'] = case.report.entry.form.get_form_and_initial(case.report.report)

        return context

    def post(self, request, *args, **kwargs):
        logger.debug(f"{self.__class__.__name__} post: {self.request.POST}")
        case = get_object_or_404(Case, case_id=self.kwargs['caseid'])

        rform = ReportingForm.objects.all().first()
        if case.report:
            form = case.report.entry.form.get_form_and_initial(case.report.report, self.request.POST)
            if form.is_valid():
                logger.debug(form.cleaned_data)
                if not case.report.copy:
                    #we need to make a copy of the original form first
                    orig = CaseReportOriginal(report = case.report,
                                              case=case,
                                              user=self.request.user)
                    orig.save()
                pp = rform.get_pretty_answers(form.cleaned_data)
                logger.debug(pp)

                #get case report
                if case.report.copy:
                    case.report.report = pp
                    case.report.save()
                else:
                    cr = CaseReport(entry=case.report.entry,
                                    report=pp,
                                    copy=True)
                    cr.save()

                    case.report = cr
                    case.save()
                    
                create_case_action("edited report copy", self.request.user, case)

                messages.success(
                    self.request,
                    "Got it! A copy of the report will now be available to case recipients."
                )
                
                return redirect("cvdp:case", case.case_id)
            else:
                logger.debug(f"{self.__class__.__name__} {form.errors}")

class ReportView(UserPassesTestMixin, generic.TemplateView):
    template_name = 'cvdp/report.html'
    login_url="authapp:login"
    success_url = 'results.html'

    def test_func(self):
        if self.request.user.is_anonymous:
            if hasattr(settings, "ALLOW_ANONYMOUS_REPORTS"):
                if settings.ALLOW_ANONYMOUS_REPORTS:
                    return True
            return False
        return PendingTestMixin.test_func(self)

    def get_context_data(self, **kwargs):
        context = super(ReportView, self).get_context_data(**kwargs)

        form = ReportingForm.objects.all().first()
        if (form):
            context['form'] = form.get_form()
            context['intro'] = form.intro
        context['reportpage'] = 1

        if self.request.user.is_anonymous:
            context['base_template'] = 'cvdp/report_no_auth.html'
        else:
            context['base_template'] = settings.CVDP_BASE_TEMPLATE

        return context

    def post(self, request, *args, **kwargs):
        logger.debug(f"{self.__class__.__name__} post: {self.request.POST}")

        rform = ReportingForm.objects.all().first()

        form = rform.get_form(self.request.POST)
        if form.is_valid():
            #create form entry
            fe = FormEntry(form=rform)
            if self.request.user.is_authenticated:
                fe.created_by=self.request.user
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
            if self.request.user.is_authenticated:
                contact = Contact.objects.filter(user=self.request.user).first()
                add_new_case_participant(case.official_thread, contact.uuid, self.request.user, "reporter")

            messages.success(
                self.request,
                "Got it! Thanks for your vulnerability report."
            )
            if self.request.user.is_authenticated:

                return redirect("cvdp:reports")
            else:
                return redirect("authapp:login")
