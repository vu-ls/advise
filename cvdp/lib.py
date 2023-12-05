from cvdp.models import *
from cvdp.components.models import ComponentStatus, Product
from django.contrib.auth.models import Group
from django.conf import settings
from cvdp.md_utils import markdown
import random
from cvdp.permissions import InvalidRoleException, my_case_vendors
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from django.utils.encoding import smart_str
from django.utils.timezone import make_aware
from cvdp.appcomms.appcommunicator import cvdp_send_email
import requests
import mimetypes
import os
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def generate_case_id():
    while (1):
        cid = randint(100000, 999999)
        #check if already used                                                                                                                                               
        case = Case.objects.filter(case_id=cid).first()
        if case == None:
            return cid


def validate_recaptcha(token):
    data = {
        "secret": settings.RECAPTCHA_PRIVATE_KEY,
        "response": token,
    }
    req_object = requests.post(url = "https://www.google.com/recaptcha/api/siteverify",
                               data=data,
                               headers={
                                   "Content-type": "application/x-www-form-urlencoded",
                                   "User-agent": "reCAPTCHA Django",
                               })
    resp = req_object.json()
    logger.debug(resp)
    if resp['success']:
        if resp.get('score'):
            #v3 recaptcha
            if resp['score'] > settings.RECAPTCHA_SUCCESS_SCORE:
                return True
            else:
                return False
        return True
    return False


def send_template_email(template, emails, context):

    if context:
        context['template'] =  template
    else:
        context = {'template': template}

    cvdp_send_email(None, None, emails, **context)


def check_permissions(user):

    groups = user.groups.all()
    #look up contact
    my_contact = Contact.objects.filter(email=user.email).first()

    #am I in all the groups I'm supposed to be in?
    cas = ContactAssociation.objects.filter(contact=my_contact, verified=True)
    for x in cas:
        if not user.groups.filter(id=x.group.id).exists():
            x.group.user_set.add(user)
            logger.debug(f"Adding user {user} to {x.group}")

    if len(cas) != len(groups):
        logger.debug("something doesn't match")
        for g in user.groups.all():
            if not(cas.filter(group=g).exists()):
                logger.info(f"Removing {user.username} from group {g.name}")
                g.user_set.remove(user)



#this algorithm is based on the smooth weighted round robin here:
#https://github.com/nginx/nginx/commit/52327e0627f49dbda1e8db695e63a4b0af4448b1

def get_next_assignment(data):
    if len(data) == 0:
        return None
    if len(data) == 1:
        return data[0].user

    total_weight = 0
    result = None

    for entry in data:
        entry.current_weight += entry.effective_weight
        total_weight += entry.effective_weight
        if entry.effective_weight < entry.weight:
            entry.effective_weight += 1
        if not result or result.current_weight < entry.current_weight:
            result = entry
        entry.save()
    if not result:  # this should be unreachable, but check anyway
        logger.warning("Auto Assignment error")
        return None

    result.current_weight -= total_weight
    result.save()
    return result.user


def auto_assignment(role, exclude=None):
    #get users for this role

    users = UserAssignmentWeight.objects.filter(role__id=role)
    """
    #are any of these users OOF today?
    oof_users = get_oof_users()
    if oof_users:
	users = users.exclude(user__in=oof_users)
    """
    if exclude:
        #should anyone be excluded?
        users = users.exclude(user=exclude)

    if users:
        return get_next_assignment(users)

    return None


def generate_case_id():
    while (1):
        cid = random.randint(100000, 999999)
        #check if already used
        case = Case.objects.filter(case_id=cid).first()
        if case == None:
            return cid


def create_case_thread(case, official):

    thread, created = CaseThread.objects.update_or_create(case = case,
                                                          defaults = {
                                                              'created_by': case.created_by,
                                                              'subject': 'Official Case Thread',
                                                              'official': official})
    return thread

def setup_new_case(case):

    thread = create_case_thread(case, True)

    case.due_date = datetime.now() + timedelta(days=45)
    case.due_date = make_aware(case.due_date)
    case.save()

    if case.created_by:
        #add case assignment
        cp, created = CaseParticipant.objects.update_or_create(case=case,
                                                               contact = case.created_by.contact,
                                                               defaults = {
                                                                'user':case.created_by,
                                                                'role': 'owner',
                                                               })
        #add owner to official case thread

        CaseThreadParticipant.objects.update_or_create(thread=thread,
                                                       participant=cp,
                                                       defaults = {
                                                           'added_by': case.created_by
                                                       })



def add_new_case_participant(thread, name, user, role):

    #is this uuid a contact or group?
    contact = Contact.objects.filter(uuid=name).first()
    created = False
    role_change = False
    if contact:
        cp = CaseParticipant.objects.filter(case=thread.case, contact=contact).first()
        if cp:
            if (role and cp.role != role):
                #TODO: ADD Activity for role change
                if role == "owner":
                    if contact.user:
                        if not contact.user.is_coordinator:
                            raise InvalidRoleException("Participant can't be case owner")
                        else:
                            cp.notified = timezone.now()
                            logger.debug(f"AUTO NOTIFYING USER - user gets assignment email - {timezone.now()}")
                    else:
                        raise InvalidRoleException("Participant can't be case owner")

                cp.role = role
                cp.save()
                role_change=True

        else:
            cp = CaseParticipant(case=thread.case,
                                 contact = contact,
                                 user = user)
            if role:
                if role == "owner":
                    if contact.user:
                        if not contact.user.is_coordinator:
                            raise InvalidRoleException("Participant can't be case owner")
                        else:
                            cp.notified = timezone.now()

                    else:
                        raise InvalidRoleException("Participant can't be case owner")

                cp.role = role
            cp.save()
            created = True
    else:
        group = Group.objects.filter(groupprofile__uuid=name).first()
        if group:
            cp = CaseParticipant.objects.filter(case=thread.case, group=group).first()
            if cp:
                if (role and cp.role != role):
                    if role == "owner":
                        raise InvalidRoleException("Participant cannot be made owner")
                    #TODO: ADD ACTIVITY
                    cp.role = role
                    role_change = True
                    cp.save()
            else:
                cp = CaseParticipant(case=thread.case,
                                     group=group,
                                     user = user)
                if role:
                    if role == "owner":
                        raise InvalidRoleException("Participant cannot be made owner")
                    cp.role = role
                cp.save()
                created=True

    if cp:
        ctp, ctp_created = CaseThreadParticipant.objects.update_or_create(thread=thread,
                                                                          participant=cp,
                                                                          defaults = {
                                                                              'added_by': user
                                                                          })
        """
        #I think an email should only be sent when a post is created
        if ctp_created:
            email_context = {'url': thread.case.get_absolute_url(), 'case': thread.case.caseid, 'template': 'new_thread', 'assignee': user.screen_name}
            if cp.contact and (contact.email != user.email):
                cvdp_send_email(None, None, [cp.contact.email], **email_context)
            elif cp.group:
                group_emails = []
                group_users = User.objects.filter(groups__id=ctp.participant.group.id, is_active=True, api_account=False, pending=False)
                for x in group_users:
                    group_emails.append(x.email)
                cvdp_send_email(None, None, group_emails, **email_context)
        """

    if ((created or role_change) and role == "owner"):

        email_context = {'url': f'{settings.SERVER_NAME}{thread.case.get_absolute_url()}', 'case': thread.case.caseid, 'template': "case_assignment", 'assignee': user.screen_name, 'prepend': thread.case.caseid}
        #if this user assigned themselves, don't send an email
        if contact and (contact.email != user.email):
            #send email to newly assigned user
            cvdp_send_email(None, None, [contact.email], **email_context)
        #TODO: can a group be an owner?

    if created:
        return cp

    return None

def notify_case_participant(participant, subject, content, user):
     #is this uuid a contact or group?
    participant.notified = timezone.now()
    participant.save()
    email_context={'url': f'{settings.SERVER_NAME}{participant.case.get_absolute_url()}', 'case': participant.case.caseid, 'prepend':participant.case.caseid}
    if participant.contact:
        cvdp_send_email(subject, content, [participant.contact.email], **email_context)
    else:
        #get all emails in group
        group_emails = []
        group_users = User.objects.filter(groups__id=participant.group.id, is_active=True, api_account=False, pending=False)
        for x in group_users:
            group_emails.append(x.email)
        cvdp_send_email(subject, content, group_emails, **email_context)


def add_artifact(file):

    filename = smart_str(file.name)
    print(file.name)
    try:
        mime_type = file.content_type
    except:
        mime_type = mimetypes.guess_type(filename, strict=False)[0]
        if not(mime_type):
            mime_type = 'application/octet-stream'

    att = Attachment(
        file=file,
        filename=os.path.basename(filename),
        mime_type=mime_type,
        size=file.size)
    att.save()
    print(att.filename)
    return att


def get_casethread_user_participants(thread):

    #only send emails to users that have been notified
    participants = CaseThreadParticipant.objects.filter(thread=thread).exclude(participant__notified__isnull=True)

    contacts = list(participants.filter(participant__contact__isnull=False).values_list('participant__contact__user__email', flat=True))

    groups = participants.filter(participant__group__isnull=False).values_list('participant__group__id', flat=True)

    users = list(User.objects.filter(groups__id__in=groups).values_list('email', flat=True))

    #combine lists and de-duplicate
    return list(set(users) | set(contacts))


def get_post_mentions(post):
    logger.debug(post.content)

    mentions = []
    user_emails = []
    group_emails = []
    html_text = markdown(post.content)

    logger.debug(html_text)
    soup = BeautifulSoup(html_text, 'html.parser')
    for mention in soup.select('span.mention'):
        logger.debug(mention)
        #get data.value
        if mention.get('data-value'):
            logger.debug(f"USERNAME is {mention['data-value']}")
            mentions.append(mention['data-value'])

    for user in mentions:
        u = User.objects.filter(screen_name=user).first()
        if u:
            user_emails.append(u.email)
            continue

        #check groups
        g = Group.objects.filter(name=user).first()
        if g:
            #get all users in group:
            group_users = User.objects.filter(groups__id=g.id, is_active=True, api_account=False, pending=False)
            for x in group_users:
                group_emails.append(x.email)

    return user_emails, group_emails


def create_case_action(title, user, case, share=False):
    action = CaseAction(case = case,
                        user=user,
                        title=title,
                        created=timezone.now())
    if share:
        action.action_type=1
    action.save()

    #this is easier than trying to do it on every model change
    case.modified = timezone.now()
    case.save()
    
    return action


def create_case_change(action, field, old_value, new_value):

    if (not old_value and not new_value):
        #ignore if change is going from null to [] or vice versa
        return

    change = CaseChange(action=action,
                        field = field,
                        old_value=old_value,
                        new_value=new_value)
    change.save()
    return change

def create_contact_action(title, user, contact):
    action = ContactAction(contact=contact,
                           user=user,
                           title=title,
                           created=timezone.now())
    action.save()
    return action

def create_group_action(title, user, group):

    action = ContactAction(group=group,
                           user=user,
                           title=title,
                           created=timezone.now())
    action.save()
    return action

def create_contact_change(action, field, old_value, new_value):
    if (not old_value and not new_value):
	#ignore if change is going from null to [] or vice versa
        return

    change = ContactChange(action=action,
			   field = field,
                           old_value=old_value,
                           new_value=new_value)
    change.save()
    return change

def get_status_status(case, user):
    print("GET STATUS STATUS")
    # if no vuls, no status
    if (not Vulnerability.objects.filter(case=case, deleted=False).exists()):
        return False
    # is status required for this case by this user?
    
    components = ComponentStatus.objects.filter(vul__case=case).distinct('component__name').order_by('component__name')
    if components:
        case_components = components.values_list('component__id', flat=True)
        my_groups = my_case_vendors(user, case)
        if my_groups:
            if case_components:
                products = Product.objects.filter(supplier__in=my_groups, component__in=case_components).values_list('component__id', flat=True)
                return not(components.filter(component__id__in=products).exists())
        else:
            #any status made by this user?
            return not(components.filter(current_revision__user=user).exists())
    
    return True


    
    
