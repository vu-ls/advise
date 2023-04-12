from django.shortcuts import render
import logging
from django.db.models import Q
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.urls import reverse, reverse_lazy
from django.views import generic, View
from django.views.generic.edit import FormView, UpdateView, FormMixin, CreateView
from django.http import HttpResponse, Http404, JsonResponse, HttpResponseNotAllowed, HttpResponseServerError, HttpResponseForbidden, HttpResponseRedirect, HttpResponseBadRequest
from authapp.models import User
from django_filters.rest_framework import DjangoFilterBackend
import django_filters
from django.core.exceptions import ValidationError, PermissionDenied
from django.utils.translation import gettext as _
from django_filters.rest_framework import DjangoFilterBackend
from authapp.views import PendingTestMixin
from cvdp.utils import process_query
from rest_framework import exceptions, generics, status, authentication, viewsets, mixins, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from cvdp.permissions import *
from cvdp.groups.serializers import *
# Create your views here.
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.auth import get_user_model
import traceback
from cvdp.groups.forms import *
from django.core.paginator import Paginator
from cvdp.lib import send_template_email

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

User = get_user_model()


"""
Group Detail View - Django based
"""
class GroupDetailView(LoginRequiredMixin, UserPassesTestMixin, generic.DetailView):
    model = Group
    login_url = "authapp:login"
    template_name = "cvdp/group.html"

    def test_func(self):
        return self.request.user.is_coordinator

    def get_context_data(self, **kwargs):
        context = super(GroupDetailView, self).get_context_data(**kwargs)
        context['associations'] = ContactAssociation.objects.filter(group=self.object)
        context['object'] = self.object
        context['contactpage']=1
        return context


"""
Group Admin View - React app "groupadmin"
"""
class GroupAdminView(LoginRequiredMixin, UserPassesTestMixin, generic.TemplateView):
    login_url = "authapp:login"
    template_name = "cvdp/groupadmin.html"

    def test_func(self):
        #TODO - check for groupadmin status?
        if self.request.user.groups.count() > 0:
            return True
        else:
            return False

    def get_context_data(self, **kwargs):
        context = super(GroupAdminView, self).get_context_data(**kwargs)
        #TODO: this doesn't work for more than 1 group
        context['my_group'] = self.request.user.groups.first().name
        context['groupadminpage'] = 1
        return context

 
"""
Group verifications - Django View
"""
class GroupVerificationsView(LoginRequiredMixin, UserPassesTestMixin, generic.DetailView):
    model = Group
    login_url = "authapp:login"
    template_name = "cvdp/verifications.html"

    def test_func(self):
        return self.request.user.is_coordinator

    def get_context_data(self, **kwargs):
        context = super(GroupVerificationsView, self).get_context_data(**kwargs)
        context['object'] = self.object
        context['verifications'] = ContactAssociation.objects.filter(group=self.object, verified=False)
        return context

"""
Group Components view - React app
"""

class GroupComponentsView(LoginRequiredMixin, UserPassesTestMixin, generic.DetailView):
    model = Group
    login_url = "authapp:login"
    template_name = "cvdp/group_components.html"

    def test_func(self):
        return self.request.user.is_coordinator

    def get_context_data(self, **kwargs):
        context = super(GroupComponentsView, self).get_context_data(**kwargs)
        context['object'] = self.object
        return context

"""
Group search view - React App 'groups'
#TODO - ADD Verifications
"""
class GroupSearchView(LoginRequiredMixin, UserPassesTestMixin, generic.ListView):
    template_name = 'cvdp/searchgroups.html'
    login_url = "authapp:login"
    model = Group

    def test_func(self):
        return self.request.user.is_coordinator

    def get_context_data(self, **kwargs):
        context = super(GroupSearchView, self).get_context_data(**kwargs)
        context['contactpage']=1
        return context

    def post(self, request, *args, **kwargs):
        logger.debug(self.request.POST)
        search = self.request.POST.get('search')
        thread = self.request.POST.get('thread')
        case = self.request.POST.get('case')
        groups = Group.objects.filter(name__icontains=search).exclude(groupprofile__active=False).exclude(groupprofile__isnull=True)
        contacts = Contact.objects.filter(Q(name__icontains=search)|Q(email__icontains=search)).exclude(user__api_account=True).exclude(user__is_active=False)
        results = []
        if case:
            cp = CaseParticipant.objects.filter(case__case_id=case).values_list('group__groupprofile__uuid', flat=True)
            logger.debug(cp)
            groups = groups.filter(groupprofile__uuid__in=cp)
            cc = CaseParticipant.objects.filter(case__case_id=case).values_list('contact__uuid', flat=True)
            logger.debug(cc)
            contacts = contacts.filter(uuid__in=cc)

        elif thread:
            #get participants in this thread and exclude them
            cg = CaseThreadParticipant.objects.filter(thread__id=thread).values_list('participant__group__id', flat=True).exclude(participant__group__isnull=True)
            cc = CaseThreadParticipant.objects.filter(thread__id=thread).values_list('participant__contact__id', flat=True).exclude(participant__contact__isnull=True)
            groups = groups.exclude(id__in=cg)
            contacts = contacts.exclude(id__in=cc)
        

        for g in groups:
            results.append({'name':g.name, 'logo':g.groupprofile.get_logo(), 'color':g.groupprofile.icon_color, 'uuid':g.groupprofile.uuid})
        for c in contacts:
            results.append({'name':c.get_name(), 'color':c.get_color(), 'logo': c.get_photo(), 'uuid': c.uuid})

        return JsonResponse(results, safe=False, status=200)


class GroupAPIFilter(django_filters.FilterSet):

    type = django_filters.MultipleChoiceFilter(
        field_name='type',
        method="filter_type",
        choices=[('1', 'group'), ('2', 'contact'), ('3', 'user')],
        label='type')

    
    def filter_type(self, queryset, name, value):
        logger.debug("IN FILTER TYPE")
        logger.debug(value)
        #get all the cases owned by value, then filter the given queryset
        return queryset

"""
Called by React app to display suggested groups
"""

class GroupAPIView(APIView):
    permission_classes = (IsAuthenticated, PendingUserPermission, CoordinatorPermission)
    filterset_class = GroupAPIFilter
    search_fields = ['name']
    filterset_fields = ['type']

    def get(self, request, format=None):
        logger.debug(request.query_params)
        # kind of hacky but will work for now 
        # -----------------------------------------------------------
        page_number = request.query_params.get('page_number ', 1)
        page_size = request.query_params.get('page_size ', 10)
        # -----------------------------------------------------------
        search_term = self.request.GET.get('name', None)
        search_type = self.request.GET.get('type', "All").lower()
        if (search_term):
            groups = Group.objects.filter(name__icontains=search_term).order_by('-groupprofile__created')
            contacts = Contact.objects.filter(name__icontains=search_term).exclude(user__api_account=True).order_by('-created')
        else:
            groups = Group.objects.all().order_by('-groupprofile__created')
            contacts = Contact.objects.all().exclude(user__api_account=True).order_by('-created')

        if search_type == 'groups':
            gp = Paginator(groups, page_size)
            groups_serializer = GroupSerializer(gp.page(page_number), many=True)
            data = groups_serializer.data
        elif search_type == "contacts":
            cp = Paginator(contacts, page_size)
            contacts_serializer = ContactSerializer(cp.page(page_number), many=True)
            data = contacts_serializer.data
        elif search_type == "users":
            contacts = contacts.exclude(user__isnull=True).exclude(user__api_account=True)
            cp = Paginator(contacts, page_size)
            contacts_serializer = ContactSerializer(cp.page(page_number), many=True)
            data = contacts_serializer.data
        else:
            gp = Paginator(groups, page_size)
            cp = Paginator(contacts, page_size)
            
            groups_serializer = GroupSerializer(gp.page(page_number), many=True)
            contacts_serializer = ContactSerializer(cp.page(page_number), many=True)
            data = groups_serializer.data + contacts_serializer.data

        return Response(data)


#this is a slightly different view from above because it will be called by
# non-coordinators so it should only return groups that they have permission
# to view
class GroupAdminAPIView(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = (IsAuthenticated, PendingUserPermission, GroupLevelPermission)

    def get_object(self):
        g = get_object_or_404(Group, id=self.kwargs['pk'])
        self.check_object_permissions(self.request, g)
        return g

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Group.objects.none()
        return self.request.user.groups.all()

    def update(self, request, **kwargs):
        instance = self.get_object()
        #only group admins can change the details!
        if not ContactAssociation.objects.filter(contact__user=self.request.user, group=instance, group_admin=True).exists():
            raise PermissionDenied()
        data = request.data
        logger.debug(request.FILES)
        logger.debug(data)
        if data.get('logocolor'):
            instance.groupprofile.icon_color = data['logocolor']

        elif data.get('logo'):
            if data['logo'] == "reset":
                instance.groupprofile.logo = None
            else:
                instance.groupprofile.logo = data['logo']
        else:
            #likely updating contact info
            logger.debug("IN UPDATE CONTACT INFO!!!")
            serializer = self.serializer_class(instance=instance, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        instance.groupprofile.save()
        newgroup = self.serializer_class(instance)
        return Response(newgroup.data, status=status.HTTP_202_ACCEPTED)


class GroupAPIAccountView(viewsets.ModelViewSet):
    serializer_class = GroupAPIAccountSerializer
    permission_classes = (IsAuthenticated, GroupAdminLevelPermission, PendingUserPermission)

    def get_view_name(self):
        return "Group API Accounts"

    def get_queryset(self):
        g = get_object_or_404(Group, id=self.kwargs['pk'])
        self.check_object_permissions(self.request, g)
        logger.debug(f"GROUP IS {g.name}")
        accounts = g.user_set.filter(api_account=True)
        
        api_keys = APIToken.objects.filter(user__in=accounts)
        return api_keys

    def create(self, request, *args, **kwargs):
        """
        Create a new API account for the group
        """
        #create a local user
        g = get_object_or_404(Group, id=self.kwargs['pk'])
        self.check_object_permissions(self.request, g)
        #does this group have other api accounts
        accounts = g.user_set.filter(api_account=True).count()
        accounts = accounts + 1
        #get supprt email to make the account
        email = g.groupprofile.support_email
        if not email:
            return Response({'message': 'organization email required'}, status=status.HTTP_400_BAD_REQUEST)
        parts = email.strip().split('@', 1)
        if len(parts) > 1:
            parts[0] = f"{parts[0]}+API{accounts}"
        new_account_email = '@'.join(parts)
        api_account = User.objects.create(email=new_account_email, api_account=True, screen_name=f"{g.name} API", org=g.name, title="API Service Account")
        g.user_set.add(api_account)
        token = APIToken(user=api_account)
        key = token.generate_key()
        token.save(key)
        return Response({'key': key}, status=status.HTTP_201_CREATED)

    def update(self, request, **kwargs):
        g = get_object_or_404(Group, id=self.kwargs['pk'])
        self.check_object_permissions(self.request, g)
        token = get_object_or_404(APIToken, last_four=self.kwargs['key'])
        if not token.user.groups.filter(id=g.id).exists():
            logger.debug("THIS TOKEN DOESN'T BELONG TO THIS GROUP")
            raise PermissionDenied()
        user = token.user
        token.delete()
        token = APIToken(user=user)
        key = token.generate_key()
        token.save(key)
        return Response({'key': key}, status=status.HTTP_202_ACCEPTED)
    
    def destroy(self, request, *args, **kwargs):
        g = get_object_or_404(Group, id=self.kwargs['pk'])
        self.check_object_permissions(self.request, g)
        token = get_object_or_404(APIToken, last_four=self.kwargs['key'])
        if not token.user.groups.filter(id=g.id).exists():
            logger.debug("THIS TOKEN DOESN'T BELONG TO THIS GROUP")
            raise PermissionDenied()

        #get contact first
        c = Contact.objects.filter(user=token.user).first()
        if c:
            c.delete()
        #then delete user
        token.user.delete()
        return Response({}, status=status.HTTP_202_ACCEPTED)

        
    
class GroupDetailAPIView(viewsets.ModelViewSet):
    queryset = GroupProfile.objects.all()
    serializer_class = GroupProfileSerializer
    permission_classes = (IsAuthenticated, PendingUserPermission, CoordinatorPermission)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['group__name']
    filterset_fields = ['active', 'vendor_type', 'group__name']

    def get_object(self):
        g = get_object_or_404(Group, id=self.kwargs['pk'])
        return g.groupprofile

    def destroy(self, request, *args, **kwargs):
        if self.request.user.is_superuser:
            g = self.get_object()
            g.delete()
        raise PermissionDenied()
    
    def update(self, request, **kwargs):
        print("IN UPDATE")
        print(request.data)
        instance = self.get_object()
        group = instance.group
        data = request.data
        serializer = self.serializer_class(instance=instance, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            logger.debug(serializer.errors)
            return Response(serializer.error_messages,
                            status=status.HTTP_400_BAD_REQUEST)

    def create(self, request, *args, **kwargs):
        """
        Create a group record
        :param format: Format of the group to return
        :param request: Request object for creating group
        :return: A group
        """
        #check to see if we already have a group with this name and if so, return
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            old_group = Group.objects.filter(name=request.data['name']).first()
            if old_group:
                return Response({'message': 'Group with name already exists'},
                                status=status.HTTP_400_BAD_REQUEST)
            
                                                               
            serializer.create(validated_data=request.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        logger.debug(serializer.errors)
        return Response(serializer.error_messages,
                        status=status.HTTP_400_BAD_REQUEST)

class ContactAPIView(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    permission_classes = (IsAuthenticated, PendingUserPermission, CoordinatorPermission)
    serializer_class = ContactSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['email', 'phone', 'name']
    filterset_fields = ['email', 'phone', 'name']


class ContactAssociationAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission, GroupAdminLevelPermission)
    serializer_class = ContactAssociationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['group__name', 'contact__name', 'contact__email']
    filterset_fields = ['verified', 'contact__name', 'contact__email', 'group__name']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ContactAssociation.objects.none()
        group = get_object_or_404(Group, id=self.kwargs['pk'])
        self.check_object_permissions(self.request, group)
        return ContactAssociation.objects.filter(group=group)

    def destroy(self, request, *args, **kwargs):
        logger.debug("IN DESTROY!!!")
        ca = get_object_or_404(ContactAssociation, id=self.kwargs['pk'])
        self.check_object_permissions(request, ca.group)
        if ca.contact.user:
            logger.debug("DELETING JUST THE ASSOC")
            # if there is a user associated with this contact, just remove the association
            ca.delete()
        else:
            #is this contact in any other groups
            other = ContactAssociation.objects.filter(contact=ca.contact).exclude(id=ca.id)
            if other:
                logger.debug("DELETING JUST THE ASSOC -other")
                ca.delete()
            else:
                #this should automatically remove ca
                ca.contact.delete()
        return Response({}, status=status.HTTP_202_ACCEPTED)

    def create(self, request, *args, **kwargs):
        logger.debug(request.data)
        group = get_object_or_404(Group, id=self.kwargs['pk'])
        self.check_object_permissions(self.request, group)
        
        group_admin = ContactAssociation.objects.filter(group=group, contact__user=request.user, group_admin=True).exists()

        ctx = {'group': group.name, 'added_by': request.user.email, 'url': request.get_host()}
        logger.debug(group_admin)
        #does this email already exist in this contact bc serializer will fail
        contact = Contact.objects.filter(email = request.data['email']).first()
        if contact:
            ca, created = ContactAssociation.objects.update_or_create(contact=contact, group=group,
                                                             defaults={'added_by': self.request.user})
            if group_admin:
                #mark this user as verified if the group admin is adding them!
                #send email to user to let them know they have been added
                ca.verified = True
                ca.save()
                
            if contact.user:
                group.user_set.add(contact.user)
                if group_admin and created:
                    send_template_email("group_admin_added", [contact.email], ctx)
            else:
                if group_admin and created:
                    #send invitation
                    send_template_email("group_admin_invite", [contact.email], ctx)

            return Response({}, status=status.HTTP_202_ACCEPTED)
        serializer = ContactSerializer(data=request.data)
        if serializer.is_valid():
            contact = serializer.save()
            contact.added_by = self.request.user
            contact.save()
            #is there an existing user already associated with this email?
            user = User.objects.filter(email=contact.email).first()
            if user:
                contact.user = user
                contact.save()
                group.user_set.add(user)
                if group_admin:
                    send_template_email("group_admin_added", [contact.email], ctx)


            else:
                if group_admin:
                    send_template_email("group_admin_invite", [contact.email], ctx)
            ca = ContactAssociation.objects.update_or_create(contact=contact, group=group)
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            logger.debug(seralizer.errors)
            return Response(serializer.error_messages,
                            status=status.HTTP_400_BAD_REQUEST)
        
        
    
    def update(self, request, **kwargs):
        instance = get_object_or_404(ContactAssociation, id=self.kwargs['pk'])
        self.check_object_permissions(request, instance.group)
        data = request.data
        logger.debug(data)
        if data.get('group_admin') and not instance.contact.user:
            logger.debug("Can't make a non-user an admin")
            return Response({'group_admin':'This contact is not associated with a user, and can not be promoted to group admin.'}, status=status.HTTP_400_BAD_REQUEST)
        logger.debug("in update contact association")
        #ONCE VERIFIED, we should check if the user exists and add them to the group
        serializer = self.serializer_class(instance=instance, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            logger.debug(serializer.errors)
            return Response(serializer.error_messages,
                            status=status.HTTP_400_BAD_REQUEST)
                                           

class CreateGroupView(LoginRequiredMixin, UserPassesTestMixin, FormView, FormMixin):
    model = Group
    login_url = "authapp:login"
    template_name = 'cvdp/newgroup.html'
    form_class = GroupForm

    def test_func(self):
        return self.request.user.is_coordinator

    def form_invalid(self, form):
        logger.debug("INVALID FORM")
        logger.debug(f"{self.__class__.__name__} errors: {form.errors}")

        return render(self.request, 'cvdp/newgroup.html',
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
        logger.debug("VALID FORM")
        group = form.save()
        gp = GroupProfile(group = group,
                          vendor_type = form.cleaned_data['vendor_type'])
        gp.save()
        return JsonResponse({'new':reverse("cvdp:group", args=[group.id])}, status=200)

class CreateContactView(LoginRequiredMixin, UserPassesTestMixin, FormView, FormMixin):
    model = Contact
    form_class = ContactForm
    login_url = "authapp:login"
    template_name = "cvdp/newcontact.html"

    def test_func(self):
        return self.request.user.is_coordinator

    def get_context_data(self, **kwargs):
        context = super(CreateContactView, self).get_context_data(**kwargs)
        if self.kwargs.get('pk'):
            group = get_object_or_404(Group, id=self.kwargs['pk'])
            context['action'] = reverse("cvdp:newcontact", args=[group.id])
        else:
            context['action'] = reverse('cvdp:newcontact')
        return context

    def form_invalid(self, form):
        logger.debug("INVALID FORM")
        logger.debug(f"{self.__class__.__name__} errors: {form.errors}")

        return render(self.request, 'cvdp/newcontact.html',
                      {'form': form,})

    def post(self, request, *args, **kwargs):
        logger.debug(f"{self.__class__.__name__} post: {self.request.POST}")

        form_class = self.get_form_class()
        form = self.get_form(form_class)
        logger.debug(self.kwargs.get('pk'))
        if form.is_valid():
            return self.form_valid(form)
        else:
            #does this contact exist?
            errors = form.errors.as_data()
            if errors.get('email'):
                print(errors['email'])
                if 'Email already exists' in str(errors['email']):
                    self.make_association(request, self.kwargs.get('pk'))
                    return JsonResponse({'refresh': 1}, status=200)
            return self.form_invalid(form)

    def make_association(self, request, pk=None):
        #make association
        logger.debug(f"IN MAKE ASSOCIATION {pk}")
        if pk:
            contact = get_object_or_404(Contact, email=request.POST['email'])
            group = get_object_or_404(Group, id=pk)
            ca = ContactAssociation.objects.update_or_create(contact=contact, group=group,
                                                             defaults={'added_by': request.user})
            logger.debug(ca)
            return ca

    def form_valid(self, form):
        logger.debug("VALID FORM")
        contact = form.save()

        #is there an existing user already associated with this email?
        user = User.objects.filter(email=contact.email).first()
        if user:
            contact.user = user
        contact.added_by = self.request.user
        contact.save()

        #make association
        self.make_association(self.request, self.kwargs.get('pk'))

        return JsonResponse({'refresh': 1, 'new':reverse("cvdp:contact", args=[contact.id])}, status=200)



class ContactView(LoginRequiredMixin, UserPassesTestMixin, generic.DetailView):
    login_url = "authapp:login"
    template_name = "cvdp/contact.html"
    model = Contact

    def test_func(self):
        return self.request.user.is_coordinator

    def get_context_data(self, **kwargs):
        context = super(ContactView, self).get_context_data(**kwargs)
        context['contactpage'] = 1
        if self.request.GET.get('quick'):
            context['template'] = 'cvdp/card.html'
            context['quick'] = 1
        else:
            context['template'] = settings.CVDP_BASE_TEMPLATE

        context['associations'] = ContactAssociation.objects.filter(contact=self.object)
        return context
