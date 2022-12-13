from django import template
from django_otp import user_has_device
register = template.Library()

@register.filter
def has_mfa_enabled(user):
    if user_has_device(user):
        return True
    return False
