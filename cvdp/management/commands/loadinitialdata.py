import logging
import os.path
from os import path
from django.core.management.base import BaseCommand
from django.core.management import call_command
from cvdp.models import *

from django.conf import settings

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Load Initial Data'

    
    def handle(self, *args, **options):
        
        logger.info("Loading email templates.")
        if EmailTemplate.objects.count() > 0:
            logger.info("Email Templates already exist")
            # just need to update templates, not rewrite them                      
            call_command('loadtemplates', 'cvdp/fixtures/EmailTemplate.json')
        else:
            call_command('loaddata', 'EmailTemplate.json')
            logger.info("Done loading email templates.")

        if CWEDescriptions.objects.count() > 0:
            logger.info("CWE Info already exists")
        else:
            call_command('loadcwe', 'cvdp/fixtures/cwe_regular.json')
            logger.info("Done loading CWE Info")

        """
        if "adscore" in settings.INSTALLED_APPS:

            logger.info("Loading CVEs")
            call_command('loadcves')
            logger.info("Done loading CVEs")
        """
