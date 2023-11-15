from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager

# Create your models here.


class CustomUserManager(UserManager):
    def get_by_natural_key(self, username):
        case_insensitive_username_field = '{}__iexact'.format(self.model.USERNAME_FIELD)
        return self.get(**{case_insensitive_username_field: username})


class User(AbstractUser):

    screen_name = models.CharField(
        max_length=250,
        blank=True,
        null=True
    )

    organization = models.CharField(
        max_length=250,
        blank=True,
        null=True)

    title = models.CharField(
        max_length=200,
        blank=True,
        null=True)

    email_confirmed = models.BooleanField(
        default = False)
    
    objects = CustomUserManager()
