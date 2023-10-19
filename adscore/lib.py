import requests, os
import json
from datetime import datetime, timedelta
from django.apps import apps
from adscore.models import Vul, SSVCScore, VulLock
from cvdp.models import CWEDescriptions
import logging
import urllib.parse
from django.utils.timezone import make_aware
from django.utils import timezone
import time
from django.db.models import Count

logger = logging.getLogger("cvdp")
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
    hour_ago = (datetime.now() - timedelta(hours=2)).isoformat()
    url = "https://services.nvd.nist.gov/rest/json/cves/2.0"

    token = apps.get_app_config('adscore').ADSCORE_NVD_API_KEY
    
    headers={'content-type':'application/json', 'apiKey': token}

    startIndex = 0
    totalResults = 20

    while (startIndex < totalResults):
        params = {'lastModStartDate': hour_ago, 'lastModEndDate': current_time, 'resultsPerPage': 20, 'startIndex': startIndex}
        query_str = urllib.parse.urlencode(params)
        logger.debug(f"requesting latest vuls: {url}?{query_str}")
        
        r = requests.get(f'{url}?{query_str}', headers=headers, stream=True)

        #if successful
        if (r == None or (r.status_code != requests.codes.ok)):
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
        
def fill_cve_data_holes():
    #get oldest vul
    logger.debug("IN LOAD MORE CVES!!!")
    most_recent_vul = Vul.objects.all().order_by(-'last_modified').first()
    time_now = datetime.now().isoformat()
    last_vul = most_recent_vul.last_modified.isoformat()
    url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
    token = apps.get_app_config('adscore').ADSCORE_NVD_API_KEY
    headers={'content-type':'application/json', 'apiKey': token }

    startIndex = 0
    totalResults = 20
    while (startIndex < totalResults):
        params = {'lastModStartDate': last_vul, 'lastModEndDate': time_now, 'resultsPerPage': 20, 'startIndex': startIndex}
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

    

def remove_dup_cves():
    logger.info("CHECKING FOR ANY DUPLICATE CVES")
    dupes = Vul.objects.values('cve').annotate(count=Count('cve')).values('cve', 'count').order_by().filter(count__gt=1)
    logger.info(f"FOUND {len(dupes)} duplicates")
    logger.info(dupes)
    for d in dupes:
        logger.info(f"Found a dup {d['cve']}, {d['count']}")
        duplicates = Vul.objects.filter(cve=d['cve'], ssvcscore__isnull=True).first()
        if duplicates:
            #delete one without a score
            logger.info(f"removing dup {d['cve']}") 
            duplicates.delete()
        else:
            # they both have SSVC score?
            # just delete the first one
            first_one = Vul.objects.filter(cve=d['cve']).first()
            logger.info(f"removing dup {d['cve']}") 
            first_one.delete()


def remove_score_locks():

    logger.info("Checking for stale scoring locks")
    one_hour_ago = timezone.now() - timedelta(hours=1)
    
    stale_locks = VulLock.objects.filter(locked__lte=one_hour_ago)
    for lock in stale_locks:
        #unlock it
        logger.info(f"Removing stale lock for {lock.vul.cve} from {lock.user.screen_name}")
        lock.delete()

        
