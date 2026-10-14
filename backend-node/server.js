require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const awsService = require('./services/awsService');
const { storeEvents, getAlerts, createAlert } = require('./services/mockStore');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Configure file upload storage
const upload = multer({ storage: multer.memoryStorage() });

// Server-Sent Events (SSE) subscribers
let sseClients = [];

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

function broadcastEvent(eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(c => c.res.write(payload));
}

// Forward store events to SSE
storeEvents.on('ride_updated', ride => {
  broadcastEvent('ride_updated', ride);
});

storeEvents.on('whatsapp_alert_fired', alertData => {
  broadcastEvent('whatsapp_alert_fired', alertData);
});

// --- REST Endpoints ---

// 1. Get All Rides
app.get('/api/rides', async (req, res) => {
  try {
    const rides = await awsService.getAllRides();
    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Upsert / Override Ride Status
app.post('/api/rides', async (req, res) => {
  try {
    const ride = req.body;
    if (!ride || !ride.rideId) {
      return res.status(400).json({ error: 'rideId is required' });
    }
    const updated = await awsService.upsertRide(ride);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Analyze Queue Snapshot (Rekognition)
app.post('/api/rides/analyze-feed/:rideId', upload.single('file'), async (req, res) => {
  try {
    const { rideId } = req.params;
    const buffer = req.file ? req.file.buffer : Buffer.from(rideId + Date.now());
    const analysis = await awsService.analyzeQueueImage(buffer);

    const existingRides = await awsService.getAllRides();
    const existing = existingRides.find(r => r.rideId.toLowerCase() === rideId.toLowerCase());

    const updatedRide = {
      rideId,
      rideName: existing ? existing.rideName : rideId.replace(/_/g, ' ').toUpperCase(),
      land: existing ? existing.land : 'Adventureland',
      personCount: analysis.count,
      crowdLevel: analysis.crowdLevel,
      estimatedWaitMinutes: analysis.waitMinutes,
      lastUpdated: new Date().toISOString()
    };

    await awsService.upsertRide(updatedRide);
    res.json(updatedRide);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Chat with Bedrock Agent
app.post('/api/chat', async (req, res) => {
  try {
    const { sessionId = 'session-' + Date.now(), userMessage, phoneNumber = '+1234567890' } = req.body;
    if (!userMessage) {
      return res.status(400).json({ error: 'userMessage is required' });
    }

    const reply = await awsService.invokeBedrockAgent(sessionId, userMessage, phoneNumber);
    res.json({
      assistantReply: reply,
      sessionId,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Alert Subscriptions
app.get('/api/alerts', (req, res) => {
  res.json(getAlerts());
});

app.post('/api/alerts', (req, res) => {
  const { phoneNumber, rideId, targetWaitMinutes } = req.body;
  if (!phoneNumber || !rideId) {
    return res.status(400).json({ error: 'phoneNumber and rideId are required' });
  }

  const alert = createAlert({
    phoneNumber,
    rideId,
    targetWaitMinutes: parseInt(targetWaitMinutes, 10) || 30
  });

  res.json({ status: 'success', alert });
});

// 6. Health & Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    awsConfigured: awsService.isAwsConfigured,
    region: process.env.AWS_REGION || 'local-simulated',
    services: {
      dynamoDb: 'Rides & UserAlerts',
      rekognition: 'Queue Person Detection',
      bedrockAgent: 'Disney Assistant AgentCore',
      socialMessaging: 'AWS End User Messaging (WhatsApp)'
    }
  });
});

// Serve frontend static files
const frontendPublic = path.join(__dirname, '../frontend/public');
app.use(express.static(frontendPublic));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendPublic, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🏰 Disney Crowd Assistant API running on http://localhost:${PORT}`);
  console.log(`📡 Status Endpoint: http://localhost:${PORT}/api/status`);
  console.log(`🎡 Admin + WhatsApp Simulator UI: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
