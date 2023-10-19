from django.shortcuts import render
import logging
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.urls import reverse, reverse_lazy
from django.views import generic, View
import django_filters
from django.views.generic.edit import FormView, UpdateView, FormMixin, CreateView
from django.http import HttpResponse, Http404, JsonResponse, HttpResponseNotAllowed, HttpResponseServerError, HttpResponseForbidden, HttpResponseRedirect, HttpResponseBadRequest
from rest_framework import exceptions, generics, status, authentication, viewsets, mixins, filters
from cvdp.messages.serializers import *
from authapp.models import User
from django.core.exceptions import ValidationError, PermissionDenied
from django.utils.translation import gettext as _
from authapp.views import PendingTestMixin
# Create your views here.
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from cvdp.permissions import *
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
import traceback
from cvdp.forms import *
from cvdp.lib import validate_recaptcha, add_artifact
from cvdp.models import *
from django.core.paginator import Paginator
from rest_framework.views import APIView

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class UnreadMessageAPI(APIView):
    permission_classes = (IsAuthenticated, PendingUserPermission)

    def get(self, request, format=None):
        data = {}
        data['unread'] = len(MessageThread.ordered(MessageThread.unread(self.request.user)))
        data['user'] = data['unread']
        for group in self.request.user.groups.all():
            count = len(MessageThread.ordered(MessageThread.group_unread(group)))
            data['unread'] = data['unread'] + count
            data[str(group.groupprofile.uuid)] = count
        return Response(data)




class StandardResultsPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size= 100
    
"""
Inbox View - React App 'inbox'
#TODO - show deleted messages
"""
class InboxView(LoginRequiredMixin, PendingTestMixin, generic.TemplateView):
    template_name = "cvdp/new_inbox.html"
    login_url="authapp:login"

    def dispatch(self, request, *args, **kwargs):
        if self.kwargs.get('pk'):
            thread = get_object_or_404(MessageThread, id=self.kwargs['pk'])
            if is_my_msg_thread(self.request.user, thread):
                return super().dispatch(request, *args, **kwargs)
            raise Http404
        return super().dispatch(request, *args, **kwargs)
    
    def get_context_data(self, **kwargs):
        context = super(InboxView, self).get_context_data(**kwargs)
        context['inboxpage'] = 1
        if self.kwargs.get('contact'):
            context['contact'] = self.kwargs['contact']
        #get coord team
        context['team'] = GlobalSettings.objects.all().first()
        if self.kwargs.get('pk'):
            context['message'] = self.kwargs.get('pk')
            thread = MessageThread.objects.get(id=self.kwargs['pk'])
            if not UserThread.objects.filter(thread=thread, user=self.request.user).exists():
                gt = GroupThread.objects.filter(thread=thread).first()
                if gt:
                    logger.debug("SETTING ACTIVE TAB");
                    context['activetab'] = gt.group.id
        return context

class MessageUploadView(LoginRequiredMixin, generic.TemplateView):
    login_url = "authapp:login"
    template_name='cvdp/notemplate.html'

    def post(self, request, *args, **kwargs):
        thread = None
        if self.kwargs.get('pk'):
            logger.debug("CHECKING....")
            thread = get_object_or_404(MessageThread, id=self.kwargs['pk'])
            if not is_my_msg_thread(self.request.user, thread):
                raise PermissionDenied()
        logger.debug(f"Files Post: {self.request.FILES}")
        artifact = add_artifact(self.request.FILES['image'])
        ca = MessageAttachment(file=artifact,
                               thread=thread,
                               user=self.request.user)
        ca.save()
        url = reverse("cvdp:artifact", args=[ca.file.uuid])
        return JsonResponse({'status': 'success', 'image_url': url}, status=200)

    
class ThreadAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission)
    serializer_class = ThreadSerializer
    pagination_class = StandardResultsPagination

    def list(self, request, *args, **kwargs):
        logger.debug("IN PAGINATE")
        content = self.get_queryset()
        page = self.paginate_queryset(content)
        if self.request.GET.get('group'):
            group = get_object_or_404(Group, groupprofile__uuid=self.request.GET.get('group'))
            if not self.request.user.groups.filter(id=group.id).exists():
                group = None
        else:
            group = None
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={'user': request.user, 'group': group})
            return self.get_paginated_response(serializer.data)
        return Response(self.serializer_class(content, many=True,
                                           context={'user': request.user, 'group': group}).data)
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return MessageThread.objects.none()

        #if group
        if self.request.GET.get('group'):
            group = get_object_or_404(Group, groupprofile__uuid=self.request.GET.get('group'))
            if self.request.user.groups.filter(id=group.id).exists():
                if self.request.GET.get('search'):
                    return MessageThread.ordered(MessageThread.group(group).filter(messages__content__icontains=self.request.GET['search']))
                return MessageThread.ordered(MessageThread.group(group))
        
        # get cases I have access to
        if self.request.GET.get('search'):
            qs = MessageThread.all(self.request.user).filter(messages__content__icontains=self.request.GET['search'])
            return MessageThread.ordered(qs)
        return MessageThread.ordered(MessageThread.all(self.request.user))

    def create(self, request, *args, **kwargs):
        logger.debug(f"ThreadAPI Create: {request.data}")

        token = request.data.get('token', None)
        if token:
            if not validate_recaptcha(token):
                return Response({'message': 'Invalid ReCAPTCHA. Please try again'}, status=status.HTTP_400_BAD_REQUEST)
        
        content = request.data.get('content', None)
        if not content or (content == "<p><br></p>"):
            #this is equivalent to an empty message (for some reason when you enter and then remove content,
            #quill automatically adds this and there's no way to remove it"
            return Response({'message': 'No message content present'},
                            status=status.HTTP_400_BAD_REQUEST)
            

        from_group = request.data.get('from')
        user_list = []
        group_list = []
        if from_group:
            from_group = Group.objects.filter(groupprofile__uuid=from_group).first()
            if from_group:
                group_list.append(from_group)
        #get all users
        for user in request.data.getlist('users[]'):
            contact = Contact.objects.filter(uuid=user).first()
            if (contact):
                user_list.append(contact.user)
            else:
                #lookup group
                group = Group.objects.filter(groupprofile__uuid=user).first()
                if (group):
                    group_list.append(group)
                else:
                    return Response({'message': 'invalid to: user/group does not exist'},
                                    status=status.HTTP_400_BAD_REQUEST)
        if not request.data.getlist('users[]'):
            #get coordination team
            group = GlobalSettings.objects.all().first()
            if not group:
                return Response({'message': 'Invalid Group: AdVISE improperly configured'},
                                status = status.HTTP_400_BAD_REQUEST)
            #this is a message to the coordinators
            msg = Message.new_group_message(self.request.user, None, [group.group], None, "", request.data['content'])
        else:
            if user_list and group_list:
                msg = Message.new_group_user_message(self.request.user, from_group,  user_list, group_list, None, "", request.data['content'])
            elif user_list:
                msg = Message.new_message(self.request.user, from_group, user_list, None, "", request.data['content'])
            else:
                msg = Message.new_group_message(self.request.user, from_group, group_list, None, "", request.data['content'])

        if msg:
            serializer = ThreadSerializer(msg.thread)
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            return Response({'message': 'Error creating message'},
                            status=status.HTTP_400_BAD_REQUEST)
    

class MessageAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission)
    serializer_class = MessageSerializer

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Message.objects.none()
        thread = get_object_or_404(MessageThread, id=self.kwargs['pk'])
        if not UserThread.objects.filter(thread=thread, user=self.request.user).exists():
            my_groups = self.request.user.groups.values_list('id', flat=True)
            gt = GroupThread.objects.filter(thread=thread, group__in=my_groups).first()
            if not gt:
                #this isn't your thread, yo
                raise Http404
            else:
                gt.unread=False
                gt.save()
        else:
            thread.userthread_set.filter(user=self.request.user).update(unread=False)
        return Message.objects.filter(thread=thread)

    def create(self, request, *args, **kwargs):
        thread = get_object_or_404(MessageThread, id=self.kwargs.get('pk'))
        logger.debug(request.data)
        token = request.data.get('token', None)
        if token:
            if not validate_recaptcha(token):
                return Response({'message': 'Invalid ReCAPTCHA. Please try again'}, status=status.HTTP_400_BAD_REQUEST)
        
        msg = Message.new_reply(thread, self.request.user, request.data['content'])

        if msg:
            serializer = MessageSerializer(msg)
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            return Response({'error': 'Error creating message'},
                            status=status.HTTP_400_BAD_REQUEST)

