# AqarFlow

Real estate management **internship MVP**, following sections 14-16 of `Project_01 (web).docx`.
Frontend and backend are separate applications, using the requested stack:

| Component | Technology |
|---|---|
| Frontend | React.js + TypeScript |
| Backend | Node.js + Express.js |
| Database | PostgreSQL |
| API | REST, JSON, `/api/v1` |
| Editor | Visual Studio Code |
| Version control | Git and GitHub |

No Python, FastAPI or SQLite is required. Local development uses no paid services.
Vercel deployment support is supplied; a public demo requires the hosted-service setup below.
The supplied daily status report describes SERVORA, a different project; it is not treated as
AqarFlow requirements or evidence of completed AqarFlow work.
The existing Java address-maintenance repository remains separate and unchanged.

## Prerequisites

- Node.js **22.12+** (Node.js 24 LTS recommended), including npm.
- VS Code and Git.
- Internet for the initial open-source package installation.
- Two terminals to run the frontend and backend.
- A separate PostgreSQL server is optional for local development: the default uses **PGlite**,
  actual PostgreSQL compiled to WebAssembly, with persistent files in `backend\.data`.
  This is not SQLite or an in-memory mock. A conventional PostgreSQL server is supported using
  the same SQL schema and API by configuring `DATABASE_URL`.

## Run locally

Open `C:\Users\venkatasaiutm\AqarFlow` in VS Code. Dependencies and demonstration data have
already been prepared in this working copy. For a fresh checkout:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
cd backend
npm.cmd run seed
cd ..
```

`seed` creates three fictional public listings, an assigned customer inquiry and Admin/Agent
accounts. It generates a password and saves the local logins to
**`backend\.demo-credentials.json`**, which is ignored by Git.
Seeding does not overwrite existing accounts. If already seeded, use the existing credentials file.
Use these credentials only for this local internship demonstration.

Start the backend in terminal one:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-backend.ps1
```

Start the frontend in terminal two:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-frontend.ps1
```

Open **http://localhost:3000**.
Interactive REST API documentation: **http://localhost:8000/docs**.
OpenAPI schema: **http://localhost:8000/openapi.json**.
Health: **http://localhost:8000/health**.

Alternatively, run `npm.cmd run dev` from each application's directory.
Use `npm.cmd` rather than `npm` when PowerShell blocks `npm.ps1`.
VS Code's **Terminal > Run Task** also includes frontend, backend and API-test tasks.

## Project structure

```text
AqarFlow
  frontend                 React application, pages, components and API client
  backend
    src                    Express routes, auth, schemas, SQL adapter and demo seed
    migrations             Versioned PostgreSQL schema
    tests                  REST workflow and authorization tests
    .env.example           Optional backend configuration
  .vscode                  Suggested extensions and development tasks
  setup.ps1
  start-backend.ps1
  start-frontend.ps1
```

Browser -> React -> Express REST API -> PostgreSQL.
The browser never accesses the database directly.
Migrations run automatically before the API accepts requests.

## Documented first-week features

| Area | Behavior |
|---|---|
| Public website | Home, property search, filters, pagination, property details, contact and inquiry |
| Authentication | Admin/Agent sign-in, backend permissions, expiring sessions and revocable logout |
| Inventory | Create/edit, title/locality/reference search, unique references, sale/rent, PKR price, area units, publish/unpublish, image upload, status history and archive |
| CRM | Inquiry-to-lead flow, validated contact/inquiry editing, search, stages, agent assignment, follow-up dates and notes/activity |
| Staff | Administrator creates Agent accounts |
| Visits | Requested/confirmed property visits, property/lead/agent scheduling, overlapping appointment detection and visit outcomes |
| Deals | Qualified-lead prerequisite, linked lead/property/agent, offer amount, stages, reservations and confirmed-booking checks |
| Dashboard | Live listing, available-property, new-lead, visit and open-deal counts |
| Data handling | Agency isolation, assigned-record access, strict validation and important-change audit records |

### Business rules

Administrators manage inventory, staff and agency-wide leads. Agents can browse their agency's
inventory but can access only their own assigned leads, visits and deals. Agents cannot edit
inventory, create staff or reassign leads.

Only explicitly published, available/reserved, non-archived properties appear publicly.
Inquiries require consent and a valid public property. The server derives the agency and
default agent from that property instead of trusting a submitted agency/role.

Visits and deals must use the property linked to their lead and the agent currently assigned
to that lead. New visits/deals reject sold, rented, inactive and draft properties.
New deals additionally require a lead in Qualified, Visit Scheduled or Negotiation.
New, Contacted, Lost and Converted leads cannot start another deal. Moving an existing deal
into Booking, Documentation or Closed Won also checks the qualification prerequisite.
This is not a strict step-by-step transition graph; normal notes-only edits remain possible.
Visits can start as Requested or Confirmed; both reserve the agent's time.
Active visits cannot overlap for the same agent. PostgreSQL transactions and row locks
serialize scheduling against an agent; a conflicting request receives HTTP 409.

Booking/documentation reserves the listing. Only one confirmed booking/documentation/closed-won
deal may exist for a property; a database unique index also enforces this rule.
Leaving a reservation stage releases it. Closing won changes the property to sold/rented,
unpublishes it and converts the lead. Closed-won deals cannot be reopened in this MVP.
Properties with open deals cannot be archived.

Admin and assigned Agents can correct a lead's name, email, phone and inquiry without replacing
its ID, assignment, linked property or timeline. The server validates and normalizes contact data.
Property details include agency-scoped activity history. New inventory status, publication and
assignment changes record before/after values, including automatic booking/closure effects.
Older events remain visible where recorded, but missing historical snapshots are not fabricated.

Images must be actual JPEG/PNG/WebP files up to 5 MB and 25 megapixels, at most ten per property.
The server decodes, resizes and re-encodes them to strip embedded metadata.
These are public listing photos, not confidential legal documents.

The approved demo localization is **Pakistan / Pakistani rupees (PKR)**, matching the original
`Project_01` requirement, with `en-PK` formatting and a PKR prefix throughout listings,
filters, property editing and deal amounts. Seed listings use Lahore, Islamabad and Karachi.
Real stock photographs are supplied locally
for villas, apartments, open land and architecture backgrounds under `backend\public\demo`.
They are free to use under the [Unsplash License](https://unsplash.com/license), with source
URLs recorded in `backend\public\demo\photo-sources.json`. No paid service or runtime image
provider connection is needed. The photos are sample imagery, not photographs of the fictional
Pakistani listings and not evidence of their location. Cards label them "Sample photo".
Uploaded user photos remain supported. Migration `003` replaces the old illustration links,
removes the unrelated background illustration from property galleries, and retains uploaded photos.
The intermediate India/INR choice in historical migration `002` was withdrawn. New migration
`004` restores Pakistan/PKR and only the original fictional Indian-city sample details,
preserving IDs, all photo URLs, custom listings, accounts and workflow history. Existing INR
currency labels become PKR; non-demo numeric amounts are unchanged, not foreign-exchange converted.
Historical migrations `001`–`003` remain unchanged; extra area units remain supported for compatibility.

### Demonstration workflow

1. Browse a published property and send a visitor inquiry.
2. Sign in as Admin, open the lead and assign it to the Agent.
3. Sign in as Agent, review/edit contact details, add a note, set follow-up and qualify the lead.
4. Arrange a future Requested/Confirmed visit; an overlapping visit for the same agent is rejected.
5. Create a deal linked to the lead and move it to booking.
6. Close the deal won: the listing disappears from the portal and the lead becomes converted.
7. As Admin, create/edit a listing, upload a photo, publish/unpublish it and review its history and live counts.

## Configuration and PostgreSQL server option

No `.env` file is needed for the default local demonstration.
To customize it, copy `backend\.env.example` to `backend\.env` and uncomment needed variables:

| Variable | Purpose / default |
|---|---|
| DATABASE_URL | Optional conventional PostgreSQL connection URL |
| PGLITE_DIR | `.data`; embedded PostgreSQL persistence directory |
| SECRET_KEY | Optional 32+ random characters; otherwise a temporary local key is generated |
| FRONTEND_ORIGINS | `http://localhost:3000`; comma-separated allowed origins |
| PUBLIC_API_URL | `http://localhost:8000`; base for uploaded photo links |
| UPLOAD_DIR | `uploads`, relative to the backend |
| PORT | `8000` |

Restarting the API without a fixed `SECRET_KEY` requires signing in again.
Only one process can open a given PGlite data directory: stop the API before running
standalone migration or seed commands. Use a PostgreSQL server for multiple API processes.

For a conventional server:

1. Install PostgreSQL, create a database named `aqarflow` and create an application user.
2. Set `DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/aqarflow` in `backend\.env`.
3. Run `npm.cmd run migrate`, then `npm.cmd run seed` from `backend`.
4. Start the API normally. No application/schema changes are required.

The frontend API base is configured with `VITE_API_URL` (default
`http://localhost:8000/api/v1`); see `frontend\.env.example`.
Never put database passwords, API signing keys or private data in frontend variables.

## Functionality, business flow and requirement alignment

The implementation report compares the actual code with the original project document,
including screen routes, role permissions, the complete inquiry-to-deal flow, MVP acceptance,
remaining enterprise modules, approved stack changes and the Pakistan/PKR correction:

- Updated Word document: `docs\AqarFlow_MVP_Alignment_Updated.docx`
- Editable Markdown source: `docs\AqarFlow_Functionality_And_Project_Alignment_Report.md`

The report explicitly distinguishes implemented local MVP capabilities from partial,
unimplemented, deferred and unverified requirements.

## Developer commands

```powershell
cd backend
npm.cmd test
npm.cmd run check
npm.cmd run migrate
```

Frontend commands and screen routes are documented in `frontend\README.md`.
Tests use isolated, in-memory PostgreSQL through PGlite and do not modify demonstration data.
Backend route documentation is generated from the same validation schemas used by the API.

## Vercel deployment

Import this repository into **one Vercel project**, using the repository root (`.`), not
`frontend` or `backend`. The committed `vercel.json` builds the React frontend and exposes the
Express API as a Node.js function. Public pages and REST calls share the same HTTPS origin.
The deployment build uses `/api/v1` rather than `localhost`, includes the licensed demo
photographs, and supports direct navigation to React routes.

Configure these values in Vercel Project Settings > Environment Variables before deploying:

| Variable | Required deployment value |
|---|---|
| DATABASE_URL | Hosted PostgreSQL connection URL, including the provider's TLS requirements; a Neon free-tier database is suitable for a small demo. |
| SECRET_KEY | A new random secret of at least 32 characters, retained between deployments. Never use the local demo signing key. |
| BLOB_STORE_ID | Connect a public Vercel Blob store in Production. Vercel supplies this store ID and rotating OIDC credentials; no separate photo-provider account is required. |
| PUBLIC_API_URL | Optional HTTPS site origin without `/api/v1`; otherwise Vercel's deployment hostname is used. |
| FRONTEND_ORIGINS | Optional explicit additional frontend origins, comma-separated. The configured site origin is allowed automatically. |

Use the providers' free plans only where their current terms and quotas fit the internship demo.
Do not enable paid upgrades or automatic spending. Database and photo-provider signup/authorization
must be completed by the account owner. Never send provider passwords, API secrets or connection
strings in chat, frontend variables, source files or Git commits.

Vercel must use a hosted PostgreSQL server: the local `.data` folder cannot be deployed.
Cloud startup fails explicitly if the database, stable signing key or persistent photo
storage is missing. Migrations run transactionally on startup and use a PostgreSQL advisory lock
to serialize concurrent cold starts. Existing local PGlite development remains supported.

To populate a **new, empty cloud database**, open a separate local terminal in `backend`.
Set `DATABASE_URL` in that terminal using the value from your provider, set
`DEMO_CREDENTIALS_FILE=.demo-credentials.cloud.json`, and run `npm.cmd run seed`.
Do not run this against the local PGlite folder while its API is running, and do not overwrite
your local `.env` just to seed the cloud. The seed generates a fresh password unless an explicit
`DEMO_PASSWORD` is supplied, creates Admin/Agent accounts and sample Pakistan listings, and writes
the credentials to the ignored cloud-specific file. Share cloud logins privately with your manager;
do not reuse the easy local demo password for an Internet-accessible workspace.
The seed refuses to overwrite an existing demo administrator or credential file.

The deployed upload limit is **4 MB per photo** to stay below Vercel's request-body limit;
local development retains the 5 MB limit. JPEG/PNG/WebP validation, re-encoding and the
ten-photo-per-property limit apply in both environments. Demo photos are static assets;
new uploads are stored in Vercel Blob. Public photo URLs must not be used for confidential documents.

After deployment, the public portal, `/health`, `/api/v1/public/properties`, login, inquiry,
authorized property edits and image upload must work on the published HTTPS URL before it is
described as a working full-stack demonstration. A successful frontend build alone is not evidence
that the API, hosted data or photo storage is configured.

## Git and GitHub

The frontend and backend share one project root with separate package manifests and lockfiles.
The `.gitignore` excludes dependencies, database files, uploaded photos, build artifacts,
environment secrets and generated local demo credentials.
This is a separate Git repository on branch `main`. The project repository is:
https://github.com/udaymerugula-03/afarflow_realestatemanagement
To publish subsequent changes:

```powershell
git add .
git status
```

Review the staged files before making a commit or pushing.
The live Vercel URL must be taken from an actual successful deployment, not guessed from a
project name. Repository publication does not by itself create a working deployment.

## Scope limits

This follows the document's **seven-day MVP**, not its full enterprise roadmap.
Customer accounts, rental accounting, payments, invoices, commissions, private legal-document
storage, advanced analytics, email/WhatsApp automation, password-reset email and two-factor
authentication remain later-phase features. Leads provide basic customer/contact records;
a separate customer-account portal is not included. Property events appear on property details,
but a general audit-log screen is not included. Visit/deal lists are capped at 500 for the demo.

Demo listings are fictional. The software does not verify legal ownership or guarantee compliance.
Local development remains available. Deployment support targets a small free-tier demonstration,
not a production SLA; account setup, quotas and a successful live deployment still need confirmation.
