# AqarFlow React frontend

React.js, TypeScript, Vite and React Router, deployed with the Express REST API at:
https://aqarflow-real-estate.vercel.app

The application is cloud-only. The API defaults to same-origin `/api/v1`; there is no
localhost API fallback or local launch command. Frontend environment variables are public:
never put database credentials, storage tokens or private signing keys in them.
Build/deployment instructions are in the root README.

## Screens

| Route | Screen |
|---|---|
| `/` | Home and featured listings |
| `/properties` | Property search, filters and pagination |
| `/properties/:id` | Details, gallery and public inquiry |
| `/contact` | Contact guidance and inquiry entry point |
| `/login` | Admin/Agent login |
| `/workspace` | Role-scoped dashboard |
| `/workspace/properties` | Inventory list |
| `/workspace/properties/new` | Admin property creation |
| `/workspace/properties/:id` | Admin editor/upload; Agent read-only details |
| `/workspace/leads` | CRM inbox and manual lead entry |
| `/workspace/leads/:id` | Contact, assignment, stages, notes and follow-up |
| `/workspace/visits` | Linked scheduling and status updates |
| `/workspace/deals` | Linked pipeline, offers and closure |
| `/workspace/staff` | Admin-only Agent account creation |

Unknown routes show a not-found screen. Workspace screens require a valid session.
The backend independently enforces permissions. Access tokens use tab-scoped session
storage, not persistent local storage. Sign-out revokes the server session and clears
the browser's token.

## Source commands

From this directory, using Node.js 24:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run build
```

`build` type-checks and writes `dist`. The root cloud build also copies bundled stock
photos to the deployment CDN.

## Cloud browser workflow

Playwright covers public photos/inquiries, login/logout, inventory and real Blob uploads,
CRM, scheduling conflicts, booking/closure, mobile layouts and Agent restrictions.
It creates identifiable test records and archives its test listing. Use only the approved
cloud demonstration agency, not a real customer database.

Load the private credentials into environment variables without printing their contents:

```powershell
$accounts = Get-Content ..\backend\.demo-credentials.cloud.json -Raw | ConvertFrom-Json
$env:FRONTEND_TEST_URL = 'https://aqarflow-real-estate.vercel.app'
$env:FRONTEND_TEST_API_URL = "$env:FRONTEND_TEST_URL/api/v1"
$env:AQARFLOW_TEST_EMAIL = $accounts.admin
$env:AQARFLOW_TEST_PASSWORD = $accounts.admin_password
$env:AQARFLOW_TEST_AGENT_EMAIL = $accounts.agent
$env:AQARFLOW_TEST_AGENT_PASSWORD = $accounts.agent_password
npm.cmd run test:e2e
```

No local server is started. Without Admin account variables the authenticated workflow
is explicitly skipped; set all four account variables to cover both roles.
Windows uses installed Microsoft Edge by default. `PLAYWRIGHT_CHANNEL` can override it.
Login is rate-limited; avoid repeated browser runs within the same five-minute window.
