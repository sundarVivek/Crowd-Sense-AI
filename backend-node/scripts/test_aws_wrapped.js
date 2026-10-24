const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { handleIncomingMessage } = require('../services/whatsappInboundWorker');

async function testAwsWrapped() {
  const metaPayload = {
    entry: [
      {
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+91 80722 35899',
                phone_number_id: '1411447178716182'
              },
              messages: [
                {
                  from: '918072235899',
                  text: { body: 'Can I go Indiana Jones adventure now?' }
                }
              ]
            }
          }
        ]
      }
    ]
  };

  const awsSocialPayload = {
    context: { MetaWabaIds: [], MetaPhoneNumberIds: [] },
    whatsAppWebhookEntry: JSON.stringify(metaPayload),
    aws_account_id: '708925320833',
    messageId: 'test-123'
  };

  const snsPayload = {
    Type: 'Notification',
    MessageId: 'test-sns-123',
    TopicArn: 'arn:aws:sns:eu-north-1:708925320833:disney-whatsapp-inbound-topic',
    Message: JSON.stringify(awsSocialPayload)
  };

  console.log('Testing full SNS -> AWS Social Messaging -> WhatsApp Worker parse...');
  await handleIncomingMessage(JSON.stringify(snsPayload));
}

testAwsWrapped();
