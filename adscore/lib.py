import requests, os
import json
from datetime import datetime, timezone, timedelta
from django.conf import settings
from adscore.models import Vul, SSVCScore
from cvdp.models import CWEDescriptions
import logging
import urllib.parse
from django.utils.timezone import make_aware
import time

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def add_vul(vul):
    description = ''
    for d in vul['cve']['descriptions']:
        #this should probably be configurable!
        if d['lang'] == 'en':
            description = d['value']

    #problem types:
    problem_types = []
    if 'weaknesses' in vul['cve']:
        for p in vul['cve']['weaknesses']:
            if 'description' in p:
                for d in p['description']:
                    if d['lang'] == 'en':
                        #lookup cwe
                        cwe = CWEDescriptions.objects.filter(cwe__icontains=d['value']).first()
                        if cwe:
                            problem_types.append(cwe.cwe)

    lastmodified = None
    
    if 'lastModified' in vul['cve']:
        lastmodified = make_aware(datetime.strptime(vul['cve']['lastModified'], '%Y-%m-%dT%H:%M:%S.%f'))

    published = None
    if 'published' in vul['cve']:
        published = make_aware(datetime.strptime(vul['cve']['published'], '%Y-%m-%dT%H:%M:%S.%f'))
                               
    Vul.objects.update_or_create(cve = vul['cve']['id'],
                                 defaults = {
                                     'description': description,
                                     'last_modified': lastmodified,
                                     'published': published,
                                     'status': vul['cve']['vulnStatus'],
                                 }
                                 )

def load_new_cves():
    current_time = datetime.now().isoformat()
    hour_ago = (datetime.now() - timedelta(hours=1)).isoformat()
    url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
    token = settings.ADSCORE_NVD_API_KEY
    headers={'content-type':'application/json', 'apiKey': token}

    r = requests.get(f'{url}?lastModStartDate={hour_ago}&lastModEndDate={current_time}&resultsPerPage=20', headers=headers, stream=True)

    #if successful
    if (r == None or (r.status_code != requests.codes.ok)):
        return
    else:
        result = r.json()
        for vul in result['vulnerabilities']:
            #get vul
            ad_vul = Vul.objects.filter(cve=vul['cve']['id']).first()
            if ad_vul:
                if ad_vul.last_modified == vul['cve']['lastModified']:
                    continue
            add_vul(vul)
        
def load_more_cves():
    #get oldest vul
    logger.debug("IN LOAD MORE CVES!!!")
    oldest_vul = Vul.objects.all().order_by('last_modified').first()
    last_vul = oldest_vul.last_modified
    hours_before = (last_vul - timedelta(hours=6)).isoformat()
    last_vul = oldest_vul.last_modified.isoformat()
    url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
    token = settings.ADSCORE_NVD_API_KEY
    headers={'content-type':'application/json', 'apiKey': token }

    startIndex = 0
    totalResults = 20
    while (startIndex < totalResults):
        params = {'lastModStartDate': hours_before, 'lastModEndDate': last_vul, 'resultsPerPage': 20, 'startIndex': startIndex}
        query_str = urllib.parse.urlencode(params)
        logger.debug(f"requesting more vuls: {url}?{query_str}")
        
        r = requests.get(f'{url}?{query_str}', headers=headers, stream=True)
        
        if (r == None or (r.status_code != requests.codes.ok)):
            logger.warning("Error retrieving vulnerabilities")
            logger.warning(r)
            return
        else:
            result = r.json()
            totalResults = result['totalResults']
            startIndex = result['startIndex'] + result['resultsPerPage']
            logger.debug(f"retrieving {len(result['vulnerabilities'])} vulnerabilities.")
            for vul in result['vulnerabilities']:
                #get vul
                ad_vul = Vul.objects.filter(cve=vul['cve']['id']).first()
                if ad_vul:
                    if ad_vul.last_modified == vul['cve']['lastModified']:
                        continue
                add_vul(vul)
            time.sleep(6)

    
