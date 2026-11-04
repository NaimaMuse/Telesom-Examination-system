# Enables transactions on the existing local MongoDB installation. Run as Administrator.
$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this script in an Administrator PowerShell terminal to configure and restart the MongoDB service.'
}
$configPath = 'C:\Program Files\MongoDB\Server\8.3\bin\mongod.cfg'
$config = Get-Content -LiteralPath $configPath -Raw
if ($config -match '(?m)^replication:') { throw 'Replication is already configured. Inspect the existing configuration before changing it.' }
if ($config -notmatch '(?m)^#replication:') { throw 'Expected MongoDB configuration marker was not found. No changes made.' }
$service = Get-Service -Name MongoDB
$backupPath = $configPath + '.evaluation-' + (Get-Date -Format 'yyyyMMddHHmmss') + '.bak'
Copy-Item -LiteralPath $configPath -Destination $backupPath
Write-Output "MongoDB configuration backup: $backupPath"
$updated = $config.Replace('#replication:', "replication:`r`n  replSetName: rs0")
try {
    Set-Content -LiteralPath $configPath -Value $updated -Encoding utf8
    Restart-Service -Name MongoDB
} catch {
    Copy-Item -LiteralPath $backupPath -Destination $configPath -Force
    Start-Service -Name MongoDB -ErrorAction SilentlyContinue
    throw
}
& node (Join-Path $PSScriptRoot 'initLocalReplica.js')
if ($LASTEXITCODE -ne 0) { throw 'Replica-set initialization failed. Inspect the service logs and the saved configuration backup.' }
