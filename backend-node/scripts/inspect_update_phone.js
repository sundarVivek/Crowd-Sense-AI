const { UpdateLinkedWhatsAppBusinessAccountPhoneNumberCommand } = require('@aws-sdk/client-socialmessaging');

const cmd = new UpdateLinkedWhatsAppBusinessAccountPhoneNumberCommand({
  id: 'phone-number-id-e14db65d3dcb4be681bfb4bfa638baf0'
});
console.log('Update phone command input keys:', Object.keys(cmd.input));
