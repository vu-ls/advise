# Generated by Django 4.1.4 on 2023-03-21 17:29

import django.contrib.postgres.indexes
import django.contrib.postgres.search
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cvdp', '0062_contact_modified_groupprofile_modified'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='component',
            options={'ordering': ('-modified',)},
        ),
        migrations.AddField(
            model_name='component',
            name='modified',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name='component',
            name='search_vector',
            field=django.contrib.postgres.search.SearchVectorField(null=True),
        ),
        migrations.AddIndex(
            model_name='component',
            index=django.contrib.postgres.indexes.GinIndex(fields=['search_vector'], name='component_gin'),
        ),
    ]
