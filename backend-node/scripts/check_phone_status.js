require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { SocialMessagingClient, GetLinkedWhatsAppBusinessAccountPhoneNumberCommand } = require('@aws-sdk/client-socialmessaging');

const region = 'eu-north-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

async function checkPhone() {
  const client = new SocialMessagingClient({ region, credentials });
  try {
    const res = await client.send(new GetLinkedWhatsAppBusinessAccountPhoneNumberCommand({
      id: 'phone-number-id-e14db65d3dcb4be681bfb4bfa638baf0'
    }));
    console.log('Phone details:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Error checking phone:', err.message);
  }
}

checkPhone();
