# Generated by Django 4.2.1 on 2023-06-27 19:13

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cvdp', '0089_case_resolution_casetransfer'),
    ]

    operations = [
        migrations.AddField(
            model_name='casetransfer',
            name='data_transferred',
            field=models.JSONField(blank=True, null=True, verbose_name='Data Types Transferred'),
        ),
    ]
