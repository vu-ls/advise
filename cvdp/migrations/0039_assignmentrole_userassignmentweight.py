# Generated by Django 4.1.4 on 2023-02-08 21:06

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('cvdp', '0038_case_due_date_case_public_date'),
    ]

    operations = [
        migrations.CreateModel(
            name='AssignmentRole',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(max_length=200)),
            ],
        ),
        migrations.CreateModel(
            name='UserAssignmentWeight',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('weight', models.IntegerField()),
                ('current_weight', models.IntegerField(default=0)),
                ('effective_weight', models.IntegerField()),
                ('role', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='cvdp.assignmentrole')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assignment', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('user', 'role')},
            },
        ),
    ]
