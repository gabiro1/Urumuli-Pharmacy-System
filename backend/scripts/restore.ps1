# Urumuli Pharmacy System - Database restore
# Usage: npm run restore -- [backupfile]   (or: powershell -File scripts/restore.ps1 [backupfile])
# Restores a pg_dump produced by backup.ps1 (plain SQL, with --clean).
$ErrorActionPreference = 'Stop'

$prev = Get-Location
try {
  Set-Location (Join-Path $PSScriptRoot '..')

  $backupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { 'backups' }
  $psql      = if ($env:PSQL)       { $env:PSQL }       else { 'psql' }
  $dataUrl   = $env:DATABASE_URL

  $backupFile = $args[0]
  if (-not $backupFile) {
    $backupFile = Get-ChildItem -Path $backupDir -Filter 'pharmacy_*.sql' -ErrorAction SilentlyContinue |
                  Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
    if (-not $backupFile) {
      throw "No backup file given and none found in $backupDir"
    }
  }

  if (-not (Test-Path -LiteralPath $backupFile)) { throw "Backup file not found: $backupFile" }

  Write-Host "Restoring from $backupFile"

  if ($env:SKIP_SAFE_BACKUP -ne '1') {
    $safe = Join-Path (Split-Path $backupFile) ("pre_restore_{0}.sql" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))
    Write-Host "Safety backup of current DB -> $safe"
    $common = @('--no-owner', '--no-privileges')
    if ($dataUrl) {
      & 'pg_dump' @common $dataUrl > $safe
    } else {
      $pgHost = if ($env:PGHOST) { $env:PGHOST } else { 'localhost' }
      $pgPort = if ($env:PGPORT) { $env:PGPORT } else { '5432' }
      $pgUser = if ($env:PGUSER) { $env:PGUSER } else { 'postgres' }
      $pgDb   = if ($env:PGDATABASE) { $env:PGDATABASE } else { 'pharmacy' }
      & 'pg_dump' @common -h $pgHost -p $pgPort -U $pgUser -d $pgDb > $safe
    }
    if ($LASTEXITCODE -ne 0) { throw 'pg_dump safety backup failed' }
  }

  if ($dataUrl) {
    Get-Content -LiteralPath $backupFile -Raw | & $psql $dataUrl
  } else {
    $pgHost = if ($env:PGHOST) { $env:PGHOST } else { 'localhost' }
    $pgPort = if ($env:PGPORT) { $env:PGPORT } else { '5432' }
    $pgUser = if ($env:PGUSER) { $env:PGUSER } else { 'postgres' }
    $pgDb   = if ($env:PGDATABASE) { $env:PGDATABASE } else { 'pharmacy' }
    Get-Content -LiteralPath $backupFile -Raw | & $psql -h $pgHost -p $pgPort -U $pgUser -d $pgDb
  }

  if ($LASTEXITCODE -ne 0) { throw "psql restore failed with exit code $LASTEXITCODE" }

  Write-Host 'Restore complete.'
}
finally {
  Set-Location $prev
}
