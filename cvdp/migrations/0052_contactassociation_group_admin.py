# Generated by Django 4.1.4 on 2023-03-01 14:50

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cvdp', '0051_remove_userprofile_preferred_username'),
    ]

    operations = [
        migrations.AddField(
            model_name='contactassociation',
            name='group_admin',
            field=models.BooleanField(default=False),
        ),
    ]
