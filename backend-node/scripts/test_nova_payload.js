require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const region = 'us-east-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

async function testNovaPayload() {
  const client = new BedrockRuntimeClient({ region, credentials });
  const systemPrompt = `You are Disney Crowd Sense AI Assistant, an intelligent Disney Park Concierge.
Current Live Park Attractions & Wait Times:
- Indiana Jones Adventure (Adventureland): 35 min wait [Crowd: MEDIUM, Queue Count: 32]`;

  const payload = {
    system: [{ text: systemPrompt }],
    messages: [{ role: 'user', content: [{ text: 'Can I go Indiana Jones Adventure now?' }] }],
    inferenceConfig: { max_new_tokens: 300, temperature: 0.7 }
  };

  try {
    const res = await client.send(new InvokeModelCommand({
      modelId: 'amazon.nova-lite-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: Buffer.from(JSON.stringify(payload))
    }));
    const parsed = JSON.parse(new TextDecoder().decode(res.body));
    console.log('✓ SUCCESS:', parsed.output?.message?.content?.[0]?.text);
  } catch (e) {
    console.error('Error detail:', e.name, e.message);
  }
}

testNovaPayload();
