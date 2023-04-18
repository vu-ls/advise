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

    def get_context_data(self, **kwargs):
        context = super(InboxView, self).get_context_data(**kwargs)
        context['inboxpage'] = 1
        if self.kwargs.get('contact'):
            context['contact'] = self.kwargs['contact']
        return context

    
class ThreadAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission)
    serializer_class = ThreadSerializer
    pagination_class = StandardResultsPagination

    def list(self, request, *args, **kwargs):
        content = self.get_queryset()
        page = self.paginate_queryset(content)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={'user': request.user})
            return self.get_paginated_response(serializer.data)
        return Response(self.serializer_class(content, many=True,
                                           context={'user': request.user}).data)
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return MessageThread.objects.none()
        # get cases I have access to
        if self.request.GET.get('search'):
            qs = MessageThread.all(self.request.user).filter(messages__content__icontains=self.request.GET['search'])
            return MessageThread.ordered(qs)
        return MessageThread.ordered(MessageThread.all(self.request.user))

    def create(self, request, *args, **kwargs):
        logger.debug(f"ThreadAPI Create: {request.data}")

        content = request.data.get('content', None)
        if not content:
            return Response({'content': 'Not message content present'},
                            status=status.HTTP_400_BAD_REQUEST)
            
        
        user_list = []
        #get all users
        for user in request.data.getlist('users'):
            contact = Contact.objects.filter(uuid=user).first()
            if (contact):
                user_list.append(contact.user)
            else:
                return Response({'invalid user': 'user does not exist'},
                                status=status.HTTP_400_BAD_REQUEST)
        
        msg = Message.new_message(self.request.user, user_list, None, "", request.data['content'])
        if msg:
            serializer = ThreadSerializer(msg.thread)
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            return Response({'error': 'Error creating message'},
                            status=status.HTTP_400_BAD_REQUEST)
    

class MessageAPIView(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated, PendingUserPermission)
    serializer_class = MessageSerializer

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Message.objects.none()
        thread = get_object_or_404(MessageThread, id=self.kwargs['pk'])
        if not UserThread.objects.filter(thread=thread, user=self.request.user).exists():
            #this isn't your thread, yo
            return Http404
        thread.userthread_set.filter(user=self.request.user).update(unread=False)
        return Message.objects.filter(thread=thread)

    def create(self, request, *args, **kwargs):
        thread = get_object_or_404(MessageThread, id=self.kwargs.get('pk'))
        
        msg = Message.new_reply(thread, self.request.user, request.data['content'])

        if msg:
            serializer = MessageSerializer(msg)
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            return Response({'error': 'Error creating message'},
                            status=status.HTTP_400_BAD_REQUEST)

