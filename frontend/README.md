# AqarFlow React frontend

React.js + TypeScript + Vite + React Router, independently connected to the Express REST API.
No Next.js or paid services are required.

## Run

Use Node.js 22.12+ and npm. From this directory:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open **http://localhost:3000**. Start the backend separately; see the project-root README.
This working copy already has dependencies installed.
The development server deliberately fails if port 3000 is occupied rather than choosing an
unexpected port that would not match the backend's allowed origin.

The default API base is `http://localhost:8000/api/v1`. To override it, copy `.env.example`
to `.env.local` and set `VITE_API_URL`. Restart Vite after changing environment variables.
Frontend environment variables are public: never put database credentials or private keys in them.

## Screens

| Route | Screen |
|---|---|
| `/` | Public home and featured listings |
| `/properties` | Property search, filters and pagination |
| `/properties/:id` | Listing details, gallery and inquiry form |
| `/contact` | Contact guidance and inquiry entry point |
| `/login` | Admin/Agent sign-in |
| `/workspace` | Role-scoped dashboard |
| `/workspace/properties` | Inventory list |
| `/workspace/properties/new` | Admin property creation |
| `/workspace/properties/:id` | Admin editor/image upload; Agent read-only details |
| `/workspace/leads` | CRM lead inbox and manual lead entry |
| `/workspace/leads/:id` | Contact details, assignment, stages, notes and follow-up |
| `/workspace/visits` | Linked visit scheduling and status updates |
| `/workspace/deals` | Linked deal pipeline, offer amounts and closing notes |
| `/workspace/staff` | Admin-only agent accounts |

Unknown routes show a not-found screen. Workspace screens require a valid session.
The API enforces permissions independently of the visible controls.
Access tokens are kept in tab-scoped session storage, not persistent local storage.
Signing out calls the API to revoke the session and also clears the local token.

## Commands

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run start
```

`build` type-checks and writes the Vite bundle to `dist`. `start` previews that existing
bundle on port 3000. Use `dev` for development; run `build` before `start`.

## Browser workflow

The Playwright workflow covers public inquiries, login/logout, property editing and uploads,
CRM, follow-up, visit conflicts, reservation/deal closure, mobile layouts and Agent restrictions.
It creates its own identifiable test records and archives the test listing.
Use demonstration data, not a real agency database.

Keep the backend running. Then, from this directory:

```powershell
$demo = Get-Content ..\backend\.demo-credentials.json -Raw | ConvertFrom-Json
$env:AQARFLOW_TEST_EMAIL = $demo.admin
$env:AQARFLOW_TEST_AGENT_EMAIL = $demo.agent
$env:AQARFLOW_TEST_PASSWORD = $demo.password
npm.cmd run build
npm.cmd run test:e2e
```

On Windows the default browser is installed Microsoft Edge. To use Playwright Chromium,
first run `npx.cmd playwright install chromium` and set `$env:PLAYWRIGHT_CHANNEL = 'chromium'`.
Optional overrides are `FRONTEND_TEST_URL` and `FRONTEND_TEST_API_URL`.
Without the test account environment variables the browser workflow is explicitly skipped.
The API rate-limits login attempts, so avoid repeatedly rerunning the browser workflow within
the same five-minute window.
