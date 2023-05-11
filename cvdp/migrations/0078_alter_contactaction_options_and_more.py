# Generated by Django 4.2.1 on 2023-05-10 14:19

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('cvdp', '0077_contactaction_alter_component_options_and_more'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='contactaction',
            options={'ordering': ('-created',)},
        ),
        migrations.AlterField(
            model_name='contactaction',
            name='contact',
            field=models.ForeignKey(blank=True, help_text='Contact', null=True, on_delete=django.db.models.deletion.SET_NULL, to='cvdp.contact'),
        ),
        migrations.AlterField(
            model_name='contactaction',
            name='group',
            field=models.ForeignKey(blank=True, help_text='Group', null=True, on_delete=django.db.models.deletion.SET_NULL, to='auth.group'),
        ),
    ]