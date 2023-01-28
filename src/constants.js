exports.msalConfiguration = {
  authority: 'https://login.microsoftonline.com/common',
  clientID: 'ENTER_YOUR_CLIENT_ID',
  clientSecret: 'ENTER_YOUR_SECRET',
  tenantID: 'ENTER_YOUR_TENANT_ID',
  redirectUri: 'http://localhost:3000/callback'
};

exports.subscriptionConfiguration = {
  changeType: 'Created',
  notificationUrl: 'https://NGROK_ID.ngrok.io/listen',
  resource: 'me/mailFolders(\'Inbox\')/messages',
  clientState: 'cLIENTsTATEfORvALIDATION',
  includeResourceData: false
};

exports.certificateConfiguration = {
  certificateId: 'myCertificateId',
  relativeCertPath: './certificate.pem',
  relativeKeyPath: './key.pem',
  password: 'Password123',
}; // the certificate will be generated during the first subscription creation, production solutions should rely on a certificate store
