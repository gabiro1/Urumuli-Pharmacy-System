# Urumuli Pharmacy System - Database backup
# Usage: npm run backup  (or: powershell -File scripts/backup.ps1)
# Dumps the Postgres database (schema + data) via pg_dump.

$ErrorActionPreference = 'Stop'

$prev = Get-Location
try {
  Set-Location (Join-Path $PSScriptRoot '..')

  $backupDir  = if ($env:BACKUP_DIR)  { $env:BACKUP_DIR }  else { 'backups' }
  $pgDump     = if ($env:PGDUMP)      { $env:PGDUMP }      else { 'pg_dump' }
  $dataUrl    = $env:DATABASE_URL

  New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

  $stamp    = Get-Date -Format 'yyyyMMdd_HHmmss'
  $outFile  = Join-Path $backupDir "pharmacy_$stamp.sql"

  Write-Host "Creating backup -> $outFile"

  $common = @('--no-owner', '--no-privileges', '--clean', '--if-exists')

  if ($dataUrl) {
    & $pgDump @common $dataUrl > $outFile
  } else {
    $pgHost  = if ($env:PGHOST)  { $env:PGHOST }  else { 'localhost' }
    $pgPort  = if ($env:PGPORT)  { $env:PGPORT }  else { '5432' }
    $pgUser  = if ($env:PGUSER)  { $env:PGUSER }  else { 'postgres' }
    $pgDb    = if ($env:PGDATABASE) { $env:PGDATABASE } else { 'pharmacy' }
    & $pgDump @common -h $pgHost -p $pgPort -U $pgUser -d $pgDb > $outFile
  }

  if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }

  $size = (Get-Item $outFile).Length / 1kb
  Write-Host "Backup complete: $outFile ($([math]::Round($size,1)) KB)"
}
finally {
  Set-Location $prev
}
