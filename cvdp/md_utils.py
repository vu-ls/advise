from django.contrib.auth.models import User, Group
import markdown as md
from cvdp.md_math_utils import MathExtension
import bleach
from bleach_whitelist import generally_xss_safe, markdown_attrs
import logging
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

def markdown(value):
    markdown_attrs['a'].extend(["class", "data-bs-toggle", "data-bs-html", "data-bs-original-title"])
    if markdown_attrs.get('span'):
        markdown_attrs['span'].extend(['class', 'data-value'])
    else:
        markdown_attrs['span'] = ['class', 'data-value']
    #markdown_attrs['a'].append("class")
    markdown_attrs['img'].append("width")
    markdown_attrs['img'].append("height")
    return bleach.clean(md.markdown(value, extensions=['toc', 'markdown.extensions.fenced_code', MathExtension()]), generally_xss_safe, markdown_attrs)

