require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { BedrockClient, ListFoundationModelsCommand } = require('@aws-sdk/client-bedrock');

const client = new BedrockClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function listModels() {
  try {
    const res = await client.send(new ListFoundationModelsCommand({}));
    const activeTextModels = res.modelSummaries
      .filter(m => m.outputModalities?.includes('TEXT') && m.modelLifecycle?.status === 'ACTIVE')
      .map(m => ({ id: m.modelId, name: m.modelName, provider: m.providerName }));
    console.log('Active text models count:', activeTextModels.length);
    console.log(JSON.stringify(activeTextModels.slice(0, 15), null, 2));
  } catch (e) {
    console.error('List error:', e.message);
  }
}

listModels();
