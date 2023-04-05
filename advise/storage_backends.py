#########################################################################
## Storage backends
########################################################################
#import os
from django.core.files.storage import FileSystemStorage
from django.conf import settings
import importlib
from pydoc import locate

class AttachmentFileStorage(object):
    def __init__(self, *args, **kwargs):
        # get a ref to the storage class we were asked to use
        try:
            classname = settings.ATTACHMENT_FILES_STORAGE
            modpath = '.'.join(classname.split('.')[:-1])
            mod = importlib.import_module(modpath)
            cls = locate(classname)
        except AttributeError:
            cls = FileSystemStorage

        # propagate any settings we have
        for arg,val in settings.ATTACHMENT_FILES_ARGS.items():
            kwargs[arg] = val
        # instantiate an instance
        del(kwargs['storage_class'])
        self._storage = cls(*args, **kwargs)

    @property
    def storage(self):
        return self._storage

#class AttachmentFileStorage(object):
#    def __init__(self, *args, **kwargs):
#        # get a ref to the storage class we were asked to use
#        cls = importlib.import_module(kwargs['storage_class'])
#        # instantiate an instance
#        self._storage = cls(*args, **kwargs)
#
#    @property
#    def storage(self):
#        return self._storage

#if DEPLOYMENT_TYPE == 'AWS':
#    from storages.backends.s3boto3 import S3Boto3Storage
#    storage = __import__(settings.ATTACHMENT_FILES_STORAGE, globals(), locals())
#    class AttachmentFileStorage(storage):
#        location = settings.AWS_ATTACHMENT_FILES_LOCATION
#        bucket_name = settings.AWS_ATTACHMENT_FILES_STORAGE_BUCKET_NAME
#        file_overwrite = False
#        default_acl = 'private'
#        region_name=settings.AWS_REGION
#        custom_domain=False
#        acl='private'
#        
#        def __init__(self, *args, **kwargs):
#            super(AttachmentFileStorage, self).__init__(*args, **kwargs)
#else:
#    # no other storage model defined
#
#    class AttachmentFileStorage(DefaultStorage):
#        location = settings.ATTACHMENTS_ROOT
#        baseurl = settings.ATTACHMENTS_URL
#        def __init__(self, *args, **kwargs):
#            super(AttachmentFileStorage, self).__init__(*args, **kwargs)

