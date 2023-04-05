from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.

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
    
