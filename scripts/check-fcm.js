const https = require('https');
const SESSION = '{"id":"a234d1a2-53ae-4a88-93b4-22fa4c97d93c","version":1,"expires_at":2079907200000}';
const APP_ID = '9ae61a72-a51d-4ab6-b032-a67f1fa70e80';

const query = `{
  app {
    byId(appId: "${APP_ID}") {
      androidAppCredentials {
        id
        applicationIdentifier
        googleServiceAccountKeyForFcmV1 {
          id
          clientEmail
          projectIdentifier
        }
      }
    }
  }
}`;

const body = JSON.stringify({ query });
const req = https.request({
  hostname: 'api.expo.dev',
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'expo-session': SESSION,
  },
}, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const r = JSON.parse(d);
    const creds = r.data.app.byId.androidAppCredentials;
    console.log(`Found ${creds.length} Android credential set(s):\n`);
    creds.forEach((c, i) => {
      console.log(`--- Credential Set #${i + 1} ---`);
      console.log(`ID               : ${c.id}`);
      console.log(`App Identifier   : ${c.applicationIdentifier}`);
      if (c.googleServiceAccountKeyForFcmV1) {
        console.log(`FCM v1 Status    : ✅ CONFIGURED`);
        console.log(`Key ID           : ${c.googleServiceAccountKeyForFcmV1.id}`);
        console.log(`Service Account  : ${c.googleServiceAccountKeyForFcmV1.clientEmail}`);
        console.log(`Firebase Project : ${c.googleServiceAccountKeyForFcmV1.projectIdentifier}`);
      } else {
        console.log(`FCM v1 Status    : ❌ NOT SET`);
      }
      console.log('');
    });
  });
});
req.on('error', console.error);
req.write(body);
req.end();
