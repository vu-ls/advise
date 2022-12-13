from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.conf import settings
from cvdp.appcomms.appcommunicator import cvdp_send_email
from allauth.account.signals import password_changed, password_reset, email_added, email_removed

#TODO - might want to add social account hooks
#TODO - add hooks for mfa setup/removal

@receiver(password_changed)
def send_password_changed_notification(request, user, **kwargs):
    email_context = {'template': 'password_changed'}
    cvdp_send_email(None, None, [user.email], **email_context)


@receiver(password_reset)
def send_password_changed_notification(request, user, **kwargs):
    email_context = {'template': 'password_reset'}
    cvdp_send_email(None, None, [user.email], **email_context)

@receiver(email_added)
def send_password_changed_notification(request, user, email_address, **kwargs):
    email_context = {'template': 'email_added', 'email': email_address}
    cvdp_send_email(None, None, [user.email], **email_context)

@receiver(email_removed)
def send_password_changed_notification(request, user, email_address, **kwargs):
    email_context = {'template': 'email_removed', 'email': email_address}
    cvdp_send_email(None, None, [user.email], **email_context)
    
    
