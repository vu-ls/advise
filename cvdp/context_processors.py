from django.conf import settings
from django.urls import reverse

def advise_version(request):
    # return the value you want as a dictionnary. you may add multiple values in there.
    context_vars = {}
    context_vars['VERSION'] = settings.VERSION
    context_vars['ORG_NAME'] = getattr(settings, 'ORG_NAME', None)
    context_vars['DISCLOSURE_POLICY_LINK'] = getattr(settings, 'DISCLOSURE_POLICY_LINK', None)
    context_vars['TERMS_OF_USE_LINK'] = getattr(settings, 'TERMS_OF_USE_LINK', None)
    context_vars['CONTACT_EMAIL'] = getattr(settings, 'CONTACT_EMAIL', None)
    context_vars['CVDP_BASE_TEMPLATE'] = getattr(settings, 'CVDP_BASE_TEMPLATE', 'cvdp/base.html')
    context_vars['CASE_IDENTIFIER'] = settings.CASE_IDENTIFIER
    context_vars['LOGIN_URL'] = getattr(settings, reverse(settings.LOGIN_URL), reverse("authapp:login"))
    return context_vars
                                        
