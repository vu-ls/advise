from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.utils.translation import gettext as _
import binascii
import os

# Create your models here.
class User(AbstractUser):

    # this is going to replace the userprofile.preferred_username
    screen_name = models.CharField(
        max_length=250,
        blank=True,
        null=True
    )

    org = models.CharField(
        max_length=250,
        blank=True,
        null=True)

    title = models.CharField(
        max_length=200,
        blank=True,
        null=True)

    # flip this to make this user a potential
    # AdVISE coordinator.
    is_coordinator = models.BooleanField(
        default=False)

    #config option to make user's pending upon registration
    #coordinator must approve before access is granted
    pending = models.BooleanField(
        default=False)

    api_account = models.BooleanField(
        default=False)
    
    def _first_initial(self):
        if self.screen_name:
            return self.screen_name[0]
        elif self.get_full_name():
            return self.get_full_name()[0]
        else:
            return "?"

    initial = property(_first_initial)


class APIToken(models.Model):
    """
    The DRF default authorization token model
    """

    key = models.CharField(
        _("API Key"),
        max_length=250,
	primary_key=True)

    last_four = models.CharField(
        _("Last 4 of API Key"),
        max_length=5,
        blank=True, null=True)
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        related_name="auth_token",
        on_delete=models.CASCADE)

    created = models.DateTimeField(
        _("Created"),
	auto_now_add=True)

    last_used = models.DateTimeField(
        blank=True,
        null=True)

    class Meta:
        verbose_name = _("Token")
        verbose_name_plural = _("Tokens")

    def save(self, token=None, *args, **kwargs):
        if not token:
            return super(APIToken, self).save(*args, **kwargs)

        self.last_four = token[-4:]
        self.key = make_password(token, settings.API_HASH_SALT)

        return super(APIToken, self).save(*args, **kwargs)

    def generate_key(self):
        return binascii.hexlify(os.urandom(20)).decode()

    def __str__(self):
        return f"*{self.last_four}"
