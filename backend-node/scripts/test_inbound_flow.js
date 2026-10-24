const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { handleIncomingMessage } = require('../services/whatsappInboundWorker');

async function testFlow() {
  console.log('--- Testing Inbound Message Flow ---');
  const incomingPayload = JSON.stringify({
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
              contacts: [{ wa_id: '918072235899', profile: { name: 'Sundaresh' } }],
              messages: [
                {
                  from: '918072235899',
                  id: 'wamid.HBgMOTExOD...' + Date.now(),
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: 'Can I go Indiana Jones Adventure now?' },
                  type: 'text'
                }
              ]
            }
          }
        ]
      }
    ]
  });

  await handleIncomingMessage(incomingPayload);
}

testFlow();
