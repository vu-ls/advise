# Generated by Django 4.2.3 on 2023-10-24 15:42

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('adscore', '0008_ssvcscoreactivity_scorechange'),
    ]

    operations = [
        migrations.RenameField(
            model_name='ssvcscoreactivity',
            old_name='edit',
            new_name='created',
        ),
    ]
