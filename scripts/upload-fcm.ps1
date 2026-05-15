# Upload FCM v1 Service Account Key to EAS via GraphQL API
# This replaces the interactive `eas credentials` command

$sessionSecret = '{"id":"a234d1a2-53ae-4a88-93b4-22fa4c97d93c","version":1,"expires_at":2079907200000}'
$appId = "9ae61a72-a51d-4ab6-b032-a67f1fa70e80"
$keyFilePath = Join-Path $PSScriptRoot "..\config\event-mobile-app.json"

# Read the service account JSON key
$keyContent = Get-Content $keyFilePath -Raw
$keyObject = $keyContent | ConvertFrom-Json

Write-Host "=== FCM v1 Key Upload ===" -ForegroundColor Cyan
Write-Host "App ID: $appId"
Write-Host "Client Email: $($keyObject.client_email)"
Write-Host "Project ID: $($keyObject.project_id)"
Write-Host ""

# EAS GraphQL API endpoint
$apiUrl = "https://api.expo.dev/graphql"

$headers = @{
    "Content-Type"    = "application/json"
    "expo-session"    = $sessionSecret
}

# Step 1: Get the Android app credentials for this app
Write-Host "Step 1: Fetching Android app credentials..." -ForegroundColor Yellow

$getCredentialsQuery = @{
    query = @"
query GetAndroidAppCredentials(`$appId: String!) {
  app {
    byId(appId: `$appId) {
      id
      androidAppCredentials(filterAab: false) {
        id
        androidFcmKey {
          id
          version
          snippet {
            ...on AndroidFcmKeyV2Snippet {
              serviceAccountEmail
            }
          }
        }
      }
    }
  }
}
"@
    variables = @{ appId = $appId }
} | ConvertTo-Json -Depth 10

try {
    $credResponse = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $getCredentialsQuery
    Write-Host "App credentials fetched." -ForegroundColor Green
    
    $androidCreds = $credResponse.data.app.byId.androidAppCredentials
    Write-Host "Found $($androidCreds.Count) Android credential set(s)."
    
    $androidCredId = if ($androidCreds.Count -gt 0) { $androidCreds[0].id } else { $null }
    Write-Host "Android Credential ID: $androidCredId"
} catch {
    Write-Host "Error fetching credentials: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Create the FCM v1 key
Write-Host ""
Write-Host "Step 2: Uploading FCM v1 Service Account Key..." -ForegroundColor Yellow

# Escape the key content for JSON
$keyJson = $keyContent | ConvertFrom-Json | ConvertTo-Json -Compress -Depth 10

$createFcmMutation = @{
    query = @"
mutation CreateAndroidFcmKey(`$appId: String!, `$value: AndroidFcmKeyInput!) {
  androidFcmKey {
    createAndroidFcmKey(appId: `$appId, value: `$value) {
      id
      version
      snippet {
        ...on AndroidFcmKeyV2Snippet {
          serviceAccountEmail
        }
      }
    }
  }
}
"@
    variables = @{
        appId = $appId
        value = @{
            fcmV2ServiceAccountKeyJsonString = $keyJson
            version = "V2"
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $fcmResponse = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $createFcmMutation
    
    if ($fcmResponse.errors) {
        Write-Host "GraphQL Errors:" -ForegroundColor Red
        $fcmResponse.errors | ForEach-Object { Write-Host "  - $($_.message)" -ForegroundColor Red }
        exit 1
    }
    
    $fcmKey = $fcmResponse.data.androidFcmKey.createAndroidFcmKey
    Write-Host "FCM v1 Key uploaded successfully!" -ForegroundColor Green
    Write-Host "  Key ID: $($fcmKey.id)"
    Write-Host "  Service Account: $($fcmKey.snippet.serviceAccountEmail)"
} catch {
    Write-Host "Error uploading FCM key: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Step 3: Link the FCM key to Android app credentials
if ($androidCredId) {
    Write-Host ""
    Write-Host "Step 3: Linking FCM key to Android credentials..." -ForegroundColor Yellow
    
    $fcmKeyId = $fcmKey.id
    
    $setFcmMutation = @{
        query = @"
mutation SetFcmKey(`$androidAppCredentialsId: ID!, `$androidFcmKeyId: ID!) {
  androidAppCredentials {
    setFcmKey(androidAppCredentialsId: `$androidAppCredentialsId, androidFcmKeyId: `$androidFcmKeyId) {
      id
      androidFcmKey {
        id
      }
    }
  }
}
"@
        variables = @{
            androidAppCredentialsId = $androidCredId
            androidFcmKeyId = $fcmKeyId
        }
    } | ConvertTo-Json -Depth 10
    
    try {
        $linkResponse = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $setFcmMutation
        
        if ($linkResponse.errors) {
            Write-Host "Link errors:" -ForegroundColor Red
            $linkResponse.errors | ForEach-Object { Write-Host "  - $($_.message)" -ForegroundColor Red }
        } else {
            Write-Host "FCM key linked to Android credentials!" -ForegroundColor Green
        }
    } catch {
        Write-Host "Error linking FCM key: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Cyan
Write-Host "FCM v1 credentials are now configured in EAS." -ForegroundColor Green
Write-Host "Now rebuild your APK: eas build --platform android --profile preview" -ForegroundColor Yellow
