require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { DynamoDBClient, CreateTableCommand, DescribeTableCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');

const region = 'us-east-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

const ddb = new DynamoDBClient({ region, credentials });
const s3 = new S3Client({ region, credentials });

async function waitForTable(tableName) {
  console.log(`Waiting for table '${tableName}' to become ACTIVE...`);
  while (true) {
    try {
      const res = await ddb.send(new DescribeTableCommand({ TableName: tableName }));
      if (res.Table && res.Table.TableStatus === 'ACTIVE') {
        console.log(`✓ Table '${tableName}' is ACTIVE.`);
        break;
      }
    } catch (e) {
      console.log(`Checking '${tableName}'...`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

async function createDynamoTables() {
  // 1. Rides Table (PK: ride_id) - On-Demand (Free Tier / $0 idle)
  console.log('Creating DynamoDB table: Rides (PAY_PER_REQUEST)...');
  try {
    await ddb.send(new CreateTableCommand({
      TableName: 'Rides',
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'ride_id', AttributeType: 'S' }
      ],
      KeySchema: [
        { AttributeName: 'ride_id', KeyType: 'HASH' }
      ]
    }));
    console.log('✓ Rides table creation initiated.');
  } catch (err) {
    if (err.name === 'ResourceInUseException') {
      console.log('ℹ Rides table already exists.');
    } else {
      throw err;
    }
  }

  // 2. UserAlerts Table (PK: phone_number, SK: ride_id) - On-Demand
  console.log('Creating DynamoDB table: UserAlerts (PAY_PER_REQUEST)...');
  try {
    await ddb.send(new CreateTableCommand({
      TableName: 'UserAlerts',
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'phone_number', AttributeType: 'S' },
        { AttributeName: 'ride_id', AttributeType: 'S' }
      ],
      KeySchema: [
        { AttributeName: 'phone_number', KeyType: 'HASH' },
        { AttributeName: 'ride_id', KeyType: 'RANGE' }
      ]
    }));
    console.log('✓ UserAlerts table creation initiated.');
  } catch (err) {
    if (err.name === 'ResourceInUseException') {
      console.log('ℹ UserAlerts table already exists.');
    } else {
      throw err;
    }
  }

  await waitForTable('Rides');
  await waitForTable('UserAlerts');
}

async function seedRides() {
  const rides = [
    { rideId: 'space_mountain', rideName: 'Space Mountain', land: 'Tomorrowland', personCount: 52, crowdLevel: 'HIGH', wait: 75 },
    { rideId: 'star_tours', rideName: 'Star Tours: The Adventures Continue', land: 'Tomorrowland', personCount: 14, crowdLevel: 'LOW', wait: 15 },
    { rideId: 'pirates_caribbean', rideName: 'Pirates of the Caribbean', land: 'New Orleans Square', personCount: 24, crowdLevel: 'MEDIUM', wait: 25 },
    { rideId: 'big_thunder', rideName: 'Big Thunder Mountain Railroad', land: 'Frontierland', personCount: 38, crowdLevel: 'MEDIUM', wait: 40 },
    { rideId: 'peter_pan', rideName: "Peter Pan's Flight", land: 'Fantasyland', personCount: 46, crowdLevel: 'HIGH', wait: 65 },
    { rideId: 'haunted_mansion', rideName: 'Haunted Mansion', land: 'New Orleans Square', personCount: 16, crowdLevel: 'LOW', wait: 20 },
    { rideId: 'millennium_falcon', rideName: "Millennium Falcon: Smugglers Run", land: "Star Wars: Galaxy's Edge", personCount: 42, crowdLevel: 'HIGH', wait: 60 },
    { rideId: 'indiana_jones', rideName: 'Indiana Jones Adventure', land: 'Adventureland', personCount: 32, crowdLevel: 'MEDIUM', wait: 35 }
  ];

  console.log(`Seeding ${rides.length} rides into DynamoDB 'Rides' table...`);
  for (const r of rides) {
    await ddb.send(new PutItemCommand({
      TableName: 'Rides',
      Item: {
        ride_id: { S: r.rideId },
        ride_name: { S: r.rideName },
        land: { S: r.land },
        person_count: { N: String(r.personCount) },
        crowd_level: { S: r.crowdLevel },
        estimated_wait_minutes: { N: String(r.wait) },
        last_updated: { S: new Date().toISOString() }
      }
    }));
    console.log(`  ✓ Seeded: ${r.rideName}`);
  }
}

async function createS3Bucket() {
  const bucketName = `crowd-sense-snapshots-${Date.now()}`;
  console.log(`Creating S3 bucket: ${bucketName}...`);
  try {
    // In us-east-1, CreateBucket does not need LocationConstraint
    await s3.send(new CreateBucketCommand({
      Bucket: bucketName
    }));
    console.log(`✓ S3 Bucket '${bucketName}' created successfully.`);
    return bucketName;
  } catch (err) {
    if (err.name === 'BucketAlreadyOwnedByYou' || err.name === 'BucketAlreadyExists') {
      console.log(`ℹ Bucket '${bucketName}' already exists.`);
      return bucketName;
    }
    throw err;
  }
}

async function main() {
  try {
    await createDynamoTables();
    await seedRides();
    const bucket = await createS3Bucket();
    console.log('\n=======================================');
    console.log('🎉 ALL COST-EFFICIENT AWS RESOURCES CREATED!');
    console.log(`- DynamoDB: 'Rides' (Seeded with 8 attractions)`);
    console.log(`- DynamoDB: 'UserAlerts'`);
    console.log(`- S3 Bucket: '${bucket}'`);
    console.log('=======================================\n');
    process.stdout.write(`BUCKET_NAME=${bucket}\n`);
  } catch (e) {
    console.error('Fatal Error:', e);
    process.exit(1);
  }
}

main();
