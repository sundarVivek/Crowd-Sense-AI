require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const region = 'us-east-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

async function testBedrock() {
  const client = new BedrockRuntimeClient({ region, credentials });
  
  // Try Amazon Nova Lite
  try {
    const payload = {
      messages: [{ role: 'user', content: [{ text: 'Hello! Respond in one short sentence.' }] }],
      inferenceConfig: { max_new_tokens: 30 }
    };
    const res = await client.send(new InvokeModelCommand({
      modelId: 'amazon.nova-lite-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: Buffer.from(JSON.stringify(payload))
    }));
    const parsed = JSON.parse(new TextDecoder().decode(res.body));
    console.log('✓ Bedrock Nova Lite succeeded:', parsed.output?.message?.content?.[0]?.text);
    return;
  } catch (err) {
    console.log('Bedrock Nova Lite notice:', err.message);
  }

  // Try Claude 3 Haiku
  try {
    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 30,
      messages: [{ role: 'user', content: 'Hello!' }]
    };
    const res = await client.send(new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: Buffer.from(JSON.stringify(payload))
    }));
    const parsed = JSON.parse(new TextDecoder().decode(res.body));
    console.log('✓ Bedrock Claude Haiku succeeded:', parsed.content?.[0]?.text);
    return;
  } catch (err) {
    console.log('Bedrock Claude Haiku notice:', err.message);
  }
}

testBedrock();
