const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');

const region = process.env.AWS_REGION || 'us-east-1';
const client = new DynamoDBClient({ region });
const tableName = process.env.DYNAMODB_RIDES_TABLE || 'Rides';

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

async function seed() {
  console.log(`Seeding ${rides.length} rides into DynamoDB table '${tableName}' in ${region}...`);
  for (const r of rides) {
    try {
      await client.send(new PutItemCommand({
        TableName: tableName,
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
      console.log(`✓ Seeded ${r.rideName}`);
    } catch (err) {
      console.error(`✗ Failed to seed ${r.rideName}:`, err.message);
    }
  }
  console.log('Seeding complete.');
}

seed();
