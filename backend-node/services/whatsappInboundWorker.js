const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const fs = require('fs');
const path = require('path');
const awsService = require('./awsService');
const { storeEvents } = require('./mockStore');

const region = process.env.SOCIAL_MESSAGING_REGION || 'eu-north-1';
const queueUrl = process.env.WHATSAPP_INBOUND_QUEUE_URL;

let isRunning = false;

function logDebug(title, data) {
  try {
    const logPath = path.join(__dirname, '../inbound_debug.log');
    const entry = `[${new Date().toISOString()}] ${title}:\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}\n==========================================\n`;
    fs.appendFileSync(logPath, entry);
  } catch (e) {}
}

function extractMessageAndSender(payload) {
  // Format 1: AWS Social Messaging Event format (detail)
  if (payload.detail?.From && (payload.detail?.Text?.Body || payload.detail?.text?.body)) {
    return {
      senderPhone: payload.detail.From,
      messageText: payload.detail.Text?.Body || payload.detail.text?.body
    };
  }

  // Format 2: Meta whatsAppWebhookEntry
  let meta = payload;
  if (payload.whatsAppWebhookEntry) {
    try {
      meta = typeof payload.whatsAppWebhookEntry === 'string'
        ? JSON.parse(payload.whatsAppWebhookEntry)
        : payload.whatsAppWebhookEntry;
    } catch (e) {}
  }

  // Meta entry array
  const entries = meta.entry || [meta];
  for (const entry of entries) {
    const changes = entry.changes || [entry];
    for (const change of changes) {
      const val = change.value || change;
      if (val.messages && val.messages.length > 0) {
        const msg = val.messages[0];
        return {
          senderPhone: msg.from,
          messageText: msg.text?.body || msg.body
        };
      }
    }
  }

  // Fallback: deep search for from and text.body
  const str = JSON.stringify(payload);
  const matchFrom = str.match(/"from"\s*:\s*"(\+?\d+)"/i) || str.match(/"From"\s*:\s*"(\+?\d+)"/);
  const matchBody = str.match(/"body"\s*:\s*"([^"]+)"/i) || str.match(/"Body"\s*:\s*"([^"]+)"/);
  if (matchFrom && matchBody) {
    return {
      senderPhone: matchFrom[1],
      messageText: matchBody[1]
    };
  }

  return null;
}

async function startWhatsAppWorker() {
  if (!queueUrl) {
    console.log('[WhatsApp Worker]: WHATSAPP_INBOUND_QUEUE_URL not configured. Skipping SQS polling.');
    return;
  }

  console.log(`[WhatsApp Worker]: Starting Inbound WhatsApp Poller on ${queueUrl} ($0 idle cost)...`);
  const sqs = new SQSClient({ region });
  isRunning = true;

  while (isRunning) {
    try {
      const res = await sqs.send(new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 5,
        WaitTimeSeconds: 20, // Long-polling
        VisibilityTimeout: 30
      }));

      if (res.Messages && res.Messages.length > 0) {
        console.log(`[WhatsApp Worker]: Received ${res.Messages.length} event(s) from SQS! Processing...`);
        for (const msg of res.Messages) {
          try {
            await handleIncomingMessage(msg.Body);
          } catch (processErr) {
            console.error('[WhatsApp Worker Error Processing Message]:', processErr.message);
          } finally {
            // Delete message from SQS after handling
            await sqs.send(new DeleteMessageCommand({
              QueueUrl: queueUrl,
              ReceiptHandle: msg.ReceiptHandle
            }));
          }
        }
      }
    } catch (err) {
      if (!isRunning) break;
      console.warn('[WhatsApp Worker Polling Notice]:', err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

async function handleIncomingMessage(rawBody) {
  let payload;
  try {
    payload = JSON.parse(rawBody);
    // If wrapped in an SNS envelope, extract the inner Message
    if (payload.Message) {
      try {
        payload = JSON.parse(payload.Message);
      } catch (e) {
        payload = payload.Message;
      }
    }
  } catch (e) {
    console.log('[WhatsApp Worker]: Non-JSON payload received, skipping.');
    return;
  }

  logDebug('RAW_PAYLOAD_RECEIVED', payload);

  const extracted = extractMessageAndSender(payload);
  if (!extracted) {
    console.log('[WhatsApp Worker]: Event received was a delivery status receipt, skipping.');
    return;
  }

  let { senderPhone, messageText } = extracted;
  if (!senderPhone.startsWith('+')) {
    senderPhone = '+' + senderPhone;
  }

  console.log(`\n======================================================`);
  console.log(`📱 [INBOUND WHATSAPP RECEIVED] from ${senderPhone}`);
  console.log(`Message: "${messageText}"`);
  console.log(`======================================================\n`);

  logDebug(`INBOUND_MESSAGE_PARSED from ${senderPhone}`, messageText);

  // Emit to real-time activity stream
  storeEvents.emit('whatsapp_live_message', {
    type: 'INBOUND',
    sender: senderPhone,
    recipient: 'Disney Bot (+918072235899)',
    text: messageText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  // 1. Invoke Bedrock / Crowd Concierge with real-time DynamoDB crowd data
  const sessionId = `wa-${senderPhone.replace(/[^0-9]/g, '')}`;
  const assistantReply = await awsService.invokeBedrockAgent(sessionId, messageText, senderPhone);

  console.log(`🤖 [DISNEY CONCIERGE REPLY TO ${senderPhone}]:`);
  console.log(assistantReply);

  logDebug(`OUTBOUND_REPLY to ${senderPhone}`, assistantReply);

  // 2. Dispatch WhatsApp outbound reply via AWS End User Messaging Social
  await awsService.sendWhatsAppAlert(senderPhone, assistantReply);
  console.log(`✓ Dispatched outbound WhatsApp response to ${senderPhone}`);

  // Emit to real-time activity stream
  storeEvents.emit('whatsapp_live_message', {
    type: 'OUTBOUND',
    sender: 'Disney AI Concierge (Bedrock)',
    recipient: senderPhone,
    text: assistantReply,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
}

function stopWhatsAppWorker() {
  isRunning = false;
}

module.exports = {
  startWhatsAppWorker,
  stopWhatsAppWorker,
  handleIncomingMessage
};
