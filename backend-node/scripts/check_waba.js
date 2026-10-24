require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { SocialMessagingClient, ListLinkedWhatsAppBusinessAccountsCommand, GetLinkedWhatsAppBusinessAccountCommand } = require('@aws-sdk/client-socialmessaging');

const region = 'eu-north-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

async function checkWaba() {
  const client = new SocialMessagingClient({ region, credentials });
  try {
    const list = await client.send(new ListLinkedWhatsAppBusinessAccountsCommand({}));
    console.log('Linked WABAs in eu-north-1:', JSON.stringify(list, null, 2));

    const account = await client.send(new GetLinkedWhatsAppBusinessAccountCommand({
      id: 'waba-3bcb1c396ec446dc8944a2639a397264'
    }));
    console.log('Account Details:', JSON.stringify(account, null, 2));
  } catch (err) {
    console.error('Error in eu-north-1:', err);
  }
}

checkWaba();
