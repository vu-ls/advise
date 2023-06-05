import json
import os
import urllib3
import boto3


def lambda_handler(event, context):
    message = json.loads(event['Records'][0]['Sns']['Message'])
    desc = message["AlarmDescription"]
    name = message["AlarmName"]
    try:
        account = message["AWSAccountId"]
    except IndexError:
        account = "N/A"

    state = message["NewStateValue"]
    reason = message["NewStateReason"]

    try:
        account = boto3.client('iam').list_account_aliases()['AccountAliases'][0]
    except Exception:
        pass

    message = ''
    if state == "ALARM":
        message = f":exclamation: {desc} {state} :exclamation:\n  - Account: {account}\n  - Reason: {reason}"
    elif state == "OK":
        message = f":white_check_mark: {desc} {state} :white_check_mark:\n  - Account: {account}\n  - Reason: {reason}"
    else:
        message = f":question: {desc} unknown state: {state}! :question:\n  - Account: {account}\n  - Reason: {reason}"

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
