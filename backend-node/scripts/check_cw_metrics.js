require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { CloudWatchClient, GetMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const region = 'eu-north-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

async function checkMetrics() {
  const cw = new CloudWatchClient({ region, credentials });
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // last 1 hour

  try {
    const res = await cw.send(new GetMetricDataCommand({
      StartTime: startTime,
      EndTime: endTime,
      MetricDataQueries: [
        {
          Id: 'm1',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/SNS',
              MetricName: 'NumberOfMessagesPublished',
              Dimensions: [{ Name: 'TopicName', Value: 'disney-whatsapp-inbound-topic' }]
            },
            Period: 300,
            Stat: 'Sum'
          }
        },
        {
          Id: 'm2',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/SNS',
              MetricName: 'NumberOfNotificationsFailed',
              Dimensions: [{ Name: 'TopicName', Value: 'disney-whatsapp-inbound-topic' }]
            },
            Period: 300,
            Stat: 'Sum'
          }
        }
      ]
    }));
    console.log('Metrics:', JSON.stringify(res.MetricDataResults, null, 2));
  } catch (e) {
    console.error('CW error:', e.message);
  }
}

checkMetrics();
