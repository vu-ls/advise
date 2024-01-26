from django.shortcuts import render
import logging
import os
from io import StringIO
from django.shortcuts import render, redirect, get_object_or_404
from django.core.files.base import ContentFile
from django.contrib import messages
from django.core.exceptions import PermissionDenied
from django.core.management import call_command
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
import re
from cvdp.manage.forms import *
from rest_framework.pagination import PageNumberPagination
from rest_framework import exceptions, generics, status, authentication, viewsets, mixins, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated
import tempfile
from cvdp.permissions import *
from cvdp.components.serializers import *
from cvdp.components.forms import *
from cvdp.lib import create_case_action
from django.db.models import Count, F, Q

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

def _my_products(user):
    my_groups = user.groups.all()
    return Product.objects.filter(supplier__in=my_groups)

def _find_version(name):
    m = re.search("(?:(\d+)\.)?(?:(\d+)\.)?(\*|\d+)$", name)
    if m:
        return m.group(0)
    else:
        return "0.0"

def _my_case_components(user, case):
    my_groups = user.groups.all()
    #get case participants
    my_part_groups = CaseParticipant.objects.filter(case=case, group__in=my_groups).values_list('group__id', flat=True)
    products = Product.objects.filter(supplier__in=my_part_groups).values_list('component__id', flat=True)
    return Component.objects.filter(id__in=products)

#components is a queryset of components this user has access to
# that have the component name specified, but we need to get a little more specific

def _find_component(components, data):

    if components:
        c = components.filter(version=data['version'])
        if c:
            return c.first()
        else:
            c = components.filter(version__isnull=True).first()
            if c:
                c.version = data['version']
                c.save()
                return c
    return None


def _is_my_component(user, component):
    if user.is_coordinator:
        return True
    my_groups=user.groups.all()
    return Product.objects.filter(component=component, supplier__in=my_groups).exists()


def create_component_action(title, user, comp, action):
    action = ComponentAction(component = comp,
                             user=user,
                             title=title,
                             action_type=action,
                             created=timezone.now())
    action.save()
    return action


def create_component_change(action, field, old_value, new_value):

    if (not old_value and not new_value):
        return

    change = ComponentChange(action=action,
                             field = field,
			     old_value=old_value,
                             new_value=new_value)
    change.save()
    return change


class StandardResultsPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size= 100

#TODO Add PAGINATION
class ComponentAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission)
    serializer_class = ComponentSerializer
    search_fields = ['name', 'supplier', 'comment']
    pagination_class = StandardResultsPagination


    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Component.objects.none()
        if self.request.user.is_coordinator:
            return Component.objects.all()
        else:
            return my_components(self.request.user)

    def get_object(self):
        obj = get_object_or_404(Component, id=self.kwargs['pk'])
        if _is_my_component(self.request.user, obj):
            return obj
        else:
            raise PermissionDenied()

    def get_view_name(self):
        return f"Components"

    def create(self, request, *args, **kwargs):
        logger.debug(request.data)
        if not(request.user.is_coordinator):
            raise PermissionDenied()

        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            #does component already exist?
            comp = Component.objects.filter(name__iexact=request.data['name'], version=request.data['version']).first()
            if comp:
                return Response({'detail': 'component (name/version) already exists'}, status=status.HTTP_400_BAD_REQUEST)

            component = serializer.save()
            component.added_by = self.request.user
            component.save()

            if request.data.get('clone'):
                #get original component
                old_comp = Component.objects.filter(id=request.data['clone']).first()
                if old_comp:
                    create_component_action(f"cloned component {old_comp.name} {old_comp.version}", self.request.user, component, 1)
                    #clone dependencies
                    prod = Product.objects.filter(component=old_comp).first()
                    if (prod and (prod.dependencies.count() > 0)):
                        #create cloned product
                        cloned_prod = Product(component=component)
                        if prod.supplier:
                            #clone owner too
                            cloned_prod.supplier=prod.supplier
                        cloned_prod.save()
                        #copy dependencies to cloned component
                        for dep in prod.dependencies.all():
                            cloned_prod.dependencies.add(dep)
                            action = create_component_action(f"added dependency {dep} to cloned component", self.request.user, component, 4)
            else:
                create_component_action("created component", self.request.user, component, 1)
        else:
            logger.debug(serializer.errors)
            return Response(serializer.errors,
                            status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)


    def destroy(self, request, *args, **kwargs):
        #TODO: should vendors be able to remove their own components? Maybe ones they have added?
        if not(request.user.is_coordinator):
            raise PermissionDenied()
        component = get_object_or_404(Component, id=self.kwargs['pk'])
        component.delete()
        return Response({}, status=status.HTTP_202_ACCEPTED)

    def update(self, request, **kwargs):
        instance = self.get_object()

        data = request.data
        version = data.get('version', instance.version)
        name = data.get('name', instance.name)
        logger.debug(request.data)
        serializer = self.serializer_class(instance=instance, data=data, partial=True)
        if serializer.is_valid():
            #does component already exist?
            if ((version != instance.version) or (name != instance.name)):
                #something changed, so check to see if new tuple alreay exists
                comp = Component.objects.filter(name__iexact=name, version=version).first()
                if comp:
                    return Response({'detail': 'component already exists'}, status=status.HTTP_400_BAD_REQUEST)
            action = create_component_action("modified component", self.request.user, instance, 2)
            for field, val in data.items():
                if (val != getattr(instance, field, None)):
                    create_component_change(action, field, getattr(instance, field), val);

            serializer.save()

            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            logger.debug(serializer.errors)
            return Response(serializer.errors,
                            status=status.HTTP_400_BAD_REQUEST)

class ComponentDetailView(LoginRequiredMixin, UserPassesTestMixin, generic.DetailView):
    model = Component
    login_url = "authapp:login"
    template_name = "cvdp/component.html"

    def test_func(self):
        component = self.get_object()
        return is_my_component(self.request.user, component)

    
    def get_object(self, queryset=None):
        return Component.objects.get(id=self.kwargs['pk'])

    
        
class ProductAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission)
    serializer_class = ProductSerializer

    def get_view_name(self):
        return f"List Component Dependencies"

    def get_object(self):
        product = get_object_or_404(Product, component__id=self.kwargs['pk'])
        if _is_my_component(self.request.user, product.component):
            return product
        else:
            raise PermissionDenied()

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Product.objects.none()

        if self.request.user.is_coordinator:
            return Product.objects.all()
        return _my_products(self.request.user)

    def update(self, request, **kwargs):
        #get component
        logger.debug("IN UPDATE COMPONENT -PRODUCT API VIEW")
        logger.debug(self.kwargs['pk'])
        instance = get_object_or_404(Component, id=self.kwargs['pk'])

        if not(_is_my_component(request.user, instance)):
            raise PermissionDenied()
        logger.debug(request.data)
        #get dependency
        dependency = get_object_or_404(Component, id=request.data.get('dependency'))
        product = Product.objects.filter(component=instance).first()
        if product:
            if request.data.get('remove'):
                action = create_component_action(f"removed dependency {dependency}", self.request.user, instance, 5)
                product.dependencies.remove(dependency)
            else:
                if product.component == dependency:
                    return Response({'detail': 'You can not add this component as a dependency of itself.'}, status=status.HTTP_400_BAD_REQUEST)
                action = create_component_action(f"added dependency {dependency}", self.request.user, instance, 4)
                product.dependencies.add(dependency)
        else:
            #sometimes we hit a race condition here when axios is submitting multiple dependencies.
            product, created = Product.objects.update_or_create(component=instance)
            product.dependencies.add(dependency)
            action = create_component_action(f"added dependency {dependency}", self.request.user, instance, 4)
        return Response({}, status=status.HTTP_202_ACCEPTED)


class GroupComponentsAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission, GroupLevelPermission)
    serializer_class = ComponentSerializer
    search_fields = ['name', 'supplier', 'comment']
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Component.objects.none()

        group = get_object_or_404(Group, id=self.kwargs['pk'])
        self.check_object_permissions(self.request, group)
        products = Product.objects.filter(supplier=group).values_list('component__id', flat=True)
        return Component.objects.filter(id__in=products)

    def get_view_name(self):
        group = get_object_or_404(Group, id=self.kwargs['pk'])
        return f"{group.name}'s Components"

    def create(self, request, *args, **kwargs):
        logger.debug(request.data)
        group = get_object_or_404(Group, id=self.kwargs['pk'])
        self.check_object_permissions(self.request, group)
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            #does component already exist?
            comp = Product.objects.filter(component__name__iexact=request.data['name'], component__version=request.data['version'], supplier=group).first()
            if comp:
                return Response({'detail': 'Component already exists'}, status=status.HTTP_400_BAD_REQUEST)
            component = serializer.save()
            component.added_by = self.request.user
            component.save()
            action = create_component_action(f"created component for {group.name}", self.request.user, component, 1)
            p = Product(component=component,
                        supplier=group)
            p.save()
        else:
            logger.debug(serializer.errors)
            return Response(serializer.errors,
                            status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)


"""
Components Views - React app "componentapp"
"""
class ComponentView(LoginRequiredMixin, UserPassesTestMixin, generic.TemplateView):
    template_name="cvdp/components.html"
    login_url = "authapp:login"

    def test_func(self):
        if self.request.user.is_coordinator or self.request.user.is_staff or self.request.user.is_superuser:
            return True
        elif self.request.user.groups.count():
            return True
        return False

    def get(self, request, *args, **kwargs):
        #TEMPORARY
        return render(request, self.template_name, {'componentspage': 1})
        if self.request.user.is_coordinator or self.request.user.is_staff or self.request.user.is_superuser:
            return render(request, self.template_name, {'componentspage': 1})
        else:
            my_group = self.request.user.groups.all().first()
            return render(request, "cvdp/group_components.html", {'group': my_group, 'componentspage': 1})



class AddComponentView(LoginRequiredMixin, PendingTestMixin, FormView):
    template_name = "cvdp/addcomponent.html"
    login_url = "authapp:login"
    form_class = AddComponentForm

    def get_success_url(self):
        return reverse_lazy("cvdp:components")

    def get_context_data(self, **kwargs):
        context = super(AddComponentView, self).get_context_data(**kwargs)
        if self.kwargs.get('pk'):
            component = get_object_or_404(Component, id=self.kwargs['pk'])
            context['form'] = AddComponentForm(instance=component)
        return context


    def form_valid(self, form):
        c = form.save()
        action = create_component_action(f"created component", self.request.user, c, 1)
        messages.success(
            self.request,
            "Got it! Your component has been added."
        )
        return super().form_valid(form)

class ChangeComponentOwnershipView(LoginRequiredMixin, PendingTestMixin, FormView):
    http_method_names=['post']
    template_name="cvdp/notemplate.html"
    login_url="authapp:login"

    def post(self, request, *args, **kwargs):
        logger.debug(f"{self.__class__.__name__} post: {self.request.POST}")
        #get group
        if self.request.POST.get('group') and self.request.POST.get('components[]'):
            group = get_object_or_404(Group, groupprofile__uuid=self.request.POST['group'])
            # check permissions
            if self.request.user.is_coordinator or self.request.user.groups.filter(id=group.id).exists():
                for c in self.request.POST.getlist('components[]'):
                    component = get_object_or_404(Component, id=c)
                    # update product
                    action = create_component_action(f"modified component owner", self.request.user, component, 2)
                    create_component_change(action, "owner", component.get_vendor(), group.name)
                    p = Product.objects.update_or_create(component=component,
                                                         defaults={'supplier': group})
                    if not component.supplier:
                        #if no supplier, add group as supplier
                        component.supplier=group.name
                        component.save()
                return JsonResponse({}, status=status.HTTP_202_ACCEPTED)
            else:
                raise PermissionDenied()

        return JsonResponse({'message': 'missing required values'}, status=status.HTTP_400_BAD_REQUEST)


class ComponentStatusAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission)
    serializer_class = StatusSummarySerializer
    #lookup_field = "case_id"

    def get_view_name(self):
        return f"Case Component Status"

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ComponentStatus.objects.none()
        if self.kwargs.get('pk'):
            cs = get_object_or_404(ComponentStatus, id=self.kwargs['pk'])
            case = cs.vul.case
        else:
            case = get_object_or_404(Case, case_id = self.kwargs['caseid'])
        if not is_my_case(self.request.user, case.id):
            raise PermissionDenied()
        #which components should we return here? if coordinator, return all
        components = ComponentStatus.objects.filter(vul__case=case).distinct('component__name', 'component__version').order_by('component__name', 'component__version')
        if self.request.user.is_coordinator:
            return components
        else:
            #get my components
            #get all case components
            case_components = components.values_list('component__id', flat=True)
            my_groups = my_case_vendors(self.request.user, case)
            if my_groups:
                products = Product.objects.filter(supplier__in=my_groups, component__in=case_components).values_list('component__id', flat=True)
                return components.filter(component__id__in=products)
            else:
                return components.filter(current_revision__user=self.request.user)

    #TO DO ADD A SHARED COMPONENT STATUS VIEW (share = True)

    def create(self, request, *args, **kwargs):
        logger.debug("In STATUS CREATE VIEW")
        case = get_object_or_404(Case, case_id = self.kwargs['caseid'])
        logger.debug(request.data)
        if not is_my_case(self.request.user, case.id):
            raise PermissionDenied()
        
        my_role = my_case_role(self.request.user, case)
        my_vendors = None
        if my_role in ["participant", "reporter", "observer"]:
            #these roles don't need to add a status
            raise PermissionDenied()


        #get the vul
        if request.data.get('vuls') == None:
            errors = {'type': 'invalid-format', 'status': status.HTTP_400_BAD_REQUEST, 'vuls':'missing required fields or invalid format'}
            return JsonResponse(errors, status=status.HTTP_400_BAD_REQUEST)
        if request.data.get('component') == None:
            errors = {'type': 'invalid-format', 'status': status.HTTP_400_BAD_REQUEST, 'component':'missing required fields or invalid format'}
            return JsonResponse(errors, status=status.HTTP_400_BAD_REQUEST)


        #check status fields are all there
        serializer = StatusSerializer(data=request.data)
        if serializer.is_valid():

            #get component
            if my_role == 'supplier':
                components = _my_case_components(self.request.user, case).filter(name=request.data['component'])
                component = _find_component(components, request.data)

            else:
                #this really needs to be more specific
                components = Component.objects.filter(name=request.data['component'])
                component = _find_component(components, request.data)

            if component == None:
                if my_role == 'supplier':
                    my_vendors = my_case_vendors(self.request.user, case)
                    if len(my_vendors) > 1:
                        errors = {'type': 'invalid vendor', 'status': status.HTTP_400_BAD_REQUEST, 'component':'Component does not exist and user belongs to more than 1 vendor. Add component to desired vendor before continuing'}
                        return JsonResponse(errors, status=status.HTTP_400_BAD_REQUEST)

                #create the component
                component = Component(name=request.data['component'],
                                      version = request.data['version'],
                                      added_by=self.request.user)
                if request.data.get('supplier'):
                    component.supplier = request.data.get('supplier')
                component.save()
                action = create_component_action(f"created component", self.request.user, component, 1)
                #who is adding this component?
                if my_vendors:
                    p = Product(component=component, supplier=my_vendors[0])
                    p.save()

            #get vuls
            for v in request.data['vuls']:
                share =	False
                if request.data.get('share'):
                    share = True if (request.data['share'] == "true" or request.data['share'] == True) else False
                logger.debug(f" VUL IS {v}")
                vul = get_object_or_404(Vulnerability, id=v)
                #does cs exist?
                cs, created = ComponentStatus.objects.update_or_create(component=component,
                                                                       vul=vul, defaults={'share': share})

                logger.debug(serializer.validated_data)
                sr  = StatusRevision(**serializer.validated_data)
                logger.debug(f"DEFAULT STATUS {sr.default_status}")
                sr.set_from_request(self.request)
                cs.add_revision(sr, save=True)

                #update case modified
                cs.vul.case.modified = timezone.now()
                cs.vul.case.save()

                action = create_component_action(f"add component status for {vul.vul}", self.request.user, component, 6)

            return Response({}, status=status.HTTP_202_ACCEPTED)
        else:
            logger.debug(serializer.errors)
            return Response(serializer.errors,
                            status=status.HTTP_400_BAD_REQUEST)


    def destroy(self, request, *args, **kwargs):
        component = self.get_object()
        #now check if this user has access to this component
        if not is_case_owner_or_staff(self.request.user, component.vul.case.id):
            if _is_my_component(self.request.user, component.component):
                if self.request.user.is_coordinator:
                    #user must be owner or staff to delete
                    raise PermissionDenied()
            else:
                raise PermissionDenied()    
        

        if component.component.get_vendor():
            action = create_case_action(f"Removed status for {component.component.get_vendor()}'s component {component.component.name} {component.component.version} for vulnerability {component.vul.vul}", request.user, component.vul.case)
        else:
            action = create_case_action(f"Removed status for {component.component.name} {component.component.version} for vulnerability {component.vul.vul}", request.user, component.vul.case)

        action = create_component_action(f"remove component status for {component.vul.vul}", self.request.user, component.component, 6)
        component.delete()

        return Response({}, status=status.HTTP_202_ACCEPTED)

    def update(self, request, **kwargs):
        component = self.get_object()

        #now check if this user has access to this component
        if not is_case_owner_or_staff(self.request.user, component.vul.case.id):
            if _is_my_component(self.request.user, component.component):
                if self.request.user.is_coordinator:
                    #user must be owner or staff to delete
                    raise PermissionDenied()


        data = request.data
        share = False
        if data.get('share'):
            share = True if (data['share'] == "true" or data['share'] == True) else False

        logger.debug(request.data)
        if request.data.get('vuls') == None:
            errors = {'type': 'invalid-format', 'status': status.HTTP_400_BAD_REQUEST, 'vuls':'missing required fields or invalid format'}
            return JsonResponse(errors, status=status.HTTP_400_BAD_REQUEST)
        #check status fields are all there
        serializer = StatusSerializer(data=request.data)
        if serializer.is_valid():
             #get vuls
            logger.debug(request.data['vuls'])
            for v in request.data['vuls']:
                logger.debug(f"VUL is {v}")
                vul = get_object_or_404(Vulnerability, id=v)
                logger.debug(f"VUL IS {vul}")
                cs = ComponentStatus.objects.filter(component=component.component, vul=vul).first()
                if cs:
                    data = request.data
                    change = False
                    #are there any actual changes?
                    logger.debug(cs.current_revision.get_status_display())
                    if (cs.current_revision.get_status_display() != data["status"]):
                        change = True
                    elif(cs.current_revision.version_value != data["version"]):
                        change=True
                    elif (cs.current_revision.get_version_affected_display() != data["version_affected"]):
                        change = True
                    elif (cs.current_revision.statement != data["statement"]):
                        change = True
                    elif (data.get('justification') and cs.current_revision.justification != data["justification"]):
                        change = True
                    elif (cs.current_revision.version_name != data["version_end_range"]):
                        change = True
                    elif (cs.current_revision.default_status != data['default_status']):
                        change = True
                        
                    if cs.share != share:
                        cs.share = share
                        cs.save()
                        action = create_component_action(f"modify share status for {vul.vul}", self.request.user, component.component, 6)

                    if not change:
                        continue
                    #return Response({}, status=status.HTTP_202_ACCEPTED)
                else:
                    cs = ComponentStatus(component=component.component,
                                         vul=vul,
                                         share=share)
                    cs.save()

                logger.debug(serializer.validated_data)
                sr  = StatusRevision(**serializer.validated_data)
                sr.set_from_request(self.request)
                cs.add_revision(sr, save=True)
                action = create_component_action(f"update component status for {vul.vul}", self.request.user, component.component, 6)
            return Response({}, status=status.HTTP_202_ACCEPTED)
        else:
            logger.debug(serializer.errors)
            return Response(serializer.errors,
                            status=status.HTTP_400_BAD_REQUEST)

class StatusTransfersAPIView(viewsets.ModelViewSet):
    serializer_class = StatusTransferSerializer
    permission_classes = (IsAuthenticated, CoordinatorPermission)

    def get_view_name(self):
        return f"Status Transfers"

    def get_queryset(self):
        case = get_object_or_404(Case, case_id=self.kwargs['caseid'])
        return ComponentStatusUpload.objects.filter(case=case, merged=False, deleted=False)

    def update(self, request, **kwargs):
        logger.debug(f"{self.__class__.__name__} update: {self.request.POST}")
        transfer = get_object_or_404(ComponentStatusUpload, id=self.kwargs['pk'])
        data = request.data
        case = transfer.case
        if not is_case_owner_or_staff(self.request.user, case.id):
            raise PermissionDenied()
        sc = self.get_serializer_class()
        serializer = sc(instance=transfer, data=data, partial=True)
        if serializer.is_valid():
            if request.data.get('deleted'):
                action = create_case_action(f"rejected status transfer", request.user, case, False)
            elif request.data.get('merged'):
                #this is where we do all the status merging

                for stmt in transfer.vex['statements']:

                    cve = stmt['vulnerability']
                    if cve.lower().startswith('cve-'):
                        cve = cve[4:]

                    vul = Vulnerability.objects.filter(cve=cve, case=case).first()
                    if not vul:
                        return Response({'detail': f'No vulnerability {cve} within this case.'}, status=status.HTTP_400_BAD_REQUEST)
                    vstatus = stmt['status']
                    if vstatus in ["not_affected", "unaffected"]:
                        vstatus = 0
                    elif vstatus == "affected":
                        vstatus = 1
                    elif vstatus == "fixed":
                        vstatus = 2
                    else:
                        vstatus = 3
                    if "justification" in stmt:
                        justification = stmt["justification"]
                    else:
                        justification = None
                    for p in stmt['products']:
                        #create the component
                        component = Component.objects.filter(name=p).first()
                        if component == None:
                            component = Component(name=p,
                                                  added_by=self.request.user)
                            component.save()
                        #attempt to get version
                        version = _find_version(p)
                        cs, created = ComponentStatus.objects.update_or_create(component=component, vul=vul)
                        sr = StatusRevision(status=vstatus, justification=justification,
                                            version_value=version, statement=stmt.get('impact_statement', None), user=transfer.user)
                        cs.add_revision(sr, save=True)

                        action = create_case_action(f"merged status transfer from {transfer.user} for vul {vul.vul} and {component.name}",
                                                    request.user, case, False)

            serializer.save()
            logger.debug(serializer.data)
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            logger.debug(serializer.errors)
            return Response(serializer.errors,
	                    status=status.HTTP_400_BAD_REQUEST)


class ComponentStatusRevisionAPIView(viewsets.ModelViewSet):
    serializer_class = StatusRevisionSerializer
    permission_classes = (IsAuthenticated, PendingUserPermission)

    def get_view_name(self):
        return f"Status Revision API"

    def get_queryset(self):
        cs = get_object_or_404(ComponentStatus, id=self.kwargs['pk'])
        case = cs.vul.case
        if not(is_my_case(self.request.user, case.id)):
            raise PermissionDenied()
        if not(_is_my_component(self.request.user, cs.component)):
            raise PermissionDenied()
        return StatusRevision.objects.filter(component_status=cs).order_by('-revision_number')


class CaseComponentAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission)
    serializer_class = ComponentStatusSerializer

    def list(self, request, *args, **kwargs):
        content = self.get_queryset()
        return Response(self.serializer_class(content, many=True,
                                              context={'user': request.user}).data)
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"user": self.request.user})
        return context

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view',None):
            return ComponentStatus.objects.none()
        component = get_object_or_404(Component, id=self.kwargs['pk'])
        if not(_is_my_component(self.request.user, component)):
            raise PermissionDenied()
        cases = my_cases(self.request.user)
        return ComponentStatus.objects.filter(component=component, vul__case__in=cases)

class UploadSPDXFile(LoginRequiredMixin, UserPassesTestMixin, generic.TemplateView):
    login_url = "authapp:login"
    template_name='cvdp/notemplate.html'

    def test_func(self):
        if (self.kwargs.get('pk')):
            group = get_object_or_404(Group, id=self.kwargs['pk'])
            if self.request.user.groups.filter(id=group.id).exists():
                return True
        elif self.request.user.is_coordinator:
            return True
        raise PermissionDenied()

    def post(self, request, *args, **kwargs):
        group = None
        if (self.kwargs.get('pk')):
            group = get_object_or_404(Group, id=self.kwargs['pk'])

        logger.debug(f"Files Post: {self.request.FILES}")
        (this_file_name, this_file_extension) = os.path.splitext(self.request.FILES['file'].name)

        tf = tempfile.NamedTemporaryFile(suffix=this_file_extension)
        with open(tf.name, 'wb+') as destination:
            for chunk in self.request.FILES['file'].chunks():
                destination.write(chunk)
        try:
            if group:
                call_command('loadspdx', tf.name, '--assume-relationships', f'--group={group.id}', f'--user={self.request.user.id}')
            else:
                call_command('loadspdx', tf.name, '--assume-relationships', f'--user={self.request.user.id}')
        except Exception as e:
            logger.debug(traceback.format_exc())
            return JsonResponse({'error': f'Problem uploading SPDX file: {str(e)}'}, status=400)

        return JsonResponse({'status': 'success'}, status=200)

class DownloadSPDXFile(LoginRequiredMixin, UserPassesTestMixin, generic.TemplateView):
    login_url = "authapp:login"
    template_name = "cvdp/notmpl"

    def test_func(self):
        obj = get_object_or_404(Component, id=self.kwargs['pk'])
        if _is_my_component(self.request.user, obj):
            return True
        return False

    def get(self, request, *args, **kwargs):
        obj = get_object_or_404(Component, id=self.kwargs['pk'])
        format = self.request.GET.get('format', 'json')
        tf = tempfile.NamedTemporaryFile(suffix=f".{format}")
        try:
            call_command('createspdx', f'--out={tf.name}', f'--id={obj.id}', f'--email={self.request.user.email}', f'--creator={self.request.user.get_full_name()}')
        except Exception as e:
            logger.debug(traceback.format_exc())
            return JsonResponse({'error': f'Problem generating SPDX file: {str(e)}'}, status=400)

        action = create_component_action(f"generated {format} spdx file", self.request.user, obj, 3)
        with open(tf.name, 'r') as content:
            sbom = ContentFile(content.read(), name=f"{obj.name}_{obj.version}.{format}")
            mime_type = 'application/json'
            response = HttpResponse(sbom, content_type = mime_type)
            response['Content-Disposition'] = 'attachment; filename=' + sbom.name
            response["Content-type"] = "application/json"
            response["Cache-Control"] = "must-revalidate"
            response["Pragma"] = "must-revalidate"
            return response

"""
Component Action API
"""
class ComponentActionAPIView(viewsets.ModelViewSet):
    serializer_class = ComponentActionSerializer
    permission_classes = (IsAuthenticated, PendingUserPermission)
    pagination_class=StandardResultsPagination

    def get_view_name(self):
        return f"Component Action"

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ComponentAction.objects.none()
        actions = []
        if self.kwargs.get('pk'):
            component = get_object_or_404(Component, id=self.kwargs['pk'])

            if not(_is_my_component(self.request.user, component)):
                raise PermissionDenied()
            actions = ComponentAction.objects.filter(component=component).order_by('-created')

        return actions
