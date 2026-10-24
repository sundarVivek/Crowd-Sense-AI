const EventEmitter = require('events');

class StoreEmitter extends EventEmitter {}
const storeEvents = new StoreEmitter();

const initialRides = [
  {
    rideId: 'space_mountain',
    rideName: 'Space Mountain',
    land: 'Tomorrowland',
    personCount: 52,
    crowdLevel: 'HIGH',
    estimatedWaitMinutes: 75,
    lastUpdated: new Date().toISOString()
  },
  {
    rideId: 'star_tours',
    rideName: 'Star Tours: The Adventures Continue',
    land: 'Tomorrowland',
    personCount: 14,
    crowdLevel: 'LOW',
    estimatedWaitMinutes: 15,
    lastUpdated: new Date().toISOString()
  },
  {
    rideId: 'pirates_caribbean',
    rideName: 'Pirates of the Caribbean',
    land: 'New Orleans Square',
    personCount: 24,
    crowdLevel: 'MEDIUM',
    estimatedWaitMinutes: 25,
    lastUpdated: new Date().toISOString()
  },
  {
    rideId: 'big_thunder',
    rideName: 'Big Thunder Mountain Railroad',
    land: 'Frontierland',
    personCount: 38,
    crowdLevel: 'MEDIUM',
    estimatedWaitMinutes: 40,
    lastUpdated: new Date().toISOString()
  },
  {
    rideId: 'peter_pan',
    rideName: "Peter Pan's Flight",
    land: 'Fantasyland',
    personCount: 46,
    crowdLevel: 'HIGH',
    estimatedWaitMinutes: 65,
    lastUpdated: new Date().toISOString()
  },
  {
    rideId: 'haunted_mansion',
    rideName: 'Haunted Mansion',
    land: 'New Orleans Square',
    personCount: 16,
    crowdLevel: 'LOW',
    estimatedWaitMinutes: 20,
    lastUpdated: new Date().toISOString()
  },
  {
    rideId: 'millennium_falcon',
    rideName: "Millennium Falcon: Smugglers Run",
    land: "Star Wars: Galaxy's Edge",
    personCount: 42,
    crowdLevel: 'HIGH',
    estimatedWaitMinutes: 60,
    lastUpdated: new Date().toISOString()
  },
  {
    rideId: 'indiana_jones',
    rideName: 'Indiana Jones Adventure',
    land: 'Adventureland',
    personCount: 32,
    crowdLevel: 'MEDIUM',
    estimatedWaitMinutes: 35,
    lastUpdated: new Date().toISOString()
  }
];

let rides = [...initialRides];
let alerts = [
  {
    phoneNumber: '+1234567890',
    rideId: 'space_mountain',
    targetWaitMinutes: 30,
    createdAt: new Date().toISOString()
  }
];

function getRides() {
  return rides;
}

function getRideById(rideId) {
  return rides.find(r => r.rideId.toLowerCase() === rideId.toLowerCase());
}

function updateRide(updatedRide) {
  const index = rides.findIndex(r => r.rideId.toLowerCase() === updatedRide.rideId.toLowerCase());
  updatedRide.lastUpdated = new Date().toISOString();
  if (index !== -1) {
    rides[index] = { ...rides[index], ...updatedRide };
  } else {
    rides.push(updatedRide);
  }

  // Trigger alert check
  checkAlerts(updatedRide);
  storeEvents.emit('ride_updated', updatedRide);
  return updatedRide;
}

function getAlerts() {
  return alerts;
}

function createAlert(alert) {
  alerts = alerts.filter(a => !(a.phoneNumber === alert.phoneNumber && a.rideId === alert.rideId));
  const newAlert = {
    ...alert,
    createdAt: new Date().toISOString()
  };
  alerts.push(newAlert);
  storeEvents.emit('alert_created', newAlert);
  return newAlert;
}

function checkAlerts(ride) {
  const matching = alerts.filter(
    a => a.rideId.toLowerCase() === ride.rideId.toLowerCase() && ride.estimatedWaitMinutes <= a.targetWaitMinutes
  );

  for (const match of matching) {
    const alertMessage = {
      type: 'WHATSAPP_ALERT',
      phoneNumber: match.phoneNumber,
      rideId: ride.rideId,
      rideName: ride.rideName,
      currentWait: ride.estimatedWaitMinutes,
      targetWait: match.targetWaitMinutes,
      text: `🔔 *Wait Time Alert!*\n*${ride.rideName}* wait time has just dropped to *${ride.estimatedWaitMinutes} mins* (under your target of ${match.targetWaitMinutes}m)!\n\n🚶‍♂️ Walk over now while the queue is clear!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Remove fired alert
    alerts = alerts.filter(a => !(a.phoneNumber === match.phoneNumber && a.rideId === match.rideId));
    storeEvents.emit('whatsapp_alert_fired', alertMessage);
  }
}

function calculateWaitTime(personCount) {
  if (personCount < 15) {
    return { waitMinutes: 10, crowdLevel: 'LOW' };
  } else if (personCount < 40) {
    return { waitMinutes: 25, crowdLevel: 'MEDIUM' };
  } else {
    return { waitMinutes: Math.round(personCount * 1.5), crowdLevel: 'HIGH' };
  }
}

function generateAiResponse(userMessage, phoneNumber = '+1234567890') {
  const query = userMessage.toLowerCase();

  // Alert subscription check
  if (query.includes('alert') || query.includes('notify') || query.includes('remind')) {
    let targetRideId = 'space_mountain';
    let targetMins = 30;
    if (query.includes('thunder')) targetRideId = 'big_thunder';
    if (query.includes('peter')) targetRideId = 'peter_pan';
    if (query.includes('star')) targetRideId = 'star_tours';
    if (query.includes('pirate')) targetRideId = 'pirates_caribbean';

    const matchMin = query.match(/(\d+)\s*(m|min|minute)/);
    if (matchMin) targetMins = parseInt(matchMin[1], 10);

    createAlert({
      phoneNumber,
      rideId: targetRideId,
      targetWaitMinutes: targetMins
    });

    const targetRide = getRideById(targetRideId);
    return (
      `🔔 *Alert Confirmed!* I've registered your alert for *${targetRide ? targetRide.rideName : 'Space Mountain'}*.\n\n` +
      `The moment the queue drops to *${targetMins} minutes* or less, I will instantly send you a WhatsApp message so you can walk right on!`
    );
  }

  // Ride specific checks
  if (query.includes('space mountain')) {
    const ride = getRideById('space_mountain');
    if (ride && ride.estimatedWaitMinutes > 40) {
      return (
        `🚀 *Space Mountain* currently has a *${ride.estimatedWaitMinutes}-minute wait* (${ride.crowdLevel} crowd).\n\n` +
        `💡 *Smart Recommendation*: *Star Tours* is right next door in Tomorrowland with only a *15-minute wait*!\n\n` +
        `Would you like me to set a WhatsApp alert when Space Mountain drops below 30 minutes?`
      );
    } else {
      return `🚀 *Space Mountain* is currently clear! Wait time is only *${ride ? ride.estimatedWaitMinutes : 20} minutes*. Perfect time to head over!`;
    }
  }

  if (query.includes('star tours')) {
    const ride = getRideById('star_tours');
    return `✨ *Star Tours* is at a swift *${ride.estimatedWaitMinutes}-minute wait* (${ride.crowdLevel} crowd). Virtually no wait in Tomorrowland!`;
  }

  if (query.includes('pirates')) {
    const ride = getRideById('pirates_caribbean');
    return `🏴‍☠️ *Pirates of the Caribbean* has an estimated wait time of *${ride.estimatedWaitMinutes} minutes* (${ride.crowdLevel} crowd) in New Orleans Square.`;
  }

  if (query.includes('big thunder')) {
    const ride = getRideById('big_thunder');
    return `🚂 *Big Thunder Mountain Railroad* wait time is *${ride.estimatedWaitMinutes} minutes* (${ride.crowdLevel} crowd) in Frontierland.`;
  }

  if (query.includes('peter pan')) {
    const ride = getRideById('peter_pan');
    return `🧚 *Peter Pan's Flight* is busy with a *${ride.estimatedWaitMinutes}-minute wait* (${ride.crowdLevel} crowd) in Fantasyland.`;
  }

  if (query.includes('indiana') || query.includes('jones')) {
    const ride = getRideById('indiana_jones');
    const wait = ride ? ride.estimatedWaitMinutes : 35;
    const crowd = ride ? ride.crowdLevel : 'MEDIUM';
    if (wait <= 40) {
      return `🧭 *Indiana Jones Adventure* in Adventureland currently has an estimated wait of *${wait} minutes* (${crowd} crowd).\n\n✨ Yes, you can head over now! The queue is steady and well under the peak surge.`;
    } else {
      return `🧭 *Indiana Jones Adventure* is experiencing a longer wait of *${wait} minutes* (${crowd} crowd).\n\n💡 *Smart Recommendation*: *Pirates of the Caribbean* is right nearby in New Orleans Square with a shorter line!`;
    }
  }

  if (query.includes('haunted')) {
    const ride = getRideById('haunted_mansion');
    return `👻 *Haunted Mansion* in New Orleans Square has an estimated wait of *${ride ? ride.estimatedWaitMinutes : 20} minutes* (${ride ? ride.crowdLevel : 'LOW'} crowd). Perfect time to visit!`;
  }

  if (query.includes('falcon') || query.includes('millennium') || query.includes('smuggler')) {
    const ride = getRideById('millennium_falcon');
    return `🚀 *Millennium Falcon: Smugglers Run* in Star Wars: Galaxy's Edge is at *${ride ? ride.estimatedWaitMinutes : 60} minutes* (${ride ? ride.crowdLevel : 'HIGH'} crowd).`;
  }

  if (query.includes('shortest') || query.includes('least') || query.includes('lowest') || query.includes('best ride') || query.includes('recommend')) {
    const sorted = [...rides].sort((a, b) => a.estimatedWaitMinutes - b.estimatedWaitMinutes).slice(0, 3);
    let reply = `🏰 *Current Shortest Wait Times in the Park:*\n\n`;
    sorted.forEach((r, idx) => {
      reply += `${idx + 1}. *${r.rideName}* (${r.land}): *${r.estimatedWaitMinutes} mins* [${r.crowdLevel}]\n`;
    });
    reply += `\nAsk me about any attraction or let me know if you'd like a wait time drop alert!`;
    return reply;
  }

  if (query.includes('hi') || query.includes('hello') || query.includes('hey') || query.includes('help')) {
    return (
      `👋 *Hello! Welcome to Disneyland!* I'm your AI Crowd Assistant powered by AWS Bedrock & Rekognition.\n\n` +
      `How can I help you make the most of your park day?\n` +
      `• *\"What is the wait time for Space Mountain?\"*\n` +
      `• *\"Which rides have the shortest wait right now?\"*\n` +
      `• *\"Alert me when Space Mountain drops under 30 mins\"*`
    );
  }

  return (
    `🏰 *Disney Assistant*\n\n` +
    `I can check real-time queue data from our Amazon Rekognition cameras, find the lowest wait times, or set wait-drop alerts.\n\n` +
    `Try asking: *\"Wait time for Space Mountain\"* or *\"Show shortest lines\"*.`
  );
}

module.exports = {
  storeEvents,
  getRides,
  getRideById,
  updateRide,
  getAlerts,
  createAlert,
  calculateWaitTime,
  generateAiResponse
};
