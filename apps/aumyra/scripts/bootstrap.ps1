# AUMYRA Windows PowerShell first-run installer. Run from apps/aumyra.
# Never commit this generated wrangler.toml: it is patched locally only.
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
function Check-Step([string]$step) {
  if ($LASTEXITCODE -ne 0) { throw "$step failed (exit $LASTEXITCODE)." }
}
function D1-List {
  $raw = (& npx.cmd --no-install wrangler d1 list --json | Out-String)
  Check-Step "Cloudflare D1 list"
  $first = $raw.IndexOf("[")
  $last = $raw.LastIndexOf("]")
  if ($first -lt 0 -or $last -lt $first) { throw "Cannot parse D1 JSON. No changes made to databases." }
  return ,@(($raw.Substring($first, $last - $first + 1) | ConvertFrom-Json))
}
function Put-Secret([string]$name, [string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { throw "Empty secret: $name" }
  $value | & npx.cmd --no-install wrangler secret put $name
  Check-Step "Setting $name"
}
function Secure-Read([string]$message) {
  $secure = Read-Host $message -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    $secure.Dispose()
  }
}
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
  throw "Node.js LTS is required. Install from https://nodejs.org/en/download/ then reopen PowerShell."
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw "npm is missing. Repair Node.js installation." }
if (-not (Test-Path "./wrangler.toml") -or -not (Test-Path "./scripts/setup-webhook.mjs")) {
  throw "Run this file from the apps/aumyra directory of PR #20."
}
Write-Host "AUMYRA setup - Cloudflare Worker, dedicated D1, Telegram webhook" -ForegroundColor Cyan
Write-Host "Existing ROAMDOTS, Ocean Cafe, and OMLAYER resources are never selected by this installer."
& npm.cmd install --no-audit --no-fund
Check-Step "npm install"
& npm.cmd test
Check-Step "Aumyra behavior tests"
Write-Host "Cloudflare authentication (browser may open)..."
& npx.cmd --no-install wrangler whoami
if ($LASTEXITCODE -ne 0) {
  & npx.cmd --no-install wrangler login
  Check-Step "Cloudflare login"
  & npx.cmd --no-install wrangler whoami
  Check-Step "Cloudflare identity"
}
$accountOkay = Read-Host "Is this YOUR correct Cloudflare account? Type YES"
if ($accountOkay -cne "YES") { throw "Stopped before any cloud changes." }
$token = $null
$hookSecret = $null
try {
  $token = Secure-Read "Paste EXISTING @AumyraBot token from @BotFather (hidden)"
  if ($token -notmatch '^[0-9]+:[A-Za-z0-9_-]+$') { throw "Invalid BotFather token format." }
  try {
    $who = Invoke-RestMethod -Method Post -Uri ("https://api.telegram.org/bot{0}/getMe" -f $token) -ContentType "application/json" -Body "{}" -TimeoutSec 20
  } catch { throw "Telegram getMe rejected token or connection failed; no database/Worker changed." }
  if (-not $who.ok -or [string]$who.result.username -ine "AumyraBot") {
    throw "Token is NOT for @AumyraBot. Stopped before deployment."
  }
  $owner = Read-Host "YOUR numeric Telegram user ID (find via @userinfobot)"
  if ($owner -notmatch '^[1-9][0-9]{3,19}$') { throw "Owner ID must be a numeric Telegram user ID." }
  $databases = @(D1-List)
  $matches = @($databases | Where-Object { $_.name -eq "aumyra" })
  if ($matches.Count -gt 1) { throw "Ambiguous duplicate Aumyra D1 names. Resolve manually." }
  if ($matches.Count -eq 0) {
    Write-Host "No Aumyra D1 exists. Creating dedicated aumyra database..."
    & npx.cmd --no-install wrangler d1 create aumyra
    Check-Step "Create dedicated Aumyra D1"
    $databases = @(D1-List)
    $matches = @($databases | Where-Object { $_.name -eq "aumyra" })
    if ($matches.Count -ne 1) { throw "Created D1 was not discoverable; no migration attempted." }
  } else {
    Write-Host "Reusing existing Aumyra D1. Forward migrations never delete user entries."
    $agree = Read-Host "Continue against this existing Aumyra database? Type YES"
    if ($agree -cne "YES") { throw "Stopped; no database changes." }
  }
  $db = $matches[0]
  $dbId = if ($db.uuid) { [string]$db.uuid } else { [string]$db.id }
  if ($dbId -notmatch '^[0-9a-fA-F-]{36}$') { throw "Invalid D1 database ID." }
  $cfgPath = Join-Path (Get-Location) "wrangler.toml"
  $config = [IO.File]::ReadAllText($cfgPath)
  if (-not $config.Contains('REPLACE_WITH_AUMYRA_D1_ID')) { throw "Local Wrangler placeholder missing; stop before mutation." }
  $config = $config.Replace('REPLACE_WITH_AUMYRA_D1_ID', $dbId)
  $chooseAi = Read-Host "Enable optional Cloudflare Workers AI? It may incur charges. Type YES, or Enter to skip"
  if ($chooseAi -ceq "YES") { $config += [Environment]::NewLine + '[ai]' + [Environment]::NewLine + 'binding = "AI"' + [Environment]::NewLine }
  [IO.File]::WriteAllText($cfgPath, $config, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "Applying only Aumyra migrations; Wrangler creates a pre-migration D1 backup..."
  & npx.cmd --no-install wrangler d1 migrations list aumyra --remote
  Check-Step "D1 migration list"
  & npx.cmd --no-install wrangler d1 migrations apply aumyra --remote
  Check-Step "D1 migration apply"
  $deployResult = (& npx.cmd --no-install wrangler deploy | Out-String)
  Check-Step "Dedicated Aumyra Worker deployment"
  Write-Host $deployResult
  $workerMatch = [regex]::Match($deployResult, 'https://[a-zA-Z0-9.-]+\.workers\.dev')
  $workerUrl = if ($workerMatch.Success) { $workerMatch.Value.TrimEnd("/") } else { (Read-Host "Copy the actual HTTPS Worker URL above (no /health or /telegram/webhook)").TrimEnd("/") }
  if ($workerUrl -notmatch '^https://[a-zA-Z0-9.-]+\.workers\.dev$') { throw "Unverified Worker URL. No Telegram webhook change." }
  $hookSecret = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
  Put-Secret "TELEGRAM_BOT_TOKEN" $token
  Put-Secret "TELEGRAM_WEBHOOK_SECRET" $hookSecret
  Put-Secret "TELEGRAM_OWNER_ID" $owner
  $ready = $false
  for ($attempt = 1; $attempt -le 5; $attempt++) {
    try {
      $health = Invoke-RestMethod -Method Get -Uri "$workerUrl/health" -TimeoutSec 20
      if ($health.service -eq "aumyra" -and $health.ready -eq $true) { $ready = $true; break }
    } catch { Start-Sleep -Seconds 2 }
  }
  if (-not $ready) { throw "Aumyra /health not ready. Webhook NOT changed. Inspect Cloudflare Worker logs." }
  $env:TELEGRAM_BOT_TOKEN = $token
  $env:TELEGRAM_WEBHOOK_SECRET = $hookSecret
  & node.exe ./scripts/setup-webhook.mjs "$workerUrl/telegram/webhook"
  Check-Step "Telegram webhook and menu configuration"
  Write-Host ""
  Write-Host "AUMYRA core DEPLOYED: $workerUrl" -ForegroundColor Green
  Write-Host "NEXT: Open @AumyraBot in Telegram and send /start. Then test /note hello -> /notes."
  if ($chooseAi -cne "YES") { Write-Host "AI is optional and currently disabled; finance and notes should work." }
} finally {
  Remove-Item Env:TELEGRAM_BOT_TOKEN -ErrorAction SilentlyContinue
  Remove-Item Env:TELEGRAM_WEBHOOK_SECRET -ErrorAction SilentlyContinue
  $token = $null
  $hookSecret = $null
}
