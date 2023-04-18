
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from cvdp.models import UserProfile, Case, CaseThread, Contact, message_sent, PostRevision
from django.conf import settings
from cvdp.appcomms.appcommunicator import cvdp_send_email
from cvdp.lib import setup_new_case, get_casethread_user_participants, get_post_mentions


@receiver(pre_save, sender=settings.AUTH_USER_MODEL)
def update_username_from_email(sender, instance, **kwargs):
    instance.username = instance.email


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_userprofile(sender, instance, created, using, **kwargs):
    """
    Helper function to create Profile when User is created 
    """
    if created:
        from cvdp.settings import DEFAULT_USER_SETTINGS
        muser = UserProfile.objects.create(user=instance, settings=DEFAULT_USER_SETTINGS)
        muser.save()

        #every user is contact
        Contact.objects.update_or_create(email=instance.email, defaults={
            'name':instance.get_full_name(),
            'user':instance,
            })
        
                                         

@receiver(post_save, sender=Case)
def create_case_officialthread(sender, instance, created, **kwargs):
    if created:
        setup_new_case(instance)

    
@receiver(message_sent)
def send_message_notification(sender, message, thread, reply, **kwargs):
    if reply:
        template = 'reply_message'
    else:
        template = 'new_message'
    email_context = {'template': template, 'sender': message.sender.screen_name, 'url': f'{settings.SERVER_NAME}{message.thread.get_absolute_url()}'}
    
    recipients = []
    for recip in thread.userthread_set.exclude(user=message.sender):
        recipients.append(recip.user.email)
    cvdp_send_email(None, None, recipients, **email_context)


@receiver(post_save, sender=PostRevision)
def send_post_notification(sender, instance, created, **kwargs):

    if created:
        if instance.revision_number == 0:
            # we only want to send emails on first post,
            #edits are ignored
            participants = get_casethread_user_participants(instance.post.thread)

            print(participants)
            
            email_context = {'url': f'{settings.SERVER_NAME}{instance.post.thread.case.get_absolute_url()}'}
            try:
                #remove author from list
                participants.remove(instance.post.author.email)
            except:
                print(f"Author not in list {instance.post.author.email}")
                pass
            email_context['user_mentions'], email_context['group_mentions'] = get_post_mentions(instance)
            sent_to = []

            for email in email_context['user_mentions']:
                email_context['template'] = 'user_mentioned'
                if email not in sent_to:
                    cvdp_send_email(None, None, [email], **email_context)
                    sent_to.append(email)

            for email in email_context['group_mentions']:
                email_context['template'] = 'group_mentioned'
                if email not in sent_to:
                    cvdp_send_email(None, None, [email], **email_context)
                    sent_to.append(email)

            email_context['template'] = 'case_new_post'
            email_context['ignore'] = sent_to
            cvdp_send_email(None, None, participants, **email_context)
