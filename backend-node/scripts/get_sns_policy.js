require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { SNSClient, GetTopicAttributesCommand } = require('@aws-sdk/client-sns');

const region = 'eu-north-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

async function getAttrs() {
  const sns = new SNSClient({ region, credentials });
  const res = await sns.send(new GetTopicAttributesCommand({
    TopicArn: 'arn:aws:sns:eu-north-1:708925320833:disney-whatsapp-inbound-topic'
  }));
  console.log('SNS Topic Attributes:');
  console.log(JSON.stringify(res.Attributes, null, 2));
}

getAttrs();
