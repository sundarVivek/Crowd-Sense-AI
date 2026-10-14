import json
import boto3

dynamodb = boto3.resource('dynamodb')
rides_table = dynamodb.Table('Rides')
alerts_table = dynamodb.Table('UserAlerts')

from decimal import Decimal

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError

def lambda_handler(event, context):
    """
    Action Group handler invoked by Amazon Bedrock AgentCore.
    Resolves /ride/{ride_id} and /alerts API paths.
    """
    api_path = event.get('apiPath')
    http_method = event.get('httpMethod')
    response_body = {}

    if api_path == '/ride/{ride_id}' and http_method == 'GET':
        parameters = event.get('parameters', [])
        ride_id = next((p['value'] for p in parameters if p['name'] == 'ride_id'), None)

        if ride_id:
            item = rides_table.get_item(Key={'ride_id': ride_id}).get('Item', {})
            response_body = item
        else:
            response_body = {"error": "Missing ride_id parameter"}

    elif api_path == '/alerts' and http_method == 'POST':
        raw_body = event.get('requestBody', {}).get('content', {}).get('application/json', {}).get('properties', '{}')
        if isinstance(raw_body, str):
            body = json.loads(raw_body)
        else:
            body = raw_body

        alerts_table.put_item(Item={
            'phone_number': body['phone_number'],
            'ride_id': body['ride_id'],
            'target_wait_minutes': int(body['target_wait_minutes'])
        })
        response_body = {"status": "success", "message": "Alert created successfully"}

    return {
        "messageVersion": "1.0",
        "response": {
            "actionGroup": event.get('actionGroup'),
            "apiPath": api_path,
            "httpMethod": http_method,
            "httpStatusCode": 200,
            "responseBody": {
                "application/json": {
                    "body": json.dumps(response_body, default=decimal_default)
                }
            }
        }
    }
