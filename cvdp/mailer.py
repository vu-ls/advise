import logging
import os
import mimetypes
from email.mime.base import MIMEBase
from django.contrib.auth import get_user_model
from smtplib import SMTPException
from django.conf import settings
from cvdp.models import EmailTemplate
from django.utils.safestring import mark_safe
import traceback
from email.message import Message
import mimetypes
from django.template import engines
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from django.core.mail import EmailMultiAlternatives

from_string = engines['django'].from_string

User = get_user_model()

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

def get_html_preference(user):
    s = user.userprofile.settings.get('email_preference', 1)
    if int(s) == 1:
        html = True
    else:
        html = False

    return html

def check_email_preferences(template_type, user):
    if template_type == EmailTemplate.CASE_EMAIL:
        #Case updates
        pref = user.userprofile.settings.get('email_case_changes', ['1'])
    elif template_type == EmailTemplate.MESSAGE_EMAIL:
        #Message email
        pref = user.userprofile.settings.get('email_new_messages', ['1'])
    elif template_type == EmailTemplate.POST_EMAIL:
        #post updates
        pref = user.userprofile.settings.get('email_new_posts', ['1'])
    elif template_type == EmailTemplate.USER_EMAIL:
        #force these emails
        pref = ['1']
    else:
        pref = []

    if type(pref) is not list:
        if pref == True:
            pref = ['1']
        else:
            pref = []
    pref = [int(i) for i in pref]

    return pref


def send_templated_mail(template_name,
                        context,
                        recipients,
                        sender=None,
                        bcc=None,
                        fail_silently=False,
                        files=None,
                        html=True,
                        replyto=True):

    """
    code adapted from django-helpdesk

    send_templated_mail() is a wrapper around Django's e-mail routines that
    allows us to easily send multipart (text/plain & text/html) e-mails using
    templates that are stored in the database. This lets the admin provide
    both a text and a HTML template for each message.

    template_name is the slug of the template to use for this message (see
        models.EmailTemplate)

    context is a dictionary to be used when rendering the template

    recipients can be either a string, eg 'a@b.com', or a list of strings.

    sender should contain a string, eg 'My Site <me@z.com>'. If you leave it
        blank, it'll use settings.DEFAULT_FROM_EMAIL as a fallback.

    bcc is an optional list of addresses that will receive this message as a
        blind carbon copy.

    fail_silently is passed to Django's mail routine. Set to 'True' to ignore
        any errors at send time.

    files can be a list of tuples. Each tuple should be a filename to attach,
        along with the File objects to be read. files can be blank.
    """

    #I'm thinking locale should be set to recipients preference or just the global setting

    locale = "en"

    logger.debug(f"send mail recipients: {recipients}")

    if isinstance(recipients, str):
        if recipients.find(','):
            recipients = recipients.split(',')
    elif type(recipients) != list:
        recipients = [recipients]

    t = EmailTemplate.objects.filter(template_name__iexact=template_name, locale=locale).first()
    if not t:
        logger.debug("email doesn't exist")
        try:
            t = EmailTemplate.objects.get(template_name__iexact=template_name, locale__isnull=True)
        except EmailTemplate.DoesNotExist:
            logger.warning('template "%s" does not exist, no mail sent', template_name)
            return  # just ignore if template doesn't exist
        except Exception as e:
            logger.debug(traceback.format_exc())

    if len(recipients) == 1:
        #get user preference
        logger.debug("Checking user preferences")
        user = User.objects.filter(email = recipients[0]).first()
        if user:
            logger.debug(f"Checking user {user.email} preferences")
            pref = check_email_preferences(t.template_type, user)
            logger.debug(f"EMAIL PREFS {pref}")
            html = get_html_preference(user)
            if (1 not in list(pref)):
                #this user doesn't want these emails
                logger.debug("User has disabled email")
                return


    #prepend is in context, typically a CASE ID or some other identifier set by user
    subject_part = from_string(
        '{{prepend}} %(subject)s' % {
            "subject": t.subject
        }).render(context).replace('\n', '').replace('\r', '')

    footer_file = os.path.join('cvdp-email', locale, 'email_text_footer.txt')


    text_part = from_string(
        "%s{%% include '%s' %%}" % (t.plain_text, footer_file)
    ).render(context)

    context['button_link'] = context.get('url', None)
    context['email_signature'] = f"Your {settings.ORG_NAME} Coordination Team"

    email_html_base_file = os.path.join('cvdp-email', locale, 'email_html_bootstrap.html')

    html_part = from_string(
        "{%% extends '%s' %%}{%% block title %%}%s{%% endblock %%}"
        "{%% block content %%}%s{%% endblock %%}"
        %
        (email_html_base_file, t.title, t.html)
    ).render(context)

    if sender == None:
        sender = f"{settings.ORG_NAME} <{settings.CONTACT_EMAIL}>"

    if replyto:
        #if replyto, add default reply-to-email and headers
        #this is usually an auto-notification
        msg = EmailMultiAlternatives(subject_part, text_part,
                                     sender or settings.CONTACT_EMAIL,
                                     recipients, bcc=bcc,
                                     reply_to=[settings.REPLY_TO_EMAIL],
                                     headers=settings.EMAIL_HEADERS)
    else:
        msg = EmailMultiAlternatives(subject_part, text_part,
                                     sender or settings.CONTACT_EMAIL,
                                     recipients, bcc=bcc)
    if html:
        msg.attach_alternative(html_part, "text/html")

    if files:
        for filename, filefield in files:
            mime = mimetypes.guess_type(filename)
            if mime[0] is not None and mime[0] == "text/plain":
                with open(filefield.path, 'r') as attachedfile:
                    content = attachedfile.read()
                    msg.attach(filename, content)
            else:
                msg.attach_file(filefield.path)

    logger.debug('Sending email using template {} with subject "{}" to {!r}'.format(template_name, subject_part, recipients))

    try:
         return msg.send()

    except SMTPException as e:
        logger.exception('SMTPException raised while sending email to {}'.format(recipients))
        logger.debug('SMTPException raised while sending email to {}'.format(recipients))
        if not fail_silently:
            raise e
        return 0


# this is plaintext and boring :(
def send_mail(subject,
              content,
              recipients,
              context,
              sender=None,
              bcc=None,
              fail_silently=False,
              files=None,
              replyto=True):

    locale = "en"

    footer_file = os.path.join('cvdp-email', locale, 'email_text_footer.txt')

    subject_part = from_string(
        '{{prepend}} %(subject)s' % {
            "subject": subject
	}).render(context).replace('\n', '').replace('\r', '')

    text_part = from_string(
        "%s{%% include '%s' %%}" % (content, footer_file)
    ).render(context)

    if isinstance(recipients, str):
        if recipients.find(','):
            recipients = recipients.split(',')
    elif type(recipients) != list:
        recipients = [recipients]

    if sender == None:
        sender = f"{settings.ORG_NAME} <{settings.CONTACT_EMAIL}>"

    if replyto:
        #if replyto, add default reply-to-email and headers
        #this is usually an auto-notification

        msg = EmailMultiAlternatives(subject_part, text_part,
                                     sender or settings.CONTACT_EMAIL,
                                     recipients, bcc=bcc,
                                     reply_to=[settings.REPLY_TO_EMAIL],
                                     headers=settings.EMAIL_HEADERS)
    else:
        msg = EmailMultiAlternatives(subject_part, text_part,
                                     sender or settings.DEFAULT_FROM_EMAIL,
                                     recipients, bcc=bcc)

    if files:
        for filename, filefield in files:
            mime = mimetypes.guess_type(filename)
            if mime[0] is not None and mime[0] == "text/plain":
                with open(filefield.path, 'r') as attachedfile:
                    content = attachedfile.read()
                    msg.attach(filename, content)
            else:
                msg.attach_file(filefield.path)

    logger.debug('Sending email with subject "{}" to {!r}'.format(subject, recipients))

    try:
         return msg.send()

    except SMTPException as e:
        logger.exception('SMTPException raised while sending email to {}'.format(recipients))
        logger.debug('SMTPException raised while sending email to {}'.format(recipients))
        if not fail_silently:
            raise e
        return 0
