from __future__ import absolute_import, unicode_literals
import json
import os
from django.conf import settings
from adscore.lib import load_new_cves, remove_dup_cves
from celery.utils.log import get_task_logger
from cvdp.celery import app
import logging

logger = get_task_logger(__name__)
logger.setLevel(logging.DEBUG)


@app.task
def check_for_new_cves():
    logger.debug("CHECKING FOR NEW CVES")
    load_new_cves()


@app.task
def remove_duplicate_cves():
    remove_dup_cves()


