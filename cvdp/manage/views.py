from django.shortcuts import render
import logging
from datetime import datetime, timedelta
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
from cvdp.models import CVEServicesAccount
from django.utils.safestring import mark_safe
import traceback
from django_filters.rest_framework import DjangoFilterBackend
from cvdp.manage.forms import *
from rest_framework import exceptions, generics, status, authentication, viewsets, mixins, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from cvdp.permissions import *
from cvdp.manage.serializers import *
from cvdp.cases.serializers import UserSerializer


logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

def date_rel_to_today(today, offset):
    return today - timedelta(days=offset)


class CreateNewReportingForm(LoginRequiredMixin, UserPassesTestMixin, FormView):
    form_class = NewReportingForm
    template_name = "cvdp/newform.html"
    login_url = "authapp:login"

    def test_func(self):
        return self.request.user.is_staff

    def post(self, request, *args, **kwargs):
        logger.debug(f"{self.__class__.__name__} post: {self.request.POST}")
        if self.kwargs.get('pk'):
            form_initial = get_object_or_404(ReportingForm, id=self.kwargs['pk'])
            form = self.form_class(self.request.POST, instance=form_initial)
        else:
            form = self.form_class(self.request.POST)
            
        if form.is_valid():
            return self.form_valid(form)
        else:
            return self.form_invalid(form)
    
    def form_valid(self, form):
        logger.debug("VALID FORM")
        f = form.save()
        f.created_by = self.request.user
        f.save()
        
        return redirect("cvdp:design_form", f.id)

    def get_context_data(self, **kwargs):
        context = super(CreateNewReportingForm, self).get_context_data(**kwargs)
        if self.kwargs.get('pk'):
            form_initial = get_object_or_404(ReportingForm, id=self.kwargs['pk'])
            context['form'] = self.form_class(instance=form_initial)
            context['title'] = "Edit Form"
        else:
            context['title'] = "Create new reporting form"
        return context
    
    def form_invalid(self, form):
        logger.debug("INVALID FORM")
        logger.debug(f"{self.__class__.__name__} errors: {form.errors}")
        
        return render(self.request, 'cvdp/newform.html',
                      {'form': form,})


class DesignReportingForm(LoginRequiredMixin, UserPassesTestMixin, generic.TemplateView):
    model = ReportingForm
    form_class = QuestionForm
    template_name = "cvdp/designform.html"
    login_url = "authapp:login"

    def test_func(self):
        return self.request.user.is_staff

    def get_context_data(self, **kwargs):
        context = super(DesignReportingForm, self).get_context_data(**kwargs)
        theform = get_object_or_404(ReportingForm, id=self.kwargs['pk'])
        context['theform'] = theform
        context['questions'] = FormQuestion.objects.filter(form=theform)
        #forms = {'question_formset' :self.QuestionFormSet(prefix='question', queryset=questions, instance=theform)}
        #context.update(forms)
        return context

"""    
class QuestionForm(LoginRequiredMixin, UserPassesTestMixin, FormView):
    form_class = QuestionForm
    login_url = "authapp:login"
    template_name = "cvdp/question_form.html"

    def test_func(self):
        return self.request.user.is_coordinator

    def get_context_data(self, **kwargs):
        context = super(QuestionForm, self).get_context_data(**kwargs)
        theform = get_object_or_404(ReportingForm, id=self.kwargs['pk'])
        context['theform'] = theform
        context['form'] = self.form_class(initial = {'form': theform.id })
        return context
    
    def form_valid(self, form):
        logger.debug(f"{self.__class__.__name__} post: {self.request.POST}")
        theform = get_object_or_404(ReportingForm, id=self.kwargs['pk'])
        q = form.save()
        return redirect("cvdp:question", q.id)
    

class QuestionDetail(LoginRequiredMixin, UserPassesTestMixin, generic.DetailView):
    model=FormQuestion
    login_url = "authapp:login"
    template_name = "cvdp/question_detail.html"

    def test_func(self):
        return self.request.user.is_coordinator
""" 

class QuestionAPIView(viewsets.ModelViewSet):
    serializer_class = QuestionSerializer
    permission_classes= (IsAuthenticated, PendingUserPermission, StaffPermission)

    def get_view_name(self):
        return f"Form Questions"

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return FormQuestion.objects.none()
        
        form = get_object_or_404(ReportingForm, id=self.kwargs['pk'])
        return FormQuestion.objects.filter(form=form)

    def create(self, request, *args, **kwargs):
        form = get_object_or_404(ReportingForm, id=self.kwargs['pk'])
        logger.debug(request.data)
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            q = serializer.save(form=form)
            if not request.data.get('required'):
                q.required = False
                q.save()
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

    def destroy(self, request, *args, **kwargs):
        question = get_object_or_404(FormQuestion, id=self.kwargs['pk'])
        question.delete()
        return Response({}, status=status.HTTP_202_ACCEPTED)

    def update(self, request, **kwargs):
        instance = get_object_or_404(FormQuestion, id=self.kwargs['pk'])
        data = request.data
        logger.debug(request.data)
        serializer = self.serializer_class(instance=instance, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            logger.debug(serializer.errors)
            return Response(serializer.errors,
                            status=status.HTTP_400_BAD_REQUEST)
        
                

# anyone can submit a vul report?  Should IsAuthenticated even be here?
class ReportingFormAPIView(viewsets.ModelViewSet):
    queryset = ReportingForm.objects.all()
    serializer_class = ReportingFormSerializer
    permission_classes = (IsAuthenticated, )

    def get_view_name(self):
        return f"Reporting Form"

    
class FormManagement(LoginRequiredMixin, UserPassesTestMixin, generic.ListView):
    template_name = "cvdp/manage_forms.html"
    login_url = "authapp:login"
    model = ReportingForm

    def test_func(self):
        return self.request.user.is_coordinator

    def get_context_data(self, **kwargs):
        context = super(FormManagement, self).get_context_data(**kwargs)
        context['manageform'] = 1
        return context
    

#TODO: can anyone authenticated manage CVE here?  Or just coordinators?
class CVEServicesDashboard(LoginRequiredMixin, UserPassesTestMixin, generic.TemplateView):
    template_name = 'cvdp/cveservices.html'
    login_url="authapp:login"

    def test_func(self):
        return self.request.user.is_coordinator

    def get_context_data(self, **kwargs):
        context = super(CVEServicesDashboard, self).get_context_data(**kwargs)
        context['cveservices'] = 1
        context['accounts'] = CVEServicesAccount.objects.all()
        if self.kwargs.get('pk'):
            acc = get_object_or_404(CVEServicesAccount, id=self.kwargs['pk'])
        elif context['accounts']:
            acc = context['accounts'][0]
        return context
    
class UserAdminView(LoginRequiredMixin, UserPassesTestMixin, generic.TemplateView):
    template_name = 'cvdp/user_admin.html'
    login_url="authapp:login"

    def test_func(self):
        return self.request.user.is_coordinator

    def get_context_data(self, **kwargs):
        context = super(UserAdminView, self).get_context_data(**kwargs)
        context['useradminpage'] = 1
        return context

class SystemAdminView(LoginRequiredMixin, UserPassesTestMixin, generic.TemplateView):
    template_name = 'cvdp/sys_admin.html'
    login_url="authapp:login"

    def test_func(self):
        return self.request.user.is_coordinator

    def get_context_data(self, **kwargs):
        context = super(SystemAdminView, self).get_context_data(**kwargs)
        context['sysadminpage'] = 1
        return context

    
class PendingUsersAPI(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission, CoordinatorPermission)
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.filter(pending=True)

    def update(self, request, **kwargs):
        user = self.get_object()
        if user.pending:
            user.pending=False;
            user.save()
            
            return Response({}, status=status.HTTP_202_ACCEPTED)
        else:
            return Response({'error': 'user not pending'}, status=status.HTTP_400_BAD_REQUEST)

class NewUsersAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission, CoordinatorPermission)
    serializer_class = UserSerializer

    def get_queryset(self):
        today = datetime.today()
        date_7 = date_rel_to_today(today, 7)
        date_7_str = date_7.strftime('%Y-%m-%d')
        return User.objects.filter(date_joined__gte=date_7_str, pending=False, api_account=False).order_by('-date_joined')

class AssignRolesView(LoginRequiredMixin, UserPassesTestMixin, generic.TemplateView):
    template_name = 'cvdp/assign_roles.html'
    login_url="authapp:login"

    def test_func(self):
        return self.request.user.is_staff

    def get_context_data(self, **kwargs):
        context = super(AssignRolesView, self).get_context_data(**kwargs)
        return context

class AutoAssignmentAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission, CoordinatorPermission)
    serializer_class = AutoAssignmentSerializer

    def get_queryset(self):
        return AssignmentRole.objects.all()

    def create(self, request, *args, **kwargs):
        logger.debug(request.data)
        if not(request.user.is_staff):
            #only staff members can create auto assignment weights
            raise PermissionDenied()

        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            logger.debug(serializer.errors)
            return Response(serializer.errors,
                            status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, **kwargs):
        logger.debug(request.data)
        if not(request.user.is_staff):
            #only staff members can create auto assignment weights
            raise PermissionDenied()
        
        instance = self.get_object()
        data = request.data
        if request.data.get('user'):
            user = get_object_or_404(User, id=request.data.get('user'))
        else:
            return Response({"user": "required field"},
                            status=status.HTTP_400_BAD_REQUEST)

        if request.data.get('delete'):
            role = UserAssignmentWeight.objects.filter(user=user, role=instance).first()
            role.delete()
        else:
            new = UserAssignmentWeight.objects.update_or_create(user = user, role=instance,
                                                                defaults={'weight': request.data.get('weight', 1)
                                                                      })
        return Response({}, status=status.HTTP_202_ACCEPTED)
        

class CVEServicesAccountManagement(LoginRequiredMixin, UserPassesTestMixin, FormView):
    template_name = 'cvdp/add_cve_account.html'
    login_url = 'authapp:login'
    form_class = CVEAccountForm

    def get_success_url(self):
        return reverse_lazy("cvdp:cve_services")

    def test_func(self):
        return self.request.user.is_coordinator

    def get_context_data(self, **kwargs):
        context = super(CVEServicesAccountManagement, self).get_context_data(**kwargs)
        if self.kwargs.get('pk'):
            account = get_object_or_404(CVEServicesAccount, id=self.kwargs['pk'])
            context['title'] = "Edit Account Information"
            form = CVEAccountForm(instance=account)
            context['form'] = form
 
            context['action'] = reverse("cvdp:edit_cve_account", args=self.kwargs['pk'])
        else:
            context['title'] = 'Add new account'
            initial = {}
            form = CVEAccountForm()
            context['form'] = form
            context['action'] = reverse("cvdp:add_cve_account")
        return context
    
    
    def form_valid(self, form):
        account = form.save()
        account.user_added = self.request.user
        account.save()
        messages.success(
            self.request,
            "Got it! Your changes have been saved"
        )
        return redirect("cvdp:cve_services")


class CVEAccountAPI(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission, CoordinatorPermission)
    serializer_class = CVEAccountSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['active']
    
    def get_queryset(self):
        return CVEServicesAccount.objects.filter(user_added=self.request.user)

    def destroy(self, request, *args, **kwargs):
        question = get_object_or_404(CVEServicesAccount, id=self.kwargs['pk'])
        question.delete()
        return Response({}, status=status.HTTP_202_ACCEPTED)
    
class EmailTemplateAPI(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission, CoordinatorPermission)
    serializer_class = EmailTemplateSerializer
    filterset_fields = ['template_type']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return EmailTemplate.objects.none()
        
        return EmailTemplate.objects.all()
    

class ConnectionAPI(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, StaffPermission)
    serializer_class = ConnectionSerializer

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return AdVISEConnection.objects.none()
        if self.request.GET.get('all'):
            return AdVISEConnection.objects.all().order_by('disabled')
        else:
            return AdVISEConnection.objects.filter(disabled=False)

    def get_object(self):
        return get_object_or_404(AdVISEConnection, id=self.kwargs['pk'])
        
    def create(self, request, *args, **kwargs):
        logger.debug(request.data)

        g = get_object_or_404(Group, groupprofile__uuid=request.data['group'])
        
        connection = AdVISEConnection(
            group = g,
            url = request.data['url'],
            external_key= request.data['external_key'],
            created_by = self.request.user)
        
        if request.data.get('incoming_api_key'):
            #lookup
            tokens = APIToken.objects.filter(last_four = request.data['incoming_api_key'])
            token = tokens.filter(user__groups__id=g.id)
            if len(token) != 1:
                return Response({'detail': f'API Token lookup returned {len(token)} results.'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                token = token[0]
                connection.incoming_key = token;
        connection.save()
        return Response({}, status=status.HTTP_202_ACCEPTED)
    
    def update(self, request, *args, **kwargs):
        logger.debug(request.data)
        connection = self.get_object()

        if request.data.get('disabled'):
            connection.disabled=False
            connection.save()
            return Response({}, status=status.HTTP_202_ACCEPTED)
        
        g = get_object_or_404(Group, groupprofile__uuid=request.data['group'])
        connection.group = g
        connection.url = request.data['url']
        connection.external_key= request.data['external_key']

        if request.data.get('incoming_api_key'):
            #lookup 
            tokens = APIToken.objects.filter(last_four = request.data['incoming_api_key'])
            token = tokens.filter(user__groups__id=g.id)
            if len(token) != 1:
                return Response({'detail': f'API Token lookup returned {len(token)} results.'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                token = token[0]
                connection.incoming_key = token;
        connection.save()
        return Response({}, status=status.HTTP_202_ACCEPTED)

    
    def destroy(self, request, *args, **kwargs):
        connection = get_object_or_404(AdVISEConnection, id=self.kwargs['pk'])
        connection.disabled = True
        connection.save()
        return Response({}, status=status.HTTP_202_ACCEPTED)
