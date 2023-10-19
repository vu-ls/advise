import django
django.setup()
import logging
from django.conf import settings
from cvdp.manage.models import AdviseTask, AdviseScheduledTask
from cvdp.mailer import mailer_send_email
from datetime import datetime, timedelta
from django.utils.module_loading import import_string
from django.utils import timezone
import json
import traceback

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

def check_tasks():
    return AdviseTask.objects.filter(completed__isnull=True, running=False)

def run_adhoc_task(task):
    #make sure task hasn't been picked up
    updated_task = AdviseTask.objects.get(id=task.id)
    if updated_task.running:
        #abort - a different worker picked this up
        return
    else:
        updated_task.running=True
        updated_task.save()

    try:
        logger.debug(f"got task: {task.task_info}")
        if task.task_type == 1:
            # mailer task
            subject = task.task_info.pop('subject', None)
            message = task.task_info.pop('message')
            recipients = task.task_info.pop('recipients')
            mailer_send_email(subject, message, recipients, **task.task_info)
        elif task.task_type == 2:
            logger.info(f"Unhandled task type 2: {task.task_info}")
        else:
            logger.info(f"Undefined task type {task.task_type}: {task.task_info}")
    except json.JSONDecodeError as e:
        logger.error(f"Unable to decode JSON for task: {e} (raw JSON: {task.task_info})")
    except Exception as e:
        logger.error(f"Unknown error trying to process task: {e} (task info: {task.task_info})")
    task.completed = timezone.now()
    task.running=False
    task.save()


def check_scheduled_tasks(runtime):
    tasks = AdviseScheduledTask.objects.filter(enabled=True, running=False)
    #runtime = timezone.now()
    tasks_to_run = []
    # notes:
    # We could check first for tasks that have not been run and queue those,
    # then check for tasks whose next_run <= runtime. Any first-run tasks
    # would need to have next_run set based on periodicity at runtime. Minor
    # problem: a task updated with a new periodicity significantly shorter
    # than it was will be delayed for the old periodicity until they get
    # queued and updated. This is maybe more efficient if there are lots of
    # periodic tasks, however, and the delay issue could be solved by having
    # the form process set next_run whenever the task is saved.
    #
    # Alternate idea (and what I'm doing here): Just get all tasks, check
    # against periodicity and last_run, queue if needed, and update after
    # run.
    for t in tasks:
        if t.next_run and t.next_run <= runtime:
            # next run is set and prior to now
            tasks_to_run.append(t)
        elif not t.last_run and not t.next_run:
            # task has not been run yet
            # set next_run and move on
            if t.run_at_time:
                if t.run_at_time < runtime.time():
                    # before current time, so set to tomorrow at this time
                    t.next_run = datetime.combine((runtime + timedelta(days=1)), t.run_at_time)
                else:
                    t.next_run = datetime.combine(runtime, t.run_at_time)
            else:
                t.next_run = runtime + timedelta(seconds=t.period)
            t.save()
        else:
            # next run is set, not now, move on
            # We could also end up here if somehow next run is not
            # set but last_run is, which would be weird.
            continue
    return tasks_to_run


def run_scheduled_task(taskinfo):
    task = taskinfo[0]
    runtime = taskinfo[1]

    #make sure task hasn't been picked up
    updated_task = AdviseScheduledTask.objects.get(id=task.id)
    if updated_task.running:
        #abort - a different worker picked this up
        return
    else:
        updated_task.running=True
        updated_task.save()

    try:
        logger.debug(f"got task: {task.task}")
        do_task = import_string(task.task)
        # do things!
        if task.task_info:
            #if this task has args
            do_task(**task.task_info)
        else:
            do_task()
    except json.JSONDecodeError as e:
        logger.error(f"Unable to decode JSON for task: {e} (raw JSON: {task.task_info})")
    except Exception as e:
        logger.error(f"Unknown error trying to process task: {e} (task info: {task.task_info})")
        logger.error(traceback.format_exc())
        
    if task.run_at_time:
        task.next_run = (runtime + timedelta(days=1)).combine(time=task.run_at_time)
    else:
        task.next_run = (runtime + timedelta(seconds = task.period))
    task.last_run = timezone.now()
    task.running=False
    task.save()



#    if settings.DEPLOYMENT_TYPE == 'AWS':
#        import boto3
#        client = boto3.client('sqs')
#        msgs = client.receive_message(QueueUrl=settings.ADVISE_WORKER_SQS_ARN, WaitTimeSeconds=settings.ADVISE_WORKER_SQS_WAIT_TIME)
#        logger.debug(f"We got messages from SQS: {msgs}")
#        for m in msgs:
#            try:
#                process_message(m)
#            except Exception as e:
#                logger.error(f"Unable to process message from SQS: {e}")
#                continue
#            try:
#                client.delete_message(QueueUrl=settings.ADVISE_WORKER_SQS_ARN, ReceiptHandle=m['ReceiptHandle'])
#            except Exception as e:
#                logger.error(f"Unable to delete successfully processed message: {e}")
#    else:
#        raise RuntimeError("No alternate method defined to process jobs... ")
