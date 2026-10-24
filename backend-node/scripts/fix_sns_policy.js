require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { SNSClient, SetTopicAttributesCommand } = require('@aws-sdk/client-sns');

const region = 'eu-north-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

async function addAllPrincipals() {
  const sns = new SNSClient({ region, credentials });
  const topicArn = 'arn:aws:sns:eu-north-1:708925320833:disney-whatsapp-inbound-topic';

  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowOwner',
        Effect: 'Allow',
        Principal: {
          AWS: 'arn:aws:iam::708925320833:root'
        },
        Action: [
          'sns:Publish',
          'sns:Subscribe',
          'sns:GetTopicAttributes',
          'sns:SetTopicAttributes'
        ],
        Resource: topicArn
      },
      {
        Sid: 'AllowAllEndUserMessagingServices',
        Effect: 'Allow',
        Principal: {
          Service: [
            'social-messaging.amazonaws.com',
            'sms-voice.amazonaws.com',
            'pinpoint.amazonaws.com',
            'events.amazonaws.com'
          ]
        },
        Action: 'sns:Publish',
        Resource: topicArn
      }
    ]
  };

  await sns.send(new SetTopicAttributesCommand({
    TopicArn: topicArn,
    AttributeName: 'Policy',
    AttributeValue: JSON.stringify(policy)
  }));

  console.log('✓ SNS Topic Policy updated with all service principals!');
}

addAllPrincipals();
