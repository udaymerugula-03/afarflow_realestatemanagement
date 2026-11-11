$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot 'backend')
try {
    if (-not (Test-Path 'node_modules')) { throw 'Run setup.ps1 first to install backend dependencies.' }
    npm.cmd run dev
    if ($LASTEXITCODE -ne 0) { throw 'Backend stopped with an error.' }
} finally { Pop-Location }
