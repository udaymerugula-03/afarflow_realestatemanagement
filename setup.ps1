$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        throw 'Install Node.js 22 LTS or newer before running setup.'
    }
    node -e "const [major,minor]=process.versions.node.split('.').map(Number); process.exit(major>22 || (major===22 && minor>=12) ? 0 : 1)"
    if ($LASTEXITCODE -ne 0) { throw 'AqarFlow requires Node.js 22.12 or newer.' }
    Push-Location backend
    try {
        if (Test-Path 'package-lock.json') { npm.cmd ci } else { npm.cmd install }
        if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed.' }
        npm.cmd run migrate
        if ($LASTEXITCODE -ne 0) { throw 'Database migration failed.' }
    } finally { Pop-Location }
    Push-Location frontend
    try {
        if (Test-Path 'package-lock.json') { npm.cmd ci } else { npm.cmd install }
        if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
    } finally { Pop-Location }
    Write-Host 'Setup complete. For first-time demo data run: cd backend; npm.cmd run seed'
    Write-Host 'Generated demo logins are stored locally in backend\.demo-credentials.json, ignored by Git.'
    Write-Host 'Then start the API and frontend in two terminals using start-backend.ps1 and start-frontend.ps1.'
} finally { Pop-Location }
