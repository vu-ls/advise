# Generated by Django 4.1.4 on 2023-02-02 13:12

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('cvdp', '0034_auto_20230126_2200'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='userprofile',
            name='org',
        ),
        migrations.RemoveField(
            model_name='userprofile',
            name='pending',
        ),
        migrations.RemoveField(
            model_name='userprofile',
            name='title',
        ),
    ]
