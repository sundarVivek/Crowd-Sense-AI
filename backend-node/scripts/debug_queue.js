require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { SQSClient, GetQueueAttributesCommand, ReceiveMessageCommand } = require('@aws-sdk/client-sqs');
const { SocialMessagingClient, GetLinkedWhatsAppBusinessAccountCommand } = require('@aws-sdk/client-socialmessaging');

const region = 'eu-north-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

async function checkQueue() {
  const sqs = new SQSClient({ region, credentials });
  const queueUrl = 'https://sqs.eu-north-1.amazonaws.com/708925320833/disney-whatsapp-inbound-queue';

  const attrs = await sqs.send(new GetQueueAttributesCommand({
    QueueUrl: queueUrl,
    AttributeNames: ['All']
  }));
  console.log('SQS Attributes:', attrs.Attributes);

  // Check WABA event destinations
  const social = new SocialMessagingClient({ region, credentials });
  const waba = await social.send(new GetLinkedWhatsAppBusinessAccountCommand({
    id: 'waba-3bcb1c396ec446dc8944a2639a397264'
  }));
  console.log('WABA Event Destinations:', JSON.stringify(waba.account.eventDestinations, null, 2));
}

checkQueue();
