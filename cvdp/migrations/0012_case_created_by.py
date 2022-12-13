# Generated by Django 4.1.4 on 2022-12-21 15:15

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('cvdp', '0011_casethread_post_remove_messageattachment_attachment_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='case',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL),
        ),
    ]
