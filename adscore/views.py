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
from adscore.lib import load_new_cves
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from cvdp.permissions import CoordinatorPermission, PendingUserPermission, is_coordinator
from cvdp.lib import generate_case_id, create_case_action
from cvdp.cases.serializers import SSVCSerializer
from cvdp.models import Case, Vulnerability, VulSSVC
from adscore.serializers import AdScoreSerializer, SSVCScoreSerializer, ScoreActivitySerializer
from adscore.models import Vul, SSVCScore, VulLock, SSVCScoreActivity, ScoreChange
from django.contrib.auth.decorators import login_required, user_passes_test
import re
import shlex

User = get_user_model()

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

def create_score_change(action, field, old_value, new_value):

    if (not old_value and not new_value):
        #ignore if change is going from null to [] or vice versa                                                         
        return

    change = ScoreChange(action=action,
                         field = field,
			 old_value=old_value,
                         new_value=new_value)
    change.save()
    return change

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
        context['scoringpage'] = 1
        return context


def process_search(s, live=True):
    query = re.sub(r"[!'()|&<>]", ' ', s).strip()
    # get rid of empty quotes                                                                                       
    query = re.sub(r'""', '', query)
    if query == '"':
        return None
    if query.isnumeric():
        query = f'-{query}'
    elif (re.search(r"([0-9]{4}-\d+)", query)):
        #query looks like 2023-1111
        query = f'-{query}'
        
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


    
class VulAPIView(viewsets.ModelViewSet):
    serializer_class = AdScoreSerializer
    permission_classes = (IsAuthenticated, PendingUserPermission, CoordinatorPermission)
    pagination_class = StandardResultsPagination

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
        if self.request.GET.get('search'):
            search_term = process_search(self.request.GET.get('search'))
            qs = qs.extra(where=["search_vector @@ (to_tsquery('english', %s))=true"],params=[search_term])
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

        create_case_action(f"created case from {vul.cve}", self.request.user, case) 
        
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
                        
                action = SSVCScoreActivity(score=vul.ssvcscore,
                                           title=f"created case {case.case_for_url} from vulnerability",
                                           user=request.user)
                action.save()
        

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
                # check that decision_tree has correct format
                if serializer.validated_data.get('decision_tree'):
                    for dec in serializer.validated_data['decision_tree']:
                        if not(dec.get('label') and dec.get('value')):
                            return Response({'ssvc_decision_tree': 'data must be formatted in list of objects containing label and value for decisions'}, status=status.HTTP_400_BAD_REQUEST)

                #add changes
                title = "modified SSVC score data"
                if (serializer.validated_data['decision_tree'] != vul.ssvcscore.decision_tree):
                    title = "re-scored vulnerability"
                action = SSVCScoreActivity(score=vul.ssvcscore, title=title, user=request.user)
                action.save()
                logger.debug(serializer.validated_data)
                for field, val in serializer.validated_data.items():
                    #vector changes every time
                    if field in ['justifications', 'decision_tree', 'final_decision', 'tree_type']:
                        if (val != getattr(vul.ssvcscore, field, None)):
                            create_score_change(action, field, getattr(vul.ssvcscore, field), val);
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

                if serializer.validated_data.get('decision_tree'):
                    for dec in serializer.validated_data['decision_tree']:
                        if not(dec.get('label') and dec.get('value')):
                            return Response({'ssvc_decision_tree': 'data must be formatted in list of objects containing label and value for decisions'}, status=status.HTTP_400_BAD_REQUEST)

                ssvc = SSVCScore(vul=vul, user=self.request.user, **serializer.validated_data)
                ssvc.save()
                #add activity
                action = SSVCScoreActivity(score=ssvc, title="scored vulnerability", user=request.user)
                action.save()
                vul.locked = None
                vul.save()
                logger.debug(f"vul {vul.cve} unlocked")
            else:
                logger.debug(serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


        return Response({}, status=status.HTTP_202_ACCEPTED)


class ScoreActivityAPIView(viewsets.ModelViewSet):
    serializer_class = ScoreActivitySerializer
    permission_classes = (IsAuthenticated, CoordinatorPermission, PendingUserPermission)

    def get_view_name(self):
        return f"Score Activity"

    def get_queryset(self):
        score = get_object_or_404(SSVCScore, vul__cve=self.kwargs['cve'])
        return SSVCScoreActivity.objects.filter(score=score).order_by('-created')

    
