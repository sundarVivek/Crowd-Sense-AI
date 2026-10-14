import os
import json
import boto3

bedrock_agent_runtime = boto3.client('bedrock-agent-runtime')
social_messaging = boto3.client('socialmessaging')

ORIGINATION_PHONE_ID = os.environ.get('ORIGINATION_PHONE_NUMBER_ID', '')
AGENT_ID = os.environ.get('BEDROCK_AGENT_ID', '')
AGENT_ALIAS_ID = os.environ.get('BEDROCK_AGENT_ALIAS_ID', '')

def send_whatsapp_reply(to_phone, message_text):
    """
    Sends WhatsApp outbound reply via AWS End User Messaging Social
    """
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": message_text}
    }
    social_messaging.send_whatsapp_message(
        originationPhoneNumberId=ORIGINATION_PHONE_ID,
        metaApiVersion='v20.0',
        message=json.dumps(payload).encode('utf-8')
    )

def lambda_handler(event, context):
    """
    Inbound webhook for WhatsApp messages from AWS End User Messaging Social / Meta
    """
    # 1. Webhook Verification Challenge (for initial Meta handshake)
    query_params = event.get('queryStringParameters') or {}
    if query_params.get('hub.mode') == 'subscribe':
        return {
            'statusCode': 200,
            'body': query_params.get('hub.challenge')
        }

    # 2. Inbound Message Processing
    body = json.loads(event.get('body', '{}'))
    entry = body.get('entry', [{}])[0]
    changes = entry.get('changes', [{}])[0]
    value = changes.get('value', {})
    messages = value.get('messages', [])

    if not messages:
        return {'statusCode': 200, 'body': 'No messages to process'}

    incoming = messages[0]
    sender_phone = incoming.get('from')
    text_content = incoming.get('text', {}).get('body', '')

    # 3. Invoke Amazon Bedrock AgentCore
    clean_session = f"wa{sender_phone}"[:32]
    response = bedrock_agent_runtime.invoke_agent(
        agentId=AGENT_ID,
        agentAliasId=AGENT_ALIAS_ID,
        sessionId=clean_session,
        inputText=f"[Guest: {sender_phone}] {text_content}"
    )

    # 4. Stream response
    reply_text = ""
    for event_chunk in response.get('completion', []):
        if 'chunk' in event_chunk and 'bytes' in event_chunk['chunk']:
            reply_text += event_chunk['chunk']['bytes'].decode('utf-8')

    if not reply_text:
        reply_text = "Space Mountain and other attractions are running smoothly! Ask me anytime."

    # 5. Send outbound reply via AWS End User Messaging
    send_whatsapp_reply(sender_phone, reply_text)

    return {'statusCode': 200, 'body': 'Replied successfully'}
