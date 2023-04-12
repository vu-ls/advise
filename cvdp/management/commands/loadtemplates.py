from django.core.management.base import BaseCommand, CommandError
from cvdp.models import EmailTemplate
import json
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Load but not overwrite templates'
    
    def add_arguments(self, parser):
        parser.add_argument('in', nargs=1, type=str)

    def handle(self, *args, **options):
        num_templates = 0
        with open(options['in'][0], 'r') as f:
            tmpls = json.load(f)
            for t in tmpls:
                #don't update team templates (body_only = True)                                                
                tmpl = EmailTemplate.objects.filter(template_name=t['fields']['template_name'], locale=t['fields']['locale']).first()
                if tmpl:
                    num_templates = num_templates + 1
                    tmpl.subject = t['fields']['subject']
                    tmpl.title = t['fields']['title']
                    tmpl.plain_text = t['fields']['plain_text']
                    tmpl.html = t['fields']['html']
                    tmpl.template_type = t['fields']['template_type']
                    tmpl.save()

            logger.info(f"Updated {num_templates} templates")
