# Generated by Django 4.2.3 on 2024-01-24 16:47

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cvdp', '0106_alter_vulnerability_references'),
    ]

    operations = [
        migrations.AddField(
            model_name='advisoryrevision',
            name='version_number',
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
    ]
