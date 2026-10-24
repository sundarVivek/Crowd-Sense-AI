const { AssociateWhatsAppBusinessAccountCommand } = require('@aws-sdk/client-socialmessaging');

const cmd = new AssociateWhatsAppBusinessAccountCommand({
  signupCallback: {
    accessToken: 'test'
  }
});
console.log('Associate command input keys:', Object.keys(cmd.input));
