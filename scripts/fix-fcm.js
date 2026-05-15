const https = require('https');
const path = require('path');
const fs = require('fs');

const SESSION = '{"id":"a234d1a2-53ae-4a88-93b4-22fa4c97d93c","version":1,"expires_at":2079907200000}';
const APP_ID = '9ae61a72-a51d-4ab6-b032-a67f1fa70e80';
const ACCOUNT_ID = '559890b2-7161-4ee1-b69d-d68965df81ad';
const KEY_PATH = path.join(__dirname, '..', 'config', 'event-mobile-app.json');

// Correct credential set for package "Event.Pass"
const CORRECT_CRED_ID = '0ce3b212-c192-4ed5-850d-b9f9eabbfc8a';

function graphql(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
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
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.errors) reject(new Error(JSON.stringify(parsed.errors, null, 2)));
        else resolve(parsed.data);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('Fixing FCM v1 key assignment to correct credential set (Event.Pass)...\n');

  const keyJson = fs.readFileSync(KEY_PATH, 'utf8');
  const keyObj = JSON.parse(keyJson);

  // Upload a fresh GSA key
  console.log('Uploading Service Account Key...');
  const createResult = await graphql(`
    mutation CreateGSAKey($input: GoogleServiceAccountKeyInput!, $accountId: ID!) {
      googleServiceAccountKey {
        createGoogleServiceAccountKey(
          googleServiceAccountKeyInput: $input
          accountId: $accountId
        ) { id clientEmail projectIdentifier }
      }
    }
  `, { input: { jsonKey: keyObj }, accountId: ACCOUNT_ID });

  const gsaKeyId = createResult.googleServiceAccountKey.createGoogleServiceAccountKey.id;
  console.log('✅ Key uploaded, ID:', gsaKeyId);

  // Link to the CORRECT credential set (Event.Pass)
  console.log('\nLinking to credential set for Event.Pass...');
  await graphql(`
    mutation SetFcmV1($credId: ID!, $gsaKeyId: ID!) {
      androidAppCredentials {
        setGoogleServiceAccountKeyForFcmV1(
          id: $credId
          googleServiceAccountKeyId: $gsaKeyId
        ) {
          id
          googleServiceAccountKeyForFcmV1 { id clientEmail }
        }
      }
    }
  `, { credId: CORRECT_CRED_ID, gsaKeyId });

  console.log('✅ FCM v1 key linked to Event.Pass credential set!');
  console.log('\nVerifying...');

  const verify = await graphql(`{
    app { byId(appId: "${APP_ID}") {
      androidAppCredentials {
        id applicationIdentifier
        googleServiceAccountKeyForFcmV1 { id clientEmail }
      }
    }}
  }`);

  verify.app.byId.androidAppCredentials.forEach((c) => {
    const status = c.googleServiceAccountKeyForFcmV1 ? '✅' : '❌';
    console.log(`${status} ${c.applicationIdentifier} → ${c.googleServiceAccountKeyForFcmV1?.clientEmail || 'NOT SET'}`);
  });

  console.log('\n=== DONE — rebuild your APK now! ===');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
