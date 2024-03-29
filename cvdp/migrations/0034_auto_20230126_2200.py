# Generated by Django 4.1.4 on 2023-01-26 22:00

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('cvdp', '0033_vulnerability_search_vector'),
    ]

    operations = [
        migrations.RunSQL(
            sql='''

            CREATE TRIGGER vul_update_trigger
            BEFORE INSERT OR UPDATE of description, cve
            ON cvdp_vulnerability
            FOR EACH ROW EXECUTE PROCEDURE
            tsvector_update_trigger(search_vector, 'pg_catalog.english', description, cve);

            UPDATE cvdp_vulnerability SET search_vector = NULL;
            ''',

            reverse_sql= '''
            DROP TRIGGER IF EXISTS vul_update_trigger
            ON cvdp_vulnerability;
           ''',
        ),

    ]
