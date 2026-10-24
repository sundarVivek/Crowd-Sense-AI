require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { SocialMessagingClient, ListLinkedWhatsAppBusinessAccountsCommand } = require('@aws-sdk/client-socialmessaging');

const region = 'us-east-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

async function testSocialMessaging() {
  const client = new SocialMessagingClient({ region, credentials });
  try {
    const res = await client.send(new ListLinkedWhatsAppBusinessAccountsCommand({}));
    console.log('✓ SocialMessaging API access verified! Accounts:', res.linkedWhatsAppBusinessAccounts || []);
  } catch (err) {
    console.log('SocialMessaging Status:', err.message);
  }
}

testSocialMessaging();
