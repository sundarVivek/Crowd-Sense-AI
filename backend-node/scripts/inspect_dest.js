const { SocialMessagingClient, PutWhatsAppBusinessAccountEventDestinationsCommand } = require('@aws-sdk/client-socialmessaging');

// Let's see the command prototype or schema
const cmd = new PutWhatsAppBusinessAccountEventDestinationsCommand({
  id: 'waba-3bcb1c396ec446dc8944a2639a397264',
  eventDestinations: []
});
console.log('Command initialized successfully:', Object.keys(cmd.input));
