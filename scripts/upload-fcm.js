#!/usr/bin/env node
/**
 * Uploads Firebase FCM v1 Service Account Key to EAS.
 * Uses the correct EAS GraphQL API schema discovered via introspection.
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

const SESSION = '{"id":"a234d1a2-53ae-4a88-93b4-22fa4c97d93c","version":1,"expires_at":2079907200000}';
const APP_ID = '9ae61a72-a51d-4ab6-b032-a67f1fa70e80';
const KEY_PATH = path.join(__dirname, '..', 'config', 'event-mobile-app.json');
const ANDROID_PACKAGE = 'Event.Pass'; // from app.json

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
        if (parsed.errors) {
          reject(new Error('GraphQL error: ' + JSON.stringify(parsed.errors, null, 2)));
        } else {
          resolve(parsed.data);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('=== EAS FCM v1 Key Upload ===\n');

  const keyJson = fs.readFileSync(KEY_PATH, 'utf8');
  const keyObj = JSON.parse(keyJson);
  console.log(`Client Email : ${keyObj.client_email}`);
  console.log(`Project ID   : ${keyObj.project_id}`);
  console.log(`App ID       : ${APP_ID}\n`);

  // Step 1: Get account ID
  console.log('Step 1: Getting account info...');
  const accountData = await graphql(`{
    app { byId(appId: "${APP_ID}") {
      id
      fullName
      ownerAccount { id name }
      androidAppCredentials {
        id
        applicationIdentifier
        googleServiceAccountKeyForFcmV1 { id }
      }
    }}
  }`);
  const appInfo = accountData.app.byId;
  const accountId = appInfo.ownerAccount.id;
  console.log(`Account: ${appInfo.ownerAccount.name} (${accountId})`);
  console.log(`App: ${appInfo.fullName}`);

  const existingCreds = appInfo.androidAppCredentials;
  console.log(`Android credentials: ${existingCreds.length} found`);
  let androidCredId = existingCreds.length > 0 ? existingCreds[0].id : null;

  if (existingCreds[0]?.googleServiceAccountKeyForFcmV1) {
    console.log('⚠️  FCM v1 key already exists — will replace it.');
  }

  // Step 2: Upload the Google Service Account Key
  console.log('\nStep 2: Uploading Service Account Key JSON...');
  const createKeyResult = await graphql(`
    mutation CreateGSAKey($input: GoogleServiceAccountKeyInput!, $accountId: ID!) {
      googleServiceAccountKey {
        createGoogleServiceAccountKey(
          googleServiceAccountKeyInput: $input
          accountId: $accountId
        ) {
          id
          projectIdentifier
          clientEmail
        }
      }
    }
  `, {
    input: { jsonKey: keyObj },   // pass parsed object — API expects JSONObject, not string
    accountId: accountId,
  });

  const gsaKeyId = createKeyResult.googleServiceAccountKey.createGoogleServiceAccountKey.id;
  const gsaEmail = createKeyResult.googleServiceAccountKey.createGoogleServiceAccountKey.clientEmail;
  console.log(`✅ Service Account Key uploaded!`);
  console.log(`   ID: ${gsaKeyId}`);
  console.log(`   Email: ${gsaEmail}`);

  // Step 3: Create Android app credentials if they don't exist
  if (!androidCredId) {
    console.log('\nStep 3: Creating Android app credentials...');
    const createCredsResult = await graphql(`
      mutation CreateAndroidCreds($appId: ID!, $appIdentifier: String!) {
        androidAppCredentials {
          createAndroidAppCredentials(
            androidAppCredentialsInput: {}
            appId: $appId
            applicationIdentifier: $appIdentifier
          ) { id }
        }
      }
    `, { appId: APP_ID, appIdentifier: ANDROID_PACKAGE });
    androidCredId = createCredsResult.androidAppCredentials.createAndroidAppCredentials.id;
    console.log(`✅ Android credentials created! ID: ${androidCredId}`);
  } else {
    console.log(`\nStep 3: Using existing Android credentials (ID: ${androidCredId})`);
  }

  // Step 4: Link the GSA key as FCM v1 credential
  console.log('\nStep 4: Setting FCM v1 key on Android credentials...');
  await graphql(`
    mutation SetFcmV1Key($credId: ID!, $gsaKeyId: ID!) {
      androidAppCredentials {
        setGoogleServiceAccountKeyForFcmV1(
          id: $credId
          googleServiceAccountKeyId: $gsaKeyId
        ) {
          id
          googleServiceAccountKeyForFcmV1 {
            id
            clientEmail
          }
        }
      }
    }
  `, { credId: androidCredId, gsaKeyId: gsaKeyId });

  console.log('✅ FCM v1 key linked to Android credentials!\n');
  console.log('=== SUCCESS ===');
  console.log('Android push notifications will now work in background/killed state.');
  console.log('');
  console.log('Next: rebuild your APK with the new credentials:');
  console.log('  eas build --platform android --profile preview');
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
