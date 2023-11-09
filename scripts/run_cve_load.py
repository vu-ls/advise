# -*- coding: utf-8 -*-


#requirements: psycopg2-binary
# requests
# urllib3==1.26.6 if openssl-1.1.1 is not installed, otherwise latest


from __future__ import unicode_literals
import os
import sys
import json
from datetime import datetime, timezone
from urllib.request import urlopen
from shutil import copyfileobj
import tempfile
import zipfile
import logging
import requests
import traceback
import psycopg2
import argparse


class AdScoreCVELoader(object):

    def __init__(self, logger:logging.Logger, dbname, dbhost, dbuser, dbport, dbpass):
        self.logger = logger
        self.conn = psycopg2.connect(database=dbname,
                                     host = dbhost,
                                     user = dbuser,
                                     password = dbpass,
                                     port = dbport)
        self.cursor = self.conn.cursor()

    def close_connection(self):
        self.conn.close()
    
    def add_vul(self, vul):
    
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
        """
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
        """
        self.logger.info(f"Adding CVE {cve}: published: {published}, last_modified {last_modified}")
                
        description = None
        for d in vul['containers']['cna']['descriptions']:
            if d['lang'] == "en":
                description = d["value"]
        if not description:
            description = vul['containers']['cna']['descriptions'][0]['value']
        
        self.cursor.execute("SELECT last_modified from adscore_vul where cve=%s", (cve,))
        ad_vul = self.cursor.fetchone()
        if ad_vul:
            if ad_vul[0] == last_modified:
                return
            else:
                self.cursor.execute("UPDATE adscore_vul SET description=%s, last_modified=%s, published=%s, status=%s where cve=%s", (description, last_modified, published, status, cve,))
            
        else:
            dt = datetime.now(timezone.utc)
            self.cursor.execute("INSERT INTO adscore_vul(cve, description, last_modified, published, status, date_added) VALUES (%s, %s, %s, %s, %s, %s)", (cve, description, last_modified, published, status, dt,))

        self.conn.commit()

    def parse_cves(self, file):
    
        zf = zipfile.ZipFile(file)
        with tempfile.TemporaryDirectory() as tempdir:
            zf.extractall(tempdir)
            for subdir, dirs, files in os.walk(tempdir):
                self.logger.warning(f"Now parsing... {subdir}")
                for f in files:
                    if f.startswith('CVE') and f.endswith('.json'):
                        filepath = subdir + os.sep + f
                        with open(filepath) as fop:
                            d = json.load(fop)
                            self.add_vul(d)
        
        

def main():

    parser = argparse.ArgumentParser(description="Load latest CVEs from github repo into psql database provided")

    parser.add_argument("-i", "--input", help="Input CSV file", required=False, type=str)
    parser.add_argument("-p", "--password", help="psql password", required=True, type=str)
    parser.add_argument("--host", help="psql hostname", required=True, type=str)
    parser.add_argument("-u", "--user", help="psql user", required=True, type=str)
    parser.add_argument("-n", "--name", help="psql database name", required=True, type=str)
    parser.add_argument("--port", help="psql database port", nargs='?', default=5432, required=False)

    # Read arguments from command line
    args = parser.parse_args()
    
    logger = logging.getLogger(sys.argv[0])
    if not logger.hasHandlers():
        handler = logging.StreamHandler(sys.stderr)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        logger.addHandler(handler)
    logger.setLevel(os.environ.get("LOG_LEVEL", logging.INFO))


    print(args)
    
    cve_loader = AdScoreCVELoader(logger=logger, dbname=args.name, dbhost=args.host, dbuser=args.user, dbport=args.port, dbpass=args.password)
    try:
        if args.input:
            logger.warning("extract CVES...")
            cve_loader.parse_cves(args.input)
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
                cve_loader.parse_cves(fdst)


        cve_loader.close_connection()
    except KeyboardInterrupt:
        cve_loader.close_connection()
        print("exiting...")
        sys.exit(0)


if __name__ == "__main__":
    main()

            

