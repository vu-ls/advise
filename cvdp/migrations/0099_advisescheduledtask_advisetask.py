# Generated by Django 4.2.3 on 2023-10-25 18:16

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('cvdp', '0098_vulssvc_justifications'),
    ]

    operations = [
        migrations.CreateModel(
            name='AdviseScheduledTask',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('task', models.CharField(max_length=200, verbose_name='Task name')),
                ('period', models.FloatField(verbose_name='Periodicity of job in seconds')),
                ('last_run', models.DateTimeField(blank=True, null=True)),
                ('next_run', models.DateTimeField(blank=True, null=True)),
                ('run_at_time', models.TimeField(blank=True, help_text='Optional time at which this job runs', null=True)),
                ('task_info', models.JSONField(blank=True, help_text='Optional Additional information needed to perform task', null=True)),
            ],
        ),
        migrations.CreateModel(
            name='AdviseTask',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(default=django.utils.timezone.now)),
                ('task_type', models.IntegerField(default=0)),
                ('task_info', models.JSONField(help_text='Information needed to perform task')),
                ('completed', models.DateTimeField(blank=True, null=True)),
            ],
        ),
    ]