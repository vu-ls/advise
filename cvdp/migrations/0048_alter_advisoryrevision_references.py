# Generated by Django 4.1.4 on 2023-02-23 15:32

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cvdp', '0047_alter_advisoryrevision_options_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='advisoryrevision',
            name='references',
            field=models.JSONField(blank=True, null=True, verbose_name='references'),
        ),
    ]
