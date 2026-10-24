require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const awsService = require('./services/awsService');
const { storeEvents, getAlerts, createAlert } = require('./services/mockStore');
const { startWhatsAppWorker } = require('./services/whatsappInboundWorker');

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

storeEvents.on('whatsapp_alert_fired', async alertData => {
  broadcastEvent('whatsapp_alert_fired', alertData);
  if (alertData.phoneNumber) {
    try {
      await awsService.sendWhatsAppAlert(alertData.phoneNumber, alertData.text);
      storeEvents.emit('whatsapp_live_message', {
        type: 'PROACTIVE_ALERT',
        sender: 'Queue Drop Alert Engine',
        recipient: alertData.phoneNumber,
        text: alertData.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } catch (e) {
      console.warn('[Alert Outbound Warning]:', e.message);
    }
  }
});

// Forward real-time WhatsApp activity to SSE
storeEvents.on('whatsapp_live_message', activity => {
  broadcastEvent('whatsapp_live_message', activity);
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

// 3. Analyze Queue Snapshot (Rekognition & S3 & WhatsApp Notification)
app.post('/api/rides/analyze-feed/:rideId', upload.single('file'), async (req, res) => {
  try {
    const { rideId } = req.params;
    const targetPhone = req.body?.targetPhone || req.query?.targetPhone || process.env.ADMIN_WHATSAPP_PHONE || '+916380505776';
    const buffer = req.file ? req.file.buffer : Buffer.from(rideId + Date.now());
    const originalName = req.file ? req.file.originalname : `${rideId}.jpg`;
    const mimeType = req.file ? req.file.mimetype : 'image/jpeg';

    // 1. Upload snapshot to S3 and generate signed access URL
    const s3Result = await awsService.uploadSnapshotToS3(buffer, originalName, mimeType);

    // 2. Analyze person count with AWS Rekognition
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

    // 3. Update DynamoDB and in-memory store
    await awsService.upsertRide(updatedRide);

    // 4. Send Real-Time WhatsApp notification with image & Rekognition findings
    const advice = updatedRide.estimatedWaitMinutes <= 20
      ? '✨ *Tip:* Great time to head over! Queue is clear.'
      : (updatedRide.estimatedWaitMinutes <= 45
        ? 'ℹ️ *Tip:* Moderate wait time. Queue is moving steadily.'
        : '⚠️ *Tip:* Peak surge detected! Consider FastPass or nearby attractions.');

    const whatsappText = `📸 *AWS Rekognition Queue Vision Update*\n\n` +
      `🏰 Attraction: *${updatedRide.rideName}*\n` +
      `📍 Land: *${updatedRide.land}*\n` +
      `👥 Headcount: *${updatedRide.personCount} guests detected*\n` +
      `⏱️ Estimated Wait: *${updatedRide.estimatedWaitMinutes} mins*\n` +
      `🚦 Crowd Level: *${updatedRide.crowdLevel}*\n\n` +
      `${advice}`;

    let whatsappSent = false;
    if (s3Result.presignedUrl) {
      whatsappSent = await awsService.sendWhatsAppImage(targetPhone, s3Result.presignedUrl, whatsappText);
    } else {
      whatsappSent = await awsService.sendWhatsAppAlert(targetPhone, whatsappText);
    }

    // Emit to real-time activity stream
    storeEvents.emit('whatsapp_live_message', {
      type: 'REKOGNITION_IMAGE',
      sender: 'Amazon Rekognition',
      recipient: targetPhone,
      rideName: updatedRide.rideName,
      personCount: updatedRide.personCount,
      waitMinutes: updatedRide.estimatedWaitMinutes,
      crowdLevel: updatedRide.crowdLevel,
      text: whatsappText,
      s3Url: s3Result.presignedUrl,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    res.json({
      ...updatedRide,
      s3Snapshot: s3Result.key,
      s3Url: s3Result.presignedUrl,
      whatsappDispatched: whatsappSent,
      targetPhone
    });
  } catch (err) {
    console.error('[Analyze Feed Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Park Operations WhatsApp Dispatch
app.post('/api/whatsapp/dispatch', async (req, res) => {
  try {
    const targetPhone = req.body?.phoneNumber || process.env.ADMIN_WHATSAPP_PHONE || '+916380505776';
    const text = req.body?.messageText || "🏰 *Disney Park Operations Advisory*\n\nReal-Time WhatsApp Guest Gateway is active.\n⏱️ Timestamp: " + new Date().toLocaleTimeString();

    await awsService.sendWhatsAppAlert(targetPhone, text);

    storeEvents.emit('whatsapp_live_message', {
      type: 'OUTBOUND_DISPATCH',
      sender: 'Park Operations Console',
      recipient: targetPhone,
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    res.json({ success: true, recipient: targetPhone, message: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/whatsapp/test-ping', (req, res) => {
  req.url = '/api/whatsapp/dispatch';
  app.handle(req, res);
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
  console.log(`🎡 Disney Park Operations & Live WhatsApp Dashboard: http://localhost:${PORT}`);
  console.log(`======================================================\n`);

  // Start continuous inbound WhatsApp receiver poller
  startWhatsAppWorker();
});
