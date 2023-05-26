import os
import sys
import json
import pprint
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError
from spdx_tools.spdx.model.relationship import Relationship, RelationshipType
from spdx_tools.spdx.parser.parse_anything import parse_file
from spdx_tools.spdx.parser.error import SPDXParsingError
from cvdp.components.models import Component, Product, ComponentAction, ComponentChange
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

def add_dependency(product, dep):
          
    prod = Product.objects.filter(component__id=product).first()
    if prod:
        prod.dependencies.add(dep)
    else:
        component = Component.objects.get(id=product)
        prod = Product(component=component)
        prod.save()
        prod.dependencies.add(dep)



class Command(BaseCommand):
    help = 'Import components from spdx (SBOM) into components table'

    def add_arguments(self, parser):
        parser.add_argument('in', nargs=1, type=str)
        parser.add_argument('--group', nargs='?', default=None, type=str, help='If group id is provided, add component owner as provided group')
        parser.add_argument('--user', nargs='?', type=str, default=None, help='If user id is provided, attribute component additions to user')
        parser.add_argument('--assume-relationships', nargs='?', default=False, const=True, help='Assume all packages listed in SBOM are dependencies of the document package')
        parser.add_argument('--noactivity', nargs='?', default=False, const=True, help='Do not create component activity for any created components')

    def handle(self, *args, **options):
        num_comps = 0
        num_relationships = 0
        main_spdx_id = None
        main_pkg = None
        user = None
        group = None

        if options['user']:
            user = User.objects.filter(id=options['user']).first()
            if not user:
                logger.error(f"User does not exist")
                sys.exit(0)

        if options['group']:
            group = Group.objects.filter(id=options['group']).first()
            if not group:
                logger.error(f"Group does not exist")
                sys.exit(0)
        
        try:
            document = parse_file(options['in'][0])
        except SPDXParsingError as e:
            raise e
            logger.error(f"Error parsing file. Document contains {len(e.messages)} errors")
            print("exiting...")
            sys.exit(0)
            
        #pp = pprint.PrettyPrinter(indent=4)
        #pp.pprint(document)

        logger.info(f"loading {document.creation_info.name} SBOM")
        pkgs = {}

        logger.info(f"loading {len(document.packages)} packages")
        logger.info(f"loading {len(document.relationships)} relationships")
        
        for pkg in document.packages:
            version = pkg.version
            if not pkg.version:
                version = '0.0'
            supplier = pkg.supplier
            source = pkg.download_location

            if supplier == "NOASSERTION":
                supplier = None
            if source == "NOASSERTION":
                source = None
                
            logger.info(pkg.name)
            if group:
                #check if this product already exists for htis group?
                prod = Product.objects.filter(supplier=group, component__name=pkg.name, component__version=version).first()
                if prod:
                    continue

                logger.info(f"Adding component {pkg.name}")
                #add component regardless of whether it exists in main db or not
                c = Component(name=pkg.name, version=version,
                              supplier=pkg.supplier, source=pkg.download_location,
                              comment=pkg.comment, homepage=pkg.homepage,
                              added_by=user)
                if pkg.primary_package_purpose:
                    c.component_type = pkg.primary_package_purpose
                c.save()
                p = Product(component=c,
                            supplier=group)
                p.save()

                if (options['noactivity'] == False):
                    action = ComponentAction(component=c,
                                             user=user,
                                             title=f"created component for {group.name} through SBOM upload",
                                             action_type=1)
                    action.save()

                
                num_comps = num_comps + 1
                
            else:
                c, created = Component.objects.update_or_create(name = pkg.name, version=version,
                                                                defaults={'supplier':pkg.supplier,
                                                                          'source': pkg.download_location,
                                                                          'comment':pkg.comment,
                                                                          'homepage': pkg.homepage,
                                                                          })
                if pkg.primary_package_purpose:
                    c.component_type=pkg.primary_package_purpose
                    c.save()
                    if created:
                        num_comps = num_comps + 1
                        if (options['noactivity'] == False):
                            action = ComponentAction(component = c,
                                                     user=user,
                                                     title=f"created component through SBOM upload",
                                                     action_type=1)
                            action.save()

                        if user:
                            c.added_by = user
                            c.save()
            
                    
            pkgs[pkg.spdx_id] = c.id

            if pkg.name == document.creation_info.name:
                main_spdx_id = c.id
                main_pkg = pkg

            if options['assume_relationships'] and main_spdx_id:
                if pkg.name != document.creation_info.name:
                    add_dependency(main_spdx_id, c)
                    if (options['noactivity'] == False):
                        action = ComponentAction(component = main_pkg,
                                                 user=user,
                                                 title=f"added dependency {c}",
                                                 action_type=4)
                        action.save()
                    
                    num_relationships = num_relationships + 1
                    

        for r in document.relationships:
            
            if r.relationship_type in [RelationshipType.CONTAINS, RelationshipType.RUNTIME_DEPENDENCY_OF, RelationshipType.DEPENDENCY_OF, RelationshipType.BUILD_DEPENDENCY_OF]:
                if pkgs.get(r.spdx_element_id) and pkgs.get(r.related_spdx_element_id):
                    #add dependency
                    num_relationships = num_relationships + 1
                    product = pkgs.get(r.spdx_element_id)
                    dep = pkgs.get(r.related_spdx_element_id)
                    product = Product.objects.filter(component__id=product).first()
                    if product:
                        product.dependencies.add(dep)
                        if (options['noactivity'] == False):
                            action = ComponentAction(component = product.component,
                                                     title=f"added dependency {dep}",
                                                     user=user,
                                                     action_type=4)
                            action.save()

                    else:
                        instance = Component.objects.filter(id=product).first()
                        product = Product(component=instance)
                        product.save()
                        product.dependencies.add(dep)
                        if options['noactivity'] == False:
                            action = ComponentAction(component = instance,
                                                     title=f"added dependency {dep}",
                                                     user=user,
                                                     action_type=4)
                            action.save()
            

        logger.info(f"Updated {num_comps} Components")
        logger.info(f"Updated {num_relationships} Relationships")
        


