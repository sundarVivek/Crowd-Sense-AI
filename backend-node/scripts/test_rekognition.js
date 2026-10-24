require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { RekognitionClient, DetectLabelsCommand } = require('@aws-sdk/client-rekognition');

const region = 'us-east-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

// 1x1 transparent PNG buffer
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

async function testRekognition() {
  const client = new RekognitionClient({ region, credentials });
  try {
    const res = await client.send(new DetectLabelsCommand({
      Image: { Bytes: tinyPng },
      MaxLabels: 5,
      MinConfidence: 50
    }));
    console.log('✓ Rekognition call succeeded! Labels count:', res.Labels ? res.Labels.length : 0);
  } catch (err) {
    console.error('Rekognition test error:', err.message);
  }
}

testRekognition();
