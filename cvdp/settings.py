from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

DEFAULT_USER_SETTINGS = {
    'email_case_changes': 1,
    'email_new_posts': 1,
    'email_new_messages': 1,
    'email_new_status': 1,
    'email_preference': 1,
}

