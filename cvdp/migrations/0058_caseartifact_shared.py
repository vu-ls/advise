# Generated by Django 4.1.4 on 2023-03-15 14:54

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cvdp', '0057_vulnerability_deleted'),
    ]

    operations = [
        migrations.AddField(
            model_name='caseartifact',
            name='shared',
            field=models.BooleanField(default=False),
        ),
    ]
