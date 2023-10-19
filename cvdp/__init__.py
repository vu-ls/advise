from .celery import app as celery_app

__all__ = ('celery_app', )

default_app_config = 'cvdp.apps.CvdpConfig'

