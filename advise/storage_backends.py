#########################################################################
## Storage backends
########################################################################
#import os
from django.core.files.storage import FileSystemStorage
from django.conf import settings
#import importlib
#from pydoc import locate

if settings.DEPLOYMENT_TYPE == 'AWS':
    from storages.backends.s3boto3 import S3Boto3Storage
    class AttachmentFileStorage(S3Boto3Storage):
        def __init__(self, *args, **kwargs):
            # propagate any settings we have
            for arg,val in settings.ATTACHMENT_FILES_ARGS.items():
                kwargs[arg] = val
            super(AttachmentFileStorage, self).__init__(*args, **kwargs)

    class DefaultFileStorage(S3Boto3Storage):
        def __init__(self, *args, **kwargs):
            # propagate any settings we have
            for arg,val in settings.MEDIA_FILES_ARGS.items():
                kwargs[arg] = val
            super(DefaultFileStorage, self).__init__(*args, **kwargs)
else:
    class AttachmentFileStorage(FileSystemStorage):
        def __init__(self, *args, **kwargs):
    
            # propagate any settings we have
            for arg,val in settings.ATTACHMENT_FILES_ARGS.items():
                kwargs[arg] = val
            super(AttachmentFileStorage, self).__init__(*args, **kwargs)
