# Generated by Django 4.2.1 on 2023-08-25 19:07

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cvdp', '0094_componentstatusupload_case'),
    ]

    operations = [
        migrations.CreateModel(
            name='CaseResolutionOptions',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('description', models.CharField(max_length=500)),
            ],
        ),
        migrations.AlterField(
            model_name='cveservicesaccount',
            name='server_type',
            field=models.CharField(choices=[('prod', 'Production'), ('test', 'Test'), ('dev', 'Development'), ('adptest', 'ADP Test')], default='prod', max_length=10),
        ),
    ]
