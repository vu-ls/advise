import json
import os
import urllib3
import boto3

def lambda_handler(event, context):
    message = json.loads(event['Records'][0]['Sns']['Message'])
    resource = message["resources"][0].split(':')
    try:
        account = resource[4]
        service = resource[5].split('/')[2]
    except IndexError:
        account = "N/A"
        service = "N/A"
        
    event = message['detail']['eventName']
    
    try:
        account = boto3.client('iam').list_account_aliases()['AccountAliases'][0]
    except Exception:
        pass
    
    message = ''
    if event.startswith('SERVICE_DEPLOYMENT_'):
        if event == 'SERVICE_DEPLOYMENT_FAILED':
            message = f":x: Service deployment for {service} in acct. {account} failed! :x:"
        elif event == 'SERVICE_DEPLOYMENT_IN_PROGRESS':
            message = f":information_desk_person: Service deployment for {service} in acct. {account} in progress!"
        elif event == 'SERVICE_DEPLOYMENT_COMPLETED':
            message = f":white_check_mark: Service deployment for {service} in acct. {account} completed! :white_check_mark:"
        else:
            message = f":question: Service deployment for {service} in acct. {account} unknown status: {event}! :question:"
    else:
        return
    
    webhook_url = os.environ['WEBHOOK_URL']
    data = {
        'text': message
    }
    headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + os.environ['WEBHOOK_TOKEN']
    }
    http = urllib3.PoolManager()
    res = http.request("POST", webhook_url, body=json.dumps(data), headers=headers)
    