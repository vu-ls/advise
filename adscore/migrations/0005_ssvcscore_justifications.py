# Generated by Django 4.2.1 on 2023-10-13 14:48

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('adscore', '0004_alter_vul_last_modified'),
    ]

    operations = [
        migrations.AddField(
            model_name='ssvcscore',
            name='justifications',
            field=models.JSONField(blank=True, null=True, verbose_name='SSVC Decision Justifications'),
        ),
    ]