# Generated by Django 4.1.4 on 2023-03-21 18:45

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('cvdp', '0065_alter_component_options_and_more'),
    ]

    operations = [

        migrations.RunSQL(
            sql='''

            CREATE TRIGGER advisory_update_trigger
            BEFORE INSERT OR UPDATE of content, title, user_message, automatic_log
            ON cvdp_advisoryrevision
            FOR EACH ROW EXECUTE PROCEDURE
            tsvector_update_trigger(search_vector, 'pg_catalog.english', content, title, user_message, automatic_log);

            UPDATE cvdp_advisoryrevision SET search_vector = NULL;
            ''',

            reverse_sql= '''
            DROP TRIGGER IF EXISTS advisory_update_trigger
            ON cvdp_advisoryrevision;
           ''',
        ),

        
    ]
