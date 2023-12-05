from django import template
from allauth.mfa.utils import is_mfa_enabled
import random
import os

register = template.Library()

@register.filter
def mfa_set(user):
    if not user.is_authenticated:
        return False
    return is_mfa_enabled(user)

@register.filter
def userlogo(user, imgclass):
    try:
        if user:
            if user.userprofile.photo:
                return f"<img class=\"{imgclass} rounded-circle flex-shrink-0\" src=\"{user.userprofile.photo.url}\" title=\"{user.screen_name}, {user.org}\">"
            else:
                return f"<div class=\"{imgclass} rounded-circle flex-shrink-0 text-center\" style=\"background-color:{user.userprofile.logocolor};\" title=\"{user.screen_name}, {user.org}\"><span class=\"logo-initial\">{user.initial}</span></div>"
    except:
        pass
    



