import django
django.setup()
from django.core.management.base import BaseCommand, CommandError
from cvdp.manage.models import AdviseTask, AdviseScheduledTask
from advise_worker.tasks import check_tasks, check_scheduled_tasks, run_adhoc_task, run_scheduled_task
from django.utils import timezone
import time
import logging
from multiprocessing import Pool

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Run the polling process to process worker jobs'
    poll_seconds = 10
    workers = 4
    
    def add_arguments(self, parser):
        parser.add_argument('--workers', default=4, type=int, help='Number of workers to run')

        
    def handle(self, *args, **options):
        workers = options.get('workers')
        logger.info(f"Starting worker event polling loop with {workers} workers (poll time {self.poll_seconds} seconds)")
        mp = Pool(workers)

        #make sure tasks aren't stuck in "running"
        tasks = AdviseScheduledTask.objects.filter(enabled=True, running=True)
        for t in tasks:
            t.running=False
            t.save()

        tasks = AdviseTask.objects.filter(completed__isnull=True, running=True)
        for t in tasks:
            t.running=False
            t.save()
            
        
        while True:
            adhoc = check_tasks()
            runtime = timezone.now()
            scheduled = [(task, runtime) for task in check_scheduled_tasks(runtime)]
            mp.imap_unordered(run_adhoc_task, adhoc)
            mp.imap_unordered(run_scheduled_task, scheduled)
            time.sleep(self.poll_seconds)

