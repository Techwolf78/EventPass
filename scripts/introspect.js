#!/usr/bin/env node
const https = require('https');
const path = require('path');
const fs = require('fs');

const SESSION = '{"id":"a234d1a2-53ae-4a88-93b4-22fa4c97d93c","version":1,"expires_at":2079907200000}';
const APP_ID = '9ae61a72-a51d-4ab6-b032-a67f1fa70e80';
const KEY_PATH = path.join(__dirname, '..', 'config', 'event-mobile-app.json');

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
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  // Introspect the GoogleServiceAccountKey types
  const schema = await graphql(`{
    a: __type(name: "GoogleServiceAccountKeyInput") { inputFields { name type { name } } }
    b: __type(name: "GoogleServiceAccountKeyMutation") { fields { name args { name type { name kind ofType { name } } } } }
    c: __type(name: "AndroidAppCredentialsMutation") { fields { name args { name type { name kind ofType { name } } } } }
  }`);

  console.log('GoogleServiceAccountKeyInput:', JSON.stringify(schema.data?.a?.inputFields, null, 2));
  console.log('\nGoogleServiceAccountKeyMutation:', JSON.stringify(schema.data?.b?.fields?.map(f=>({name:f.name, args: f.args?.map(a=>a.name)})), null, 2));
  console.log('\nAndroidAppCredentialsMutation:', JSON.stringify(schema.data?.c?.fields?.map(f=>({name:f.name, args: f.args?.map(a=>a.name)})), null, 2));
}

main().catch(console.error);
