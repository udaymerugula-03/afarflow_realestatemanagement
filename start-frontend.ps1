$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot 'frontend')
try {
    if (-not (Test-Path 'node_modules')) { throw 'Run setup.ps1 first to install frontend dependencies.' }
    npm.cmd run dev
    if ($LASTEXITCODE -ne 0) { throw 'Frontend stopped with an error.' }
} finally { Pop-Location }
