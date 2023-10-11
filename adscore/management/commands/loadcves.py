# -*- coding: utf-8 -*-                                                                                                              
from __future__ import unicode_literals
import os
import sys
import json
from datetime import datetime
from django.core.management.base import BaseCommand, CommandError
from adscore.models import Vul
from urllib.request import urlopen
from shutil import copyfileobj
from django.utils.timezone import make_aware
import tempfile
import zipfile
import logging
import requests
import traceback

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

def add_vul(vul):

    cve = vul['cveMetadata']['cveId']
    status = vul['cveMetadata']['state']
    if (status != "PUBLISHED"):
        return
    published = None
    if 'datePublished' in vul['cveMetadata']:
        published = vul['cveMetadata']['datePublished']
    last_modified = None
    if 'dateUpdated' in vul['cveMetadata']:
        last_modified = vul['cveMetadata']['dateUpdated']
    else:
        last_modified = published

    #this is annoying but django complains when you add a non-timezone aware date, so try to make it aware
    if published and not(('Z' in published) or ('+' in published)):
        try:
            published = make_aware(datetime.strptime(published, '%Y-%m-%dT%H:%M:%S'))
        except:
            if '.' in published:
                result = published.index('.')
                published = published[0:result]
            elif 'Z' in published:
                published = published[:-1]
                published = make_aware(datetime.strptime(published, '%Y-%m-%dT%H:%M:%S'))

    if last_modified and not(('Z' in last_modified) or ('+' in last_modified)):
        try:
            last_modified = make_aware(datetime.strptime(last_modified, '%Y-%m-%dT%H:%M:%S'))
        except:
            if '.' in last_modified:
                result = last_modified.index('.')
                last_modified = last_modified[0:result]
            elif 'Z' in last_modified:
                last_modified = last_modified[:-1]
            
            last_modified = make_aware(datetime.strptime(last_modified, '%Y-%m-%dT%H:%M:%S'))

    #logger.debug(f"Adding CVE {cve}: published: {published}, last_modified {last_modified}")
            
    description = None
    for d in vul['containers']['cna']['descriptions']:
        if d['lang'] == "en":
            description = d["value"]
    if not description:
        description = vul['containers']['cna']['descriptions'][0]['value']
    
    ad_vul = Vul.objects.filter(cve=cve).first()
    if ad_vul:
        if ad_vul.last_modified == last_modified:
            return

    Vul.objects.update_or_create(cve = cve,
                                 defaults = {
                                     'description': description,
                                     'last_modified': last_modified,
                                     'published': published,
                                     'status': status
                                 }
                                 )




def parse_cves(file):

    zf = zipfile.ZipFile(file)
    with tempfile.TemporaryDirectory() as tempdir:
        zf.extractall(tempdir)
        for subdir, dirs, files in os.walk(tempdir):
            logger.warning(f"Now parsing... {subdir}")
            for f in files:
                if f.startswith('CVE') and f.endswith('.json'):
                    filepath = subdir + os.sep + f
                    with open(filepath) as fop:
                        d = json.load(fop)
                        add_vul(d)



class Command(BaseCommand):
    help = 'Import CVE vulnerability data into postgres db'
    
    def add_arguments(self, parser):
        parser.add_argument('in', nargs='?', type=str)
    
    def handle(self, *args, **options):

        try:

            if options['in']:
                logger.warning("extract CVES...")
                parse_cves(options['in'])
            else:
                logger.warning("No file provided, downloading latest file")
                #download file
                url = "https://api.github.com/repos/cveproject/cvelistv5/releases/latest"
                headers={'content-type':'application/json'}
                r = requests.get(url, headers=headers, stream=True)
                if (r == None or (r.status_code != requests.codes.ok)):
                    logger.error(f"Error pulling latest CVE file")
                    sys.exit(0)
                
                data = r.json()
                get_file = data['zipball_url']
                logger.info(f"Pulling latest CVE file {get_file}")
            
                with urlopen(get_file) as fsrc, tempfile.NamedTemporaryFile() as fdst:
                    copyfileobj(fsrc, fdst)
                    parse_cves(fdst)

        except KeyboardInterrupt:
            print("exiting...")
            sys.exit(0)
            

            

