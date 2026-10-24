require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { SocialMessagingClient, SendWhatsAppMessageCommand } = require('@aws-sdk/client-socialmessaging');

const region = 'eu-north-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

async function testSend(recipientPhone) {
  const client = new SocialMessagingClient({ region, credentials });
  const payload = JSON.stringify({
    messaging_product: 'whatsapp',
    to: recipientPhone,
    type: 'text',
    text: { body: '🏰 *Disney Crowd Sense AI Alert*: Space Mountain wait time dropped to 15 mins! Walk over now! ✨' }
  });

  try {
    const res = await client.send(new SendWhatsAppMessageCommand({
      originationPhoneNumberId: 'phone-number-id-e14db65d3dcb4be681bfb4bfa638baf0',
      metaApiVersion: 'v20.0',
      message: Buffer.from(payload)
    }));
    console.log('✓ Successfully sent WhatsApp message! Response:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.log('WhatsApp Send result:', err.message);
  }
}

// Test sending to the number from WABA: +91 80722 35899
testSend('+918072235899');
