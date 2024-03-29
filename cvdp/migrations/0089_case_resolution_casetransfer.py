# Generated by Django 4.2.1 on 2023-06-22 14:39

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cvdp', '0088_adviseconnection_disabled_casereport_connection'),
    ]

    operations = [
        migrations.AddField(
            model_name='case',
            name='resolution',
            field=models.TextField(blank=True, help_text='The case resolution', null=True, verbose_name='Resolution'),
        ),
        migrations.CreateModel(
            name='CaseTransfer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('transfer_reason', models.TextField(blank=True, help_text='Th reason for the transfer', null=True)),
                ('remote_case_id', models.CharField(blank=True, null=True)),
                ('accepted', models.BooleanField(default=False)),
                ('action', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='cvdp.caseaction')),
                ('connection', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='cvdp.adviseconnection')),
            ],
        ),
    ]
