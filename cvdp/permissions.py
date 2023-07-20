from rest_framework.permissions import IsAdminUser, IsAuthenticated, BasePermission, SAFE_METHODS
from django.shortcuts import get_object_or_404
from cvdp.models import Case, CaseParticipant, Contact, CaseThreadParticipant, ContactAssociation, GlobalSettings, MessageThread, UserThread, GroupThread
from cvdp.manage.models import  AdVISEConnection
from cvdp.components.models import Component, Product
from django.db.models import Q
from django.contrib.auth.models import Group
import logging
import traceback
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class InvalidRoleException(Exception):
    """ Raised when user is assigned an invalid role"""
    pass


def _my_groups(user):
    groups = user.groups.all()
    if not groups:
        return []
    return groups.values_list('id', flat=True)

def my_components(user):
    if user.is_coordinator:
        return Component.objects.all()
    
    my_groups = user.groups.all()
    products = Product.objects.filter(supplier__in=my_groups).values_list('component__id', flat=True)
    return Component.objects.filter(id__in=products)

def my_cases(user):
    if user.is_coordinator or user.is_staff or user.is_superuser:
        return Case.objects.all()
    groups = _my_groups(user)
    my_cases = CaseParticipant.objects.filter(Q(group__in=groups)|Q(contact__user=user)).exclude(notified__isnull=True).values_list('case')
    if my_cases:
        return Case.objects.filter(id__in=my_cases).exclude(status=Case.PENDING_STATUS)
    else:
        return Case.objects.none()

def is_my_case(user, case):
    groups = user.groups.all()
    if user.is_superuser or user.is_staff or user.is_coordinator:
        return True
    c = Case.objects.get(id=case)
    if c.status == Case.PENDING_STATUS:
        return False
    user_groups = groups.values_list('id', flat=True)
    #get my contact
    contact = Contact.objects.filter(user=user).first()
    if groups:
        return CaseParticipant.objects.filter(case__id=case).filter(Q(contact=contact) | Q(group__in=user_groups)).exclude(notified__isnull=True).exists()
    else:
        return CaseParticipant.objects.filter(case__id=case, contact=contact).exists()


def is_my_case_thread(user, thread):
    groups = user.groups.all()
    if user.is_superuser or user.is_staff or user.is_coordinator:
        return True

    user_groups = groups.values_list('id', flat=True)
    #get my contact
    contact = Contact.objects.filter(user=user).first()
    #get case participant
    p = CaseParticipant.objects.filter(case=thread.case).filter(Q(contact=contact) | Q(group__in=user_groups)).exclude(notified__isnull=True)
    if p:
        return CaseThreadParticipant.objects.filter(thread=thread, participant__in=p).exists()
    else:
        return False


def is_my_msg_thread(user, thread):
    if UserThread.objects.filter(thread=thread, user=user).exists():
        return True
    gt = GroupThread.objects.filter(thread=thread).first()
    if gt:
        if user.groups.filter(id=gt.group.id).exists():
            return True
    return False

def is_case_owner(user, case):
    #get my contact
    contact = Contact.objects.filter(user=user).first()
    return CaseParticipant.objects.filter(case__id=case, contact=contact, role='owner').exists()

def is_case_owner_or_staff(user, case):
    #more permissive then above
    if user.is_staff or user.is_superuser:
        return True
    return is_case_owner(user, case)


def is_coordinator(user):
    return user.is_coordinator

def is_staff_member(user):
    return user.is_staff


def my_case_role(user, case):
    if user.is_superuser:
        return "owner"
    contact = Contact.objects.filter(user=user).first()
    #is this a vendor?
    groups = user.groups.all()
    cp = CaseParticipant.objects.filter(case=case, group__in=groups).values_list('role', flat=True)

    if not cp:
        #check if this user is a reporter/participant
        cp = CaseParticipant.objects.filter(case=case, contact=contact).first()
        if cp:
            return cp.role
        return None
    elif len(cp) == 1:
        return cp[0]
    else:
        #length is greater than 1, which means we need to return most permissive
        if 'owner' in cp:
            return 'owner'
        elif 'supplier' in cp:
            return 'supplier'
        elif 'participant' in cp:
            return 'participant'
        elif 'reporter' in cp:
            return 'reporter'
        else:
            return 'observer' # < --- read only

#returns a list of all groups in this case that the user belongs to
def my_case_vendors(user, case):
    groups = user.groups.all()
    if user.is_coordinator:
        contact = Contact.objects.filter(user=user).first()
        cp = CaseParticipant.objects.filter(case=case, contact=contact).first()
        if cp and cp.role=="owner":
            if groups:
                return groups
            elif GlobalSettings.objects.all().exists():
                gs = GlobalSettings.objects.all().first()
                return Group.objects.filter(id = gs.id)

    cp = CaseParticipant.objects.filter(case=case, group__in=groups).values_list('group__id', flat=True)
    if cp:
        return Group.objects.filter(id__in=cp)
    return []
    

class ContactAPIPermission(BasePermission):
    message = "Forbidden"

    def has_permission(self, request, view):
        if request.method in ['POST', 'DELETE']:
            if request.user.is_coordinator or request.user.is_staff:
                return True
            return False
        #otherwise - we're going to check has_object_permission
        return True
    
    def has_object_permission(self, request, view, obj):

        if request.user.is_coordinator or request.user.is_staff:
            return True
        logger.debug(request.method)
        if request.method in ['PATCH']:
            #obj is actually group
            return ContactAssociation.objects.filter(group=obj, contact__user=request.user, group_admin=True).exists()
        
        return False

    
class GroupAdminLevelPermission(BasePermission):
    message = "Forbidden"
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_coordinator or request.user.is_staff:
            return True
        if request.method in SAFE_METHODS:
            return request.user.groups.filter(id=obj.id).exists()
        else:
            #this user must be group admin

            return ContactAssociation.objects.filter(group=obj, contact__user=request.user, group_admin=True).exists()


class GroupLevelPermission(BasePermission):
    message = "Forbidden"

    def has_object_permission(self, request, view, obj):
        if request.user.is_coordinator or request.user.is_staff:
            return True
        return request.user.groups.filter(id=obj.id).exists()
        
class StaffPermission(BasePermission):
    message = "Forbidden"

    def has_permission(self, request, view):
        return request.user.is_staff

class CoordinatorPermission(BasePermission):
    message = "Forbidden"

    def has_permission(self, request, view):
        return request.user.is_coordinator

class GroupWritePermission(BasePermission):
    message = "Forbidden"

    def has_permission(self, request, view):
        return request.user.is_staff

class CaseObjectAccessWritePermission(BasePermission):
    message = "Forbidden"

    #more permissive than the following class, allows write
    def has_object_permission(self, request, view, obj):
        return is_my_case(request.user, obj.id)

class TransferAccessPermission(BasePermission):
    message="Forbidden"

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        else:
            #check permissions for transfer access
            try:
                #logger.debug(request.user.auth_token.last_four)
                return AdVISEConnection.objects.filter(incoming_key = request.user.auth_token, disabled=False).exists()
            except:
                logger.debug(traceback.format_exc())
                return False

class CaseTransferAccessPermission(BasePermission):
    message="Forbidden"

    def has_permission(self, request, view):
        case = get_object_or_404(Case, case_id=view.kwargs.get('caseid'))
        ## did this case originate from the API token that is requesting it
        try:
            connection = AdVISEConnection.objects.filter(incoming_key = request.user.auth_token, disabled=False).first()
            if not connection:
                return False
            if (case.report.connection == connection):
                #ENFORCE A TIME LIMIT?
                return True
        except:
            #user may not have auth_token
            logger.debug(traceback.format_exc())
            return False
    
class CaseObjectAccessPermission(BasePermission):
    message = "Forbidden"

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            # Check permissions for read-only request
            return is_my_case(request.user, obj.id)
        else:
            # Check permissions for write request
            return is_case_owner(request.user, obj.id)
        
class CaseThreadObjectAccessPermission(BasePermission):
    message = "Forbidden"

    def has_object_permission(self, request, view, obj):
        return is_my_case_thread(request.user, obj)


class CaseAccessPermission(BasePermission):
    message = "Forbidden"

    def has_permission(self, request, view):
        case = get_object_or_404(Case, case_id=view.kwargs.get('caseid'))
        return is_my_case(request.user, case.id)

class PendingUserPermission(BasePermission):
    message = "Access is Denied. User is in pending state"

    def has_permission(self, request, view):
        return not(request.user.pending)
