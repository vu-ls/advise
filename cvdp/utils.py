
#from pinax-messages
from functools import wraps
from django.conf import settings
import re
import shlex


def cached_attribute(func):
    cache_name = "_%s" % func.__name__

    @wraps(func)
    def inner(self, *args, **kwargs):
        if hasattr(self, cache_name):
            return getattr(self, cache_name)
        val = func(self, *args, **kwargs)
        setattr(self, cache_name, val)
        return val
    return inner


def process_query(s, live=True):
    query = re.sub(r'[!\'()|&<>]', ' ', s).strip()
    # get rid of empty quotes                                                               
    query = re.sub(r'""', '', s)
    if query == '"':
        return None
    if query.startswith(settings.CASE_IDENTIFIER):
        query = query[len(settings.CASE_IDENTIFIER):]

    if query:
        #sub spaces between quotations with <->                                             
        #if re.search(r'\"', query) and not re.search(r'\".*\"', query):                    
        try:
            query = '&'.join(shlex.split(query))
        except ValueError:
            query = query + '"'
            query = re.sub(r'\s+', '&', query)
        query = re.sub(r'\s+', '<->', query)
        # Support prefix search on the last word. A tsquery of 'toda:*' will                
        # match against any words that start with 'toda', which is good for                 
        # search-as-you-type.                                                               
        if query.endswith("<->"):
            query = query[:-3]
    if query and live:
        query += ':*'

    return query
