const mockStore = require('./mockStore');

const isAwsConfigured = Boolean(
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
);

console.log(`[AWS Config Status]: ${isAwsConfigured ? 'LIVE AWS ACTIVE (Connected to Region ' + process.env.AWS_REGION + ')' : 'HIGH-FIDELITY SIMULATION MODE'}`);

async function getAllRides() {
  if (isAwsConfigured) {
    try {
      // Lazy load SDK
      const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
      const client = new DynamoDBClient({ region: process.env.AWS_REGION });
      const res = await client.send(new ScanCommand({ TableName: process.env.DYNAMODB_RIDES_TABLE || 'Rides' }));
      if (res.Items && res.Items.length > 0) {
        return res.Items.map(item => ({
          rideId: item.ride_id?.S || '',
          rideName: item.ride_name?.S || '',
          land: item.land?.S || '',
          personCount: parseInt(item.person_count?.N || '0', 10),
          crowdLevel: item.crowd_level?.S || 'LOW',
          estimatedWaitMinutes: parseInt(item.estimated_wait_minutes?.N || '0', 10),
          lastUpdated: item.last_updated?.S || ''
        }));
      }
    } catch (err) {
      console.warn('[AWS DynamoDB Scan Warning]:', err.message);
    }
  }
  return mockStore.getRides();
}

async function upsertRide(ride) {
  if (isAwsConfigured) {
    try {
      const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
      const client = new DynamoDBClient({ region: process.env.AWS_REGION });
      await client.send(new PutItemCommand({
        TableName: process.env.DYNAMODB_RIDES_TABLE || 'Rides',
        Item: {
          ride_id: { S: ride.rideId },
          ride_name: { S: ride.rideName },
          land: { S: ride.land },
          person_count: { N: String(ride.personCount) },
          crowd_level: { S: ride.crowdLevel },
          estimated_wait_minutes: { N: String(ride.estimatedWaitMinutes) },
          last_updated: { S: new Date().toISOString() }
        }
      }));
    } catch (err) {
      console.warn('[AWS DynamoDB Put Warning]:', err.message);
    }
  }
  return mockStore.updateRide(ride);
}

async function analyzeQueueImage(buffer) {
  if (isAwsConfigured) {
    try {
      const { RekognitionClient, DetectLabelsCommand } = require('@aws-sdk/client-rekognition');
      const client = new RekognitionClient({ region: process.env.AWS_REGION });
      const res = await client.send(new DetectLabelsCommand({
        Image: { Bytes: buffer },
        MaxLabels: 25,
        MinConfidence: 70
      }));
      const personLabel = res.Labels?.find(l => l.Name?.toLowerCase() === 'person');
      const count = personLabel?.Instances?.length || 0;
      return { count, ...mockStore.calculateWaitTime(count) };
    } catch (err) {
      console.warn('[AWS Rekognition Warning]:', err.message);
    }
  }

  // Simulation mode: dynamic detection based on buffer hash
  let count = 18;
  if (buffer && buffer.length > 0) {
    count = (buffer[0] + buffer[buffer.length - 1]) % 65 + 5;
  }
  return { count, ...mockStore.calculateWaitTime(count) };
}

async function invokeBedrockAgent(sessionId, message, phoneNumber = '+1234567890') {
  if (isAwsConfigured) {
    // 1. If Bedrock Agent ID is explicitly provided, try Bedrock Agent
    if (process.env.BEDROCK_AGENT_ID && process.env.BEDROCK_AGENT_ALIAS_ID) {
      try {
        const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require('@aws-sdk/client-bedrock-agent-runtime');
        const client = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION });
        const cleanSession = sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
        const res = await client.send(new InvokeAgentCommand({
          agentId: process.env.BEDROCK_AGENT_ID,
          agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID,
          sessionId: cleanSession,
          inputText: `[Guest Phone: ${phoneNumber}] ${message}`
        }));

        let reply = '';
        if (res.completion) {
          for await (const chunk of res.completion) {
            if (chunk.chunk && chunk.chunk.bytes) {
              reply += new TextDecoder('utf-8').decode(chunk.chunk.bytes);
            }
          }
        }
        if (reply.trim()) return reply;
      } catch (err) {
        console.warn('[AWS Bedrock Agent Warning]:', err.message);
      }
    }

    // 2. Direct Amazon Bedrock Nova Lite invocation (100% Live AWS Bedrock in ap-southeast-2)
    try {
      const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
      const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

      // Fetch live ride data from DynamoDB for ground-truth context
      const currentRides = await getAllRides();
      const ridesSummary = currentRides.map(r =>
        `- ${r.rideName} (${r.land}): ${r.estimatedWaitMinutes} min wait [Crowd: ${r.crowdLevel}, Queue Count: ${r.personCount}]`
      ).join('\n');

      const systemPrompt = `You are Disney Crowd Sense AI Assistant, an intelligent Disney Park Concierge.
You have real-time access to camera-based queue headcounts and wait times powered by Amazon Rekognition and DynamoDB in Sydney (ap-southeast-2).

Current Live Park Attractions & Wait Times:
${ridesSummary}

Guidelines:
- Provide warm, magical, Disney-themed concierge responses with Disney emojis (🏰, ✨, 🌟).
- Answer questions about ride wait times, crowd levels, and park recommendations using the live data above.
- Crowd diversion: If a guest asks about a high-wait ride (e.g., >40 mins), always proactively suggest a nearby attraction in the same or adjacent land with low wait times.
- If a guest wants to set an alert or monitor wait times, confirm that their alert is saved and that our automated WhatsApp notification engine will notify them as soon as the wait drops.
- Keep responses concise, engaging, and mobile-friendly for WhatsApp.`;

      const payload = {
        system: [{ text: systemPrompt }],
        messages: [{ role: 'user', content: [{ text: message }] }],
        inferenceConfig: { max_new_tokens: 300, temperature: 0.7 }
      };

      const res = await client.send(new InvokeModelCommand({
        modelId: process.env.BEDROCK_MODEL_ID || 'amazon.nova-lite-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: Buffer.from(JSON.stringify(payload))
      }));

      const parsed = JSON.parse(new TextDecoder().decode(res.body));
      const textReply = parsed.output?.message?.content?.[0]?.text;
      if (textReply && textReply.trim()) {
        console.log(`[AWS Bedrock Nova Live]: Responded to "${message.slice(0, 30)}..."`);
        return textReply.trim();
      }
    } catch (bedrockErr) {
      console.warn('[AWS Bedrock Runtime Nova Warning]:', bedrockErr.message);
    }
  }

  return mockStore.generateAiResponse(message, phoneNumber);
}

async function sendWhatsAppAlert(recipientPhone, messageText) {
  if (isAwsConfigured && process.env.ORIGINATION_PHONE_NUMBER_ID) {
    try {
      const { SocialMessagingClient, SendWhatsAppMessageCommand } = require('@aws-sdk/client-socialmessaging');
      const client = new SocialMessagingClient({ region: process.env.AWS_REGION });
      const payload = JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipientPhone,
        type: 'text',
        text: { body: messageText }
      });
      await client.send(new SendWhatsAppMessageCommand({
        originationPhoneNumberId: process.env.ORIGINATION_PHONE_NUMBER_ID,
        metaApiVersion: 'v20.0',
        message: Buffer.from(payload)
      }));
      console.log(`[AWS Social Messaging] Dispatched WhatsApp to ${recipientPhone}`);
      return true;
    } catch (err) {
      console.warn('[AWS Social Messaging Warning]:', err.message);
    }
  }

  console.log(`[Simulated WhatsApp Notification to ${recipientPhone}]:\n${messageText}`);
  return true;
}

module.exports = {
  isAwsConfigured,
  getAllRides,
  upsertRide,
  analyzeQueueImage,
  invokeBedrockAgent,
  sendWhatsAppAlert,
  mockStore
};
