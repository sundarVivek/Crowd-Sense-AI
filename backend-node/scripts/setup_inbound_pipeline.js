require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { SNSClient, CreateTopicCommand, SetTopicAttributesCommand, SubscribeCommand } = require('@aws-sdk/client-sns');
const { SQSClient, CreateQueueCommand, GetQueueAttributesCommand, SetQueueAttributesCommand } = require('@aws-sdk/client-sqs');
const { SocialMessagingClient, PutWhatsAppBusinessAccountEventDestinationsCommand } = require('@aws-sdk/client-socialmessaging');

const region = 'eu-north-1';
const accountId = '708925320833';
const wabaId = 'waba-3bcb1c396ec446dc8944a2639a397264';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

const sns = new SNSClient({ region, credentials });
const sqs = new SQSClient({ region, credentials });
const social = new SocialMessagingClient({ region, credentials });

async function setupInboundPipeline() {
  console.log('=== Step 1: Create SNS Topic for WhatsApp Inbound in eu-north-1 ===');
  const topicRes = await sns.send(new CreateTopicCommand({
    Name: 'disney-whatsapp-inbound-topic'
  }));
  const topicArn = topicRes.TopicArn;
  console.log('✓ SNS Topic Created:', topicArn);

  console.log('=== Step 2: Set SNS Topic Policy for social-messaging.amazonaws.com ===');
  const snsPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowWhatsAppEventDestinations',
        Effect: 'Allow',
        Principal: {
          Service: 'social-messaging.amazonaws.com'
        },
        Action: 'sns:Publish',
        Resource: topicArn,
        Condition: {
          StringEquals: {
            'aws:SourceAccount': accountId
          }
        }
      }
    ]
  };

  await sns.send(new SetTopicAttributesCommand({
    TopicArn: topicArn,
    AttributeName: 'Policy',
    AttributeValue: JSON.stringify(snsPolicy)
  }));
  console.log('✓ SNS Topic Policy set successfully.');

  console.log('=== Step 3: Create SQS Queue for Inbound Polling ===');
  const queueRes = await sqs.send(new CreateQueueCommand({
    QueueName: 'disney-whatsapp-inbound-queue',
    Attributes: {
      ReceiveMessageWaitTimeSeconds: '20' // Long polling = 0 cost when idle
    }
  }));
  const queueUrl = queueRes.QueueUrl;
  console.log('✓ SQS Queue URL:', queueUrl);

  const queueAttrs = await sqs.send(new GetQueueAttributesCommand({
    QueueUrl: queueUrl,
    AttributeNames: ['QueueArn']
  }));
  const queueArn = queueAttrs.Attributes.QueueArn;
  console.log('✓ SQS Queue ARN:', queueArn);

  console.log('=== Step 4: Set SQS Access Policy to allow SNS Topic ===');
  const sqsPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowSNSMessages',
        Effect: 'Allow',
        Principal: '*',
        Action: 'sqs:SendMessage',
        Resource: queueArn,
        Condition: {
          ArnEquals: {
            'aws:SourceArn': topicArn
          }
        }
      }
    ]
  };

  await sqs.send(new SetQueueAttributesCommand({
    QueueUrl: queueUrl,
    Attributes: {
      Policy: JSON.stringify(sqsPolicy)
    }
  }));
  console.log('✓ SQS Queue Policy set successfully.');

  console.log('=== Step 5: Subscribe SQS Queue to SNS Topic ===');
  const subRes = await sns.send(new SubscribeCommand({
    TopicArn: topicArn,
    Protocol: 'sqs',
    Endpoint: queueArn,
    Attributes: {
      RawMessageDelivery: 'false'
    }
  }));
  console.log('✓ Subscribed SQS to SNS. SubscriptionArn:', subRes.SubscriptionArn);

  console.log('=== Step 6: Link SNS Topic as Event Destination on WABA ===');
  await social.send(new PutWhatsAppBusinessAccountEventDestinationsCommand({
    id: wabaId,
    eventDestinations: [
      {
        eventDestinationArn: topicArn
      }
    ]
  }));
  console.log('✓ Successfully attached Event Destination to WABA:', wabaId);

  console.log('\n======================================================');
  console.log('🎉 INBOUND WHATSAPP PIPELINE READY ($0 IDLE COST)');
  console.log('SNS Topic ARN:', topicArn);
  console.log('SQS Queue URL:', queueUrl);
  console.log('======================================================\n');

  return { topicArn, queueUrl };
}

setupInboundPipeline().catch(err => {
  console.error('Setup Error:', err);
  process.exit(1);
});
