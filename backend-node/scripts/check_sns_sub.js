require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { SNSClient, ListSubscriptionsByTopicCommand } = require('@aws-sdk/client-sns');

const region = 'eu-north-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

async function checkSub() {
  const sns = new SNSClient({ region, credentials });
  const res = await sns.send(new ListSubscriptionsByTopicCommand({
    TopicArn: 'arn:aws:sns:eu-north-1:708925320833:disney-whatsapp-inbound-topic'
  }));
  console.log('Subscriptions:', JSON.stringify(res.Subscriptions, null, 2));
}

checkSub();
