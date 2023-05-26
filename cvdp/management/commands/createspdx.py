import os
import sys
import json
import pprint
import re
import tempfile
from typing import List
from datetime import datetime
from license_expression import get_spdx_licensing
from spdx_tools.spdx.model import (
    Actor,
    ActorType,
    Checksum,
    ChecksumAlgorithm,
    CreationInfo,
    Document,
    ExternalPackageRef,
    ExternalPackageRefCategory,
    File,
    FileType,
    Package,
    PackagePurpose,
    PackageVerificationCode,
    Relationship,
    RelationshipType,
)
from spdx_tools.spdx.validation.document_validator import validate_full_spdx_document
from spdx_tools.spdx.validation.validation_message import ValidationMessage
from spdx_tools.spdx.writer.write_anything import write_file

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError
from spdx_tools.spdx.model.relationship import Relationship, RelationshipType
from spdx_tools.spdx.parser.parse_anything import parse_file
from spdx_tools.spdx.parser.error import SPDXParsingError
from cvdp.components.models import Component, Product
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

class Command(BaseCommand):
    help = 'Import components from spdx (SBOM) into components table'

    def add_arguments(self, parser):
        parser.add_argument('--out', nargs='?', type=str, help='Ouptut file. The format will be determined by the file ending: .spdx (tag-value), .json, .xml, .yaml. or .rdf (or .rdf.xml)')
        parser.add_argument('--format', nargs='?', type=str, help='Format to write to stdout (json, xml, yaml, rdf)')
        parser.add_argument('--name', nargs='?', default=None, type=str, help='Component name')
        parser.add_argument('--id', nargs='?', default=None, type=int, help='Component ID')
        parser.add_argument('--comp-version', nargs='?', default=None, type=str, help='The version number of the component to generate SBOM for.')
        parser.add_argument('--group', nargs='?', default=None, type=str, help='If group id is provided, search components within this group')
        parser.add_argument('--email', nargs='?', default="anon@vu.ls", type=str, help='Email of creator')
        parser.add_argument('--creator', nargs='?', default="Anonymous", type=str, help='Name of creator')

        
    def handle(self, *args, **options):
        num_comps = 0
        num_relationships = 0
        main_spdx_id = None
        user = None
        group = None
        version = options.get('comp-version')

        p = None

        if not(options.get('name')) and not(options.get('id')):
            logger.error(f"Must provide either component name or ID")
            sys.exit(0)

        if not(options.get('format')) and not(options.get('out')):
            logger.error(f"Must provide either output file name or format")
            sys.exit(0)
            
        if options.get('group'):
            group = Group.objects.filter(id=options['group']).first()
            if not group:
                logger.error(f"Group does not exist")
                sys.exit(0)
        
        #get product
        if group:
            if options.get('name'):
                p = Product.objects.filter(component__name=options['name'], supplier=group)
            elif options.get('id'):
                p = Product.objects.filter(component__id=options['id'], supplier=group)
            if version:
                p = p.filter(version=version)
            if p.count() > 1:
                logger.error(f"More than 1 component found. Try adding --version")
                sys.exit(0)
            p = p.first()
            if not p:
                logger.error(f"Component not found")
                sys.exit(0)
            c = p.component
                
        else:
            if options.get('name'):
                c = Component.objects.filter(name=options['name'])
            elif options.get('id'):
                c = Component.objects.filter(id=options['id'])
            if version:
                c = c.filter(version = version)
            if c.count() > 1:
                logger.error(f"More than 1 component found. Try adding --group")
                sys.exit(0)
            c = c.first()
            if not c:
                logger.error(f"Component not found")


        year = datetime.today().year
        month = datetime.today().month
        day = datetime.today().day
        

        creation_info = CreationInfo(
            spdx_version="SPDX-2.3",
            spdx_id="SPDXRef-DOCUMENT",
            name=f"{c.name}",
            data_license="CC0-1.0",
            document_namespace="https://advise.vu.ls",
            creators=[Actor(ActorType.PERSON, options['creator'], options['email'])],
            created=datetime(year, month, day)
        )

        document = Document(creation_info)
        main_pkg_spdx_id = re.sub("[^\w\.\-]", "-", c.name)

        package = Package(
            name=c.name,
            spdx_id=f"SPDXRef-{main_pkg_spdx_id}",
            download_location=c.source,
            version=c.version,
        )

        document.packages = [package]

        #now get package dependencies

        if not p:
            p = Product.objects.filter(component=c).first()
            
        if p:
            # A DESCRIBES relationship asserts that the document indeed describes the package.
            describes_relationship = Relationship("SPDXRef-DOCUMENT", RelationshipType.DESCRIBES, f"SPDXRef-{main_pkg_spdx_id}")
            document.relationships = [describes_relationship]
            deps = p.dependencies.all()
            for d in deps:
                spx_id = re.sub("[^\w\.\-]", "-", d.name)
                pkg = Package(
                    name=spx_id,
                    spdx_id=f"SPDXRef-{spx_id}",
                    download_location=d.source,
                    version=d.version,
                )
                document.packages += [pkg]
                contains_relationship = Relationship(package.spdx_id, RelationshipType.CONTAINS, pkg.spdx_id)
                document.relationships += [contains_relationship]

            
        validation_messages: List[ValidationMessage] = validate_full_spdx_document(document)
        for message in validation_messages:
            raise Exception(message.validation_message)

        assert validation_messages == []

        if options.get('out'):
            write_file(document, options['out'])
        else:
            tf = tempfile.NamedTemporaryFile(suffix=f".{options['format']}")
            write_file(document, tf.name)

            with open(tf.name, 'r') as fin:
                sys.stdout.write(fin.read())
            
        


