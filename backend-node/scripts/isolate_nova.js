require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function test(name, payload) {
  try {
    const res = await client.send(new InvokeModelCommand({
      modelId: 'amazon.nova-lite-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: Buffer.from(JSON.stringify(payload))
    }));
    const parsed = JSON.parse(new TextDecoder().decode(res.body));
    console.log(`[${name}] SUCCESS:`, parsed.output?.message?.content?.[0]?.text?.slice(0, 50));
  } catch (e) {
    console.log(`[${name}] FAILED:`, e.message);
  }
}

async function run() {
  // Test 1: No system, only user
  await test('No system', {
    messages: [{ role: 'user', content: [{ text: 'Can I go Indiana Jones Adventure now? The wait is 35 minutes.' }] }]
  });

  // Test 2: system with system: [{ text: "..." }]
  await test('With system', {
    system: [{ text: 'You are Disney Crowd Assistant.' }],
    messages: [{ role: 'user', content: [{ text: 'Hi' }] }]
  });

  // Test 3: system with inferenceConfig
  await test('inferenceConfig maxTokens', {
    inferenceConfig: { max_new_tokens: 200 },
    messages: [{ role: 'user', content: [{ text: 'Hi' }] }]
  });

  // Test 4: inferenceConfig temperature
  await test('inferenceConfig temp', {
    inferenceConfig: { temperature: 0.7 },
    messages: [{ role: 'user', content: [{ text: 'Hi' }] }]
  });
}

run();
