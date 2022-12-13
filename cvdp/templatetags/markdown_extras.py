from django import template
from django.template.defaultfilters import stringfilter
from django.utils.safestring import mark_safe
from cvdp.md_utils import markdown as md

@stringfilter
def markdown(value):
    return mark_safe(md(value))

register = template.Library()
register.filter(markdown)

