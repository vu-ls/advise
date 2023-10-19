from django.apps import AppConfig
import os


class AdscoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'adscore'

    ADSCORE_NVD_API_KEY = os.environ.get('NVD_API_KEY')
