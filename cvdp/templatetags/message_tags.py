from django import template
from django.core.paginator import Paginator
from django.db.models import Q
register = template.Library()

@register.filter
def unread(thread, user):
    """                                                                         
    Check whether there are any unread messages for a particular thread for a user.
    """
    return bool(thread.userthread_set.filter(user=user, unread=True))
