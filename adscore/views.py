from django.http import HttpResponse
from authapp.views import PendingTestMixin
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.shortcuts import get_object_or_404
from authapp.models import User
import logging
from django.utils import timezone
from django.views import generic, View
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError, PermissionDenied
from adscore.lib import load_new_cves, load_more_cves
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from cvdp.permissions import CoordinatorPermission, PendingUserPermission, is_coordinator
from cvdp.lib import generate_case_id
from cvdp.cases.serializers import SSVCSerializer
from cvdp.models import Case, Vulnerability, VulSSVC
from adscore.serializers import AdScoreSerializer, SSVCScoreSerializer
from adscore.models import Vul, SSVCScore, VulLock
from django.contrib.auth.decorators import login_required, user_passes_test

User = get_user_model()

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

@login_required(login_url="authapp:login")
@user_passes_test(is_coordinator, login_url="authapp:login")
def load_additional_cves(request):
    load_more_cves()
    return HttpResponse('')


class StandardResultsPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size= 100

class ScoreIndexView(LoginRequiredMixin, UserPassesTestMixin, generic.TemplateView):
    template_name = "adscore/vulnerabilties.html"
    login_url = "authapp:login"

    def test_func(self):
        return self.request.user.is_coordinator

    def get_context_data(self, **kwargs):
        context = super(ScoreIndexView, self).get_context_data(**kwargs)
        #load cves
        load_new_cves()
        #load_more_cves()

        return context


class VulAPIView(viewsets.ModelViewSet):
    serializer_class = AdScoreSerializer
    permission_classes = (IsAuthenticated, PendingUserPermission, CoordinatorPermission)
    pagination_class = StandardResultsPagination
    search_fields = ['cve', 'description']

    def get_view_name(self):
        return f"Scoring API"

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"user": self.request.user})
        return context

    def get_object(self):
        #get vul
        return get_object_or_404(Vul, cve=self.kwargs['cve'])
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Vul.objects.none()
        qs = Vul.objects.all().order_by('-last_modified')
        if self.request.GET.get('year'):
            qs = qs.filter(published__year=self.request.GET['year']).order_by('-last_modified')
        if self.request.GET.get('state'):
            logger.debug(self.request.GET['state'])
            if self.request.GET['state'] == 'SCORED':
                qs = qs.filter(ssvcscore__isnull=False)
            elif self.request.GET['state'] == 'NOT SCORED':
                qs = qs.filter(ssvcscore__isnull=True)
            elif "LOCKED" in self.request.GET['state']:
                qs = qs.filter(vullock__isnull=False)
        if self.request.GET.get('score'):
            scorelist = self.request.GET.getlist('score')
            qs = qs.filter(ssvcscore__final_decision__in=scorelist)
        return qs

    def create(self, request, *args, **kwargs):
        #this creates a new case from the vulnerability
        logger.debug(f"{self.__class__.__name__} post: {self.request.POST}")
        vul = get_object_or_404(Vul, cve=self.kwargs['cve'])

        #check here to see if this vul exists in another case!
        old_vul = Vulnerability.objects.filter(cve=vul.cve[4:]).first()
        if old_vul:
            return Response({'case': old_vul.case.get_absolute_url()}, status=status.HTTP_400_BAD_REQUEST)
        
        
        case_id = generate_case_id()
        case = Case(case_id=case_id,
                    title=f"Case for {vul.cve}",
                    summary = vul.description,
                    created_by = self.request.user)
        case.save()

        #copy vul
        new_vul = Vulnerability(cve=vul.cve[4:],
                            description = vul.description,
                            case=case,
                            user=self.request.user,
                            problem_types = vul.problem_types,
                            references=vul.references)
        new_vul.save()

        try:
            #COPY SCORE IF EXISTS
            if vul.ssvcscore:
                ssvc = VulSSVC(vul=new_vul,
                               user=self.request.user,
                               decision_tree = vul.ssvcscore.decision_tree,
                               tree_type = vul.ssvcscore.tree_type,
                               final_decision = vul.ssvcscore.final_decision,
                               vector = vul.ssvcscore.vector,
                               justifications=vul.ssvcscore.justifications,
                               last_edit = vul.ssvcscore.last_edit)
                ssvc.save()
        except SSVCScore.DoesNotExist:
            pass


        url = case.get_absolute_url()
        return Response({'case': url}, status=status.HTTP_202_ACCEPTED)
    
    def update(self, request, **kwargs):
        #get the vul
        logger.debug(f"{self.__class__.__name__} patch: {self.request.data}")
        vul = get_object_or_404(Vul, cve=self.kwargs['cve'])

        if 'unlock' in request.data:
            try:
                vullock = vul.vullock
            except VulLock.DoesNotExist:
                return Response({}, status=status.HTTP_202_ACCEPTED)
            if vullock.user == self.request.user:
                vullock.delete()
                logger.debug(f"UNLOCKING VUL {vul.cve}")
        elif 'lock' in request.data:
            vullock = VulLock.objects.filter(vul=vul).first()
            if vullock:
                if vullock.user != self.request.user:
                    return Response({'error': 'This vul is already locked by another user'}, status = status.HTTP_400_BAD_REQUEST)
            else:
                vullock = VulLock(vul = vul, user=self.request.user)
                vullock.save()
                logger.debug(f"LOCKING VUL {vul.cve}")

        return Response({}, status=status.HTTP_202_ACCEPTED)


class ScoreAPIView(viewsets.ModelViewSet):
    serializer_class = SSVCScoreSerializer
    permission_classes = (IsAuthenticated, CoordinatorPermission, PendingUserPermission)

    def get_view_name(self):
        return f"SSVC Scoring API"

    def get_object(self):
        #get score
        return get_object_or_404(SSVCScore, vul__cve=self.kwargs['cve'])

    def destroy(self, request, *args, **kwargs):
        vul = get_object_or_404(Vul, cve=self.kwargs['cve'])
        if (hasattr(vul, 'ssvcscore')):
            ssvc_score = vul.ssvcscore
            ssvc_score.delete()
            vul.locked = None
            vul.save()
            return Response({}, status=status.HTTP_202_ACCEPTED)
        else:
            return Response({'error': 'No score available'}, status=status.HTTP_400_BAD_REQUEST)


    def update(self, request, **kwargs):
        #get the vulnerability
        logger.debug(f"{self.__class__.__name__} patch: {self.request.data}")
        vul = get_object_or_404(Vul, cve=self.kwargs['cve'])
        if (hasattr(vul, 'ssvcscore')):
            #update
            serializer = self.serializer_class(instance=vul.ssvcscore, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                try:
                    vullock = vul.vullock
                    vullock.delete()
                except VulLock.DoesNotExist:
                    pass

                logger.debug(f"vul {vul.cve} unlocked")
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            serializer = self.serializer_class(data=request.data)
            if serializer.is_valid():
                ssvc = SSVCScore(vul=vul, user=self.request.user, **serializer.validated_data)
                ssvc.save()
                vul.locked = None
                vul.save()
                logger.debug(f"vul {vul.cve} unlocked")
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


        return Response({}, status=status.HTTP_202_ACCEPTED)
