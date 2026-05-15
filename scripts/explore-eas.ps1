# Discover the correct Android credentials fields
$sessionSecret = '{"id":"a234d1a2-53ae-4a88-93b4-22fa4c97d93c","version":1,"expires_at":2079907200000}'
$appId = "9ae61a72-a51d-4ab6-b032-a67f1fa70e80"
$apiUrl = "https://api.expo.dev/graphql"

$headers = @{
    "Content-Type" = "application/json"
    "expo-session"  = $sessionSecret
}

# Step 1: introspect AndroidAppCredentials type
$introspect = @{
    query = @"
{
  __type(name: "AndroidAppCredentials") {
    fields {
      name
      type { name kind ofType { name } }
    }
  }
}
"@
} | ConvertTo-Json

$r = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $introspect
Write-Host "=== AndroidAppCredentials fields ===" -ForegroundColor Cyan
$r.data.__type.fields | ForEach-Object { Write-Host "  $($_.name) : $($_.type.name)$($_.type.ofType.name)" }

# Step 2: introspect mutation type for FCM
$introspect2 = @{
    query = @"
{
  __type(name: "AndroidFcmKeyMutation") {
    fields {
      name
      args { name type { name kind ofType { name } } }
    }
  }
}
"@
} | ConvertTo-Json

$r2 = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $introspect2
Write-Host ""
Write-Host "=== AndroidFcmKeyMutation fields ===" -ForegroundColor Cyan
$r2.data.__type.fields | ForEach-Object { 
    Write-Host "  $($_.name)"
    $_.args | ForEach-Object { Write-Host "    arg: $($_.name) : $($_.type.name)$($_.type.ofType.name)" }
}

# Step 3: check AndroidFcmKeyInput
$introspect3 = @{
    query = @"
{
  __type(name: "AndroidFcmKeyInput") {
    inputFields {
      name
      type { name kind ofType { name } }
    }
  }
}
"@
} | ConvertTo-Json

$r3 = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $introspect3
Write-Host ""
Write-Host "=== AndroidFcmKeyInput fields ===" -ForegroundColor Cyan
$r3.data.__type.inputFields | ForEach-Object { Write-Host "  $($_.name) : $($_.type.name)$($_.type.ofType.name)" }
