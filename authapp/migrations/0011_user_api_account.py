# Generated by Django 4.1.4 on 2023-03-17 14:57

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authapp', '0010_apitoken_last_four'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='api_account',
            field=models.BooleanField(default=False),
        ),
    ]
