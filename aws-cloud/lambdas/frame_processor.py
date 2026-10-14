import os
import boto3
from datetime import datetime, timezone

s3_client = boto3.client('s3')
rekognition = boto3.client('rekognition')
dynamodb = boto3.resource('dynamodb')

RIDES_TABLE = os.environ.get('RIDES_TABLE', 'Rides')
table = dynamodb.Table(RIDES_TABLE)

def calculate_wait_time(person_count):
    """
    Computes estimated wait minutes and crowd density bucket from headcount.
    """
    if person_count < 15:
        return 10, "LOW"
    elif person_count < 40:
        return 25, "MEDIUM"
    else:
        return int(person_count * 1.5), "HIGH"

def lambda_handler(event, context):
    """
    Triggered by S3 ObjectCreated events when camera feeds upload snapshot JPEGs.
    Analyzes headcount with Amazon Rekognition DetectLabels and updates DynamoDB.
    """
    for record in event.get('Records', []):
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']  # format: "space_mountain/snapshot.jpg"
        ride_id = key.split('/')[0]

        # Call Rekognition DetectLabels
        response = rekognition.detect_labels(
            Image={'S3Object': {'Bucket': bucket, 'Name': key}},
            MaxLabels=25,
            MinConfidence=70.0
        )

        person_count = 0
        for label in response.get('Labels', []):
            if label.get('Name') == 'Person':
                person_count = len(label.get('Instances', []))
                break

        wait_mins, crowd_level = calculate_wait_time(person_count)

        # Update DynamoDB table
        table.update_item(
            Key={'ride_id': ride_id},
            UpdateExpression="SET person_count = :pc, estimated_wait_minutes = :wm, crowd_level = :cl, last_updated = :ts",
            ExpressionAttributeValues={
                ':pc': person_count,
                ':wm': wait_mins,
                ':cl': crowd_level,
                ':ts': datetime.now(timezone.utc).isoformat()
            }
        )

    return {"statusCode": 200, "body": "Processed Queue Frames"}
