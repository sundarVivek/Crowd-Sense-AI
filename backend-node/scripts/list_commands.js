const social = require('@aws-sdk/client-socialmessaging');
console.log('Available Commands:');
Object.keys(social).filter(k => k.endsWith('Command')).forEach(k => console.log(' - ' + k));
