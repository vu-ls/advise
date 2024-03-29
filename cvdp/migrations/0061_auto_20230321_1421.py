# Generated by Django 4.1.4 on 2023-03-21 14:21

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('cvdp', '0060_case_search_vector_case_case_gin'),
    ]

    operations = [

        migrations.RunSQL(
            sql='''
            
            CREATE TRIGGER case_update_trigger
            BEFORE INSERT OR UPDATE of case_id, title, summary
            ON cvdp_case
            FOR EACH ROW EXECUTE PROCEDURE
            tsvector_update_trigger(search_vector, 'pg_catalog.english', case_id, title, summary);

            UPDATE cvdp_case SET search_vector = NULL;
            ''',

            reverse_sql= '''
            DROP TRIGGER IF EXISTS case_update_trigger
            ON cvdp_case;
           ''',
        ),


        
    ]
