from django.shortcuts import render
import logging
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.core.exceptions import PermissionDenied
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
from rest_framework.pagination import PageNumberPagination
from rest_framework import exceptions, generics, status, authentication, viewsets, mixins, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from cvdp.permissions import *
from cvdp.components.serializers import *
from cvdp.components.forms import *
from cvdp.lib import create_case_action
from django.db.models import Count, F

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

def _my_products(user):
    my_groups = user.groups.all()
    return Product.objects.filter(supplier__in=my_groups)

def _my_case_components(user, case):
    my_groups = user.groups.all()
    #get case participants
    my_part_groups = CaseParticipant.objects.filter(case=case, group__in=my_groups).values_list('group__id', flat=True)
    products = Product.objects.filter(supplier__in=my_part_groups).values_list('component__id', flat=True)
    return Component.objects.filter(id__in=products)

def _is_my_component(user, component):
    if user.is_coordinator:
        return True
    my_groups=user.groups.all()
    return Product.objects.filter(component=component, supplier__in=my_groups).exists()


class StandardResultsPagination(PageNumberPagination):
    page_size = 10
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
            component = serializer.save()
            component.added_by = self.request.user
            component.save()
        else:
            logger.debug(serializer.errors)
            return Response(serializer.error_messages,
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
        logger.debug(request.data)
        serializer = self.serializer_class(instance=instance, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            logger.debug(serializer.errors)
            return Response(serializer.error_messages,
                            status=status.HTTP_400_BAD_REQUEST)


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
        logger.debug(Component.objects.all())
        instance = get_object_or_404(Component, id=self.kwargs['pk'])
        
        if not(_is_my_component(request.user, instance)):
            raise PermissionDenied()
        logger.debug(request.data)
        #get dependency
        dependency = get_object_or_404(Component, id=request.data.get('dependency'))
        product = Product.objects.filter(component=instance).first()
        if product:
            product.dependencies.add(dependency)
        else:
            product = Product(component=instance)
            product.save()
            product.dependencies.add(dependency)
        return Response({}, status=status.HTTP_202_ACCEPTED)
    

class GroupComponentsAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission, GroupLevelPermission)
    serializer_class = ComponentSerializer

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
            component = serializer.save()
            component.added_by = self.request.user
            component.save()
            p = Product(component=component,
                        supplier=group)
            p.save()
        else:
            logger.debug(serializer.errors)
            return Response(serializer.error_messages,
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
                    p = Product.objects.update_or_create(component=component,
                                                          defaults={'supplier': group})
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
        if not(is_my_case(self.request.user, case.id)):
            raise PermissionDenied()
        #which components should we return here? if coordinator, return all
        components = ComponentStatus.objects.filter(vul__case=case).distinct('component__name').order_by('component__name')
        if self.request.user.is_coordinator:
            return components
        else:
            #get my components
            #get all case components
            case_components = components.values_list('component__id', flat=True)
            my_groups = my_case_vendors(self.request.user, case)
            products = Product.objects.filter(supplier__in=my_groups, component__in=case_components).values_list('component__id', flat=True)
            return components.filter(component__id__in=products)
            

    
    def create(self, request, *args, **kwargs):
        logger.debug("In STATUS CREATE VIEW")
        case = get_object_or_404(Case, case_id = self.kwargs['caseid'])
        logger.debug(request.data)
        if not(is_my_case(self.request.user, case.id)):
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


        #check status fiels are all there
        serializer = StatusSerializer(data=request.data)
        if serializer.is_valid():

            #get component
            if my_role == 'vendor':
                component = _my_case_components(self.request.user, case).filter(name=request.data['component']).first()
            else:
                #this really needs to be more specific
                component = Component.objects.filter(name=request.data['component']).first()

                
            if component == None:
                if my_role == 'vendor':
                    my_vendors = my_case_vendors(self.request.user, case)
                    if len(my_vendors) > 1:
                        errors = {'type': 'invalid vendor', 'status': status.HTTP_400_BAD_REQUEST, 'component':'Component does not exist and user belongs to more than 1 vendor. Add component to desired vendor before continuing'}
                        return JsonResponse(errors, status=status.HTTP_400_BAD_REQUEST)
                
                #create the component
                component = Component(name=request.data['component'],
                                      added_by=self.request.user)
                component.save()
                #who is adding this component?
                if my_vendors:
                    p = Product(component=component, supplier=my_vendors[0])
                    p.save()

            #get vuls
            for v in request.data['vuls']:
                vul = get_object_or_404(Vulnerability, id=v)
                cs, created = ComponentStatus.objects.update_or_create(component=component,
                                                              vul=vul)
                logger.debug(serializer.validated_data)
                sr  = StatusRevision(**serializer.validated_data)
                logger.debug(sr)
                sr.set_from_request(self.request)
                cs.add_revision(sr, save=True)

            return Response({}, status=status.HTTP_202_ACCEPTED)
        else:
            logger.debug(serializer.errors)
            return Response(serializer.error_messages,
                            status=status.HTTP_400_BAD_REQUEST)
            

    def destroy(self, request, *args, **kwargs):
        #TODO - fix permissions
        component = self.get_object()
        if component.component.get_vendor():
            action = create_case_action(f"Removed status for {component.component.get_vendor()}'s component {component.component.name} {component.component.version} for vulnerability {component.vul.vul}", request.user, component.vul.case)
        else:
            action = create_case_action(f"Removed status for {component.component.name} {component.component.version} for vulnerability {component.vul.vul}", request.user, component.vul.case)
        
        component.delete()
        
        return Response({}, status=status.HTTP_202_ACCEPTED)
        
    def update(self, request, **kwargs):
        #TODO - fix permissions
        #component = get_object_or_404(ComponentStatus, id=self.kwargs['pk'])
        component = self.get_object()
        
        data = request.data
        logger.debug(request.data)
        if request.data.get('vuls') == None:
            errors = {'type': 'invalid-format', 'status': status.HTTP_400_BAD_REQUEST, 'vuls':'missing required fields or invalid format'}
            return JsonResponse(errors, status=status.HTTP_400_BAD_REQUEST)
        #check status fields are all there
        serializer = StatusSerializer(data=request.data)
        if serializer.is_valid():
             #get vuls  
            for v in request.data['vuls']:
                vul = get_object_or_404(Vulnerability, id=v)
                cs, created = ComponentStatus.objects.update_or_create(component=component.component,
                                                                       vul=vul)
                logger.debug(serializer.validated_data)
                sr  = StatusRevision(**serializer.validated_data)
                logger.debug(sr)
                sr.set_from_request(self.request)
                cs.add_revision(sr, save=True)

            return Response({}, status=status.HTTP_202_ACCEPTED)
        else:
            logger.debug(serializer.errors)
            return Response(serializer.error_messages,
                            status=status.HTTP_400_BAD_REQUEST)


    
    
