from django.apps import AppConfig


class CvdpConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cvdp'

    def ready(self):
        import cvdp.signals
