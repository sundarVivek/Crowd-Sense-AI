require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { SQSClient, GetQueueAttributesCommand, SetQueueAttributesCommand } = require('@aws-sdk/client-sqs');

const region = 'eu-north-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

async function fixSqsPolicy() {
  const sqs = new SQSClient({ region, credentials });
  const queueUrl = 'https://sqs.eu-north-1.amazonaws.com/708925320833/disney-whatsapp-inbound-queue';
  const queueArn = 'arn:aws:sqs:eu-north-1:708925320833:disney-whatsapp-inbound-queue';
  const topicArn = 'arn:aws:sns:eu-north-1:708925320833:disney-whatsapp-inbound-topic';

  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowSNSMessages',
        Effect: 'Allow',
        Principal: '*',
        Action: 'sqs:SendMessage',
        Resource: queueArn,
        Condition: {
          ArnLike: {
            'aws:SourceArn': topicArn
          }
        }
      }
    ]
  };

  await sqs.send(new SetQueueAttributesCommand({
    QueueUrl: queueUrl,
    Attributes: {
      Policy: JSON.stringify(policy)
    }
  }));

  console.log('✓ SQS Queue Policy verified with ArnLike!');
}

fixSqsPolicy();
