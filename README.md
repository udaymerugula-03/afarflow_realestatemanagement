# AqarFlow

Real-estate management internship MVP, following **Sections 14-16** of `Project_01 (web).docx`.

**Application:** https://aqarflow-real-estate.vercel.app

**GitHub:** https://github.com/udaymerugula-03/afarflow_realestatemanagement

| Layer | Technology |
|---|---|
| Frontend | React.js, TypeScript, Vite, React Router |
| Backend | Node.js, Express.js, REST JSON under `/api/v1` |
| Database | Hosted Neon PostgreSQL |
| Photos | Vercel Blob for uploads; bundled licensed photos delivered through the CDN |
| Deployment | One Vercel project, frontend and API on the same HTTPS origin |
| Development tools | Node.js 24, npm, VS Code, Git and GitHub |

## Cloud-only application

Open the application URL above; no laptop server is required.
API documentation: https://aqarflow-real-estate.vercel.app/docs.
Health: https://aqarflow-real-estate.vercel.app/health.

The embedded database, local API listener, local photo-upload fallback, temporary signing-key
fallback and local launch scripts have been removed. Missing cloud configuration fails
explicitly rather than creating a local substitute. React defaults to the same-origin
`/api/v1` API. The browser never connects directly to PostgreSQL.

The Git checkout, historical reports and preserved database backups are retained.
The unrelated Java address-maintenance repository is separate and unchanged.
The supplied SERVORA daily report describes another project, not completed AqarFlow work.

## Accounts and permissions

The specification does not prescribe a fixed Admin email or password. It requires secure
authentication and backend-enforced Agency Admin/Agent permissions. The current work-email
login identifiers are **`admin@vireleo.me`** and **`agent@vireleo.me`**.

Admin and Agent use **different passwords**, stored as bcrypt hashes.
The owner selected simplified passwords for the current internship demonstration. They are
predictable and are not suitable for real customer data; replace them before any production use.
The owner keeps their private login details in the ignored
**`backend\.demo-credentials.cloud.json`**:

| Role | Email field | Password field |
|---|---|---|
| Agency Admin | `admin` | `admin_password` |
| Agent | `agent` | `agent_password` |

Share each password privately only with its intended user. Never commit credentials or
send passwords, tokens or database connection strings in chat. Rotation revokes both
accounts' existing sessions; old passwords stop working.

Admins manage their agency's inventory, leads and staff. Agents can browse agency inventory
but access only their own assigned leads, visits and deals. Agents cannot edit inventory,
create staff or reassign leads. Backend checks enforce these restrictions independently
of visible UI controls, including tenant isolation.

## Seven-day MVP

The responsive interface includes a public Buy/Rent search with city and property-type
shortcuts, filter-aware collection links, and a shared Admin/Agent sign-in page. The workspace
uses role-aware navigation, six live-count cards, refresh and workflow shortcuts. Property
counts cover agency inventory; Agent lead, visit and deal counts cover only assigned records.
Public pages, sign-in and both workspace roles share the AqarFlow name, home-symbol logo,
tagline, typography and navy/teal palette. `frontend\theme.css` owns the shared branding and
design tokens; workspace styles change layout and information density, not the brand.
The visual refresh does not add enterprise modules or change existing backend permissions.

| Area | Implemented behavior |
|---|---|
| Public website | Home, property search/filtering/pagination, details, contact and consent-based inquiries |
| Authentication | Admin/Agent login, backend roles, expiring sessions and revocable logout |
| Inventory | Create/edit, reference search, unique codes, sale/rent, PKR, publish/unpublish, photos, status history and archive |
| CRM | Inquiry capture, contact editing, stages, agent assignment, follow-up dates and activity notes |
| Staff | Admin creates Agent accounts |
| Visits | Requested/confirmed appointments, linked lead/property/agent, overlap detection and outcomes |
| Deals | Qualified-lead prerequisite, linked records, offers, stages, reservations and confirmed-booking checks |
| Dashboard | Live listing, available-property, new-lead, visit and open-deal metrics |
| Data handling | Strict validation, agency/assignment scoping and important-change audit records |

Only published, available/reserved, non-archived properties appear publicly. Inquiries require
consent and a valid public property; the server derives their agency and default agent.
Visits/deals use the lead's property and current assigned agent. Draft, sold, rented and
inactive properties cannot receive new visits/deals. Leads must be Qualified, Visit Scheduled
or Negotiation before deal creation or confirmed booking. This is not a rigid stage-transition
graph; notes-only edits remain possible.

Requested and Confirmed visits reserve the agent's time. PostgreSQL transactions and row
locks serialize scheduling; overlaps return HTTP 409. Booking/Documentation reserves a
property, and a database index prevents multiple confirmed sales. Leaving a reservation
releases it. Closed Won marks the property Sold/Rented, unpublishes it and converts the lead.
Closed-won deals cannot reopen; properties with open deals cannot be archived.

Lead contact edits preserve record IDs, assignment, linked property and timeline. Property
history records status/publication/assignment changes with before/after values, including
automatic booking/closure changes. Missing historical snapshots are not fabricated.

### Photos and localization

The approved market is **Pakistan / PKR**, with Lahore, Islamabad and Karachi sample listings.
Sample listings are fictional. Licensed stock images are illustrative, not verified
photographs of the stated addresses. Images have no **Sample photo** overlay; the property
detail page retains the stock-photo disclosure outside the image.
The homepage has its own photograph, separate from the villa listing.
Sources and the [Unsplash License](https://unsplash.com/license) are recorded in
`backend\public\demo\photo-sources.json`. Static images are bundled at build time, not
downloaded from Unsplash at runtime.

Uploaded JPEG/PNG/WebP photos are limited to **4 MB**, 25 megapixels and ten per property.
The API decodes, resizes and re-encodes images to remove embedded metadata, then stores them
in public Vercel Blob. These are public listing photos, not confidential legal documents.

Historical migrations remain unchanged. Migration 003 replaces earlier illustrations while
retaining uploads; migration 004 restores Pakistan/PKR and only original fictional sample
details, retaining IDs, photo URLs, custom listings, accounts and workflow history.
Currency-label correction did not convert custom numeric amounts using foreign exchange.

## Source and build

```text
AqarFlow
  frontend                 React screens, components, API client and browser tests
  backend
    src                    Express API, validation, hosted SQL adapter and administrative CLIs
    migrations             Versioned PostgreSQL schema
    tests                  Isolated authorization/workflow tests and test-only database adapter
    .env.example           Cloud configuration reference without secrets
  api                      Vercel function entry
  scripts                  React/CDN-photo build
  .vscode                  Suggested extensions and build/test tasks
```

For source work, install dependencies with `npm.cmd ci --prefix frontend` and
`npm.cmd ci --prefix backend`, then run `npm.cmd run build` at the repository root.
Use `npm.cmd` when PowerShell blocks `npm.ps1`.

Existing developer commands:

```powershell
npm.cmd test --prefix backend
npm.cmd run check --prefix backend
npm.cmd test --prefix frontend
npm.cmd run build
```

PGlite is a **development dependency used only by isolated backend tests**, never by the
application runtime. Those tests do not connect to Neon. Browser tests target the cloud
application and create identifiable records; see `frontend\README.md`.

## Vercel deployment

Use the repository root, not either subdirectory, for the single Vercel project.
`vercel.json` builds React, copies bundled photos to the CDN and routes REST requests to
the Express Node function. Public pages, deep links and API calls share one HTTPS origin.

| Environment variable | Purpose |
|---|---|
| `DATABASE_URL` | Required hosted PostgreSQL URL with provider-required TLS; loopback URLs are rejected |
| `SECRET_KEY` | Required private random signing key, at least 32 characters, stable across deployments |
| `BLOB_STORE_ID` | Required connected public Blob store, unless an explicit provider token is configured |
| `BLOB_READ_WRITE_TOKEN` | Alternative Blob credential for administrative tooling outside Vercel |
| `PUBLIC_API_URL` | Optional HTTPS site origin without a path; otherwise derived from Vercel |
| `FRONTEND_ORIGINS` | Optional extra explicit HTTPS frontend origins; the site origin is allowed automatically |

Vercel supplies rotating OIDC credentials for the connected Blob store. Keep all secrets
in provider settings, never frontend variables or Git. Use only free plans within their
current terms and quotas; do not enable paid upgrades or automatic spending.

Migrations run transactionally before serving the API, using a PostgreSQL advisory lock
to serialize concurrent cold starts. **Do not reset or reseed the existing cloud database.**
Repository pushes do not automatically deploy this project; GitHub auto-deployment is
not configured. Deploy from the linked checkout:

```powershell
npx.cmd --yes vercel@65.14.0 deploy --prod --yes --scope udaymerugula-7897
```

### Administrative account tools

For a **new empty hosted database only**, securely configure `DATABASE_URL`, `ADMIN_EMAIL`
and `AGENT_EMAIL`, then run `npm.cmd run seed` from `backend`. The seed creates sample
Pakistan listings and separate random Admin/Agent passwords, saved to the ignored cloud
credentials file. It refuses to overwrite an existing Admin or credential file.

To rotate the two existing accounts, securely configure `DATABASE_URL` and run
`npm.cmd run rotate-passwords` from `backend`. Optional `CREDENTIALS_FILE` overrides the
private credentials path. The command checks roles and agency, prepares an ignored
`.pending.json` recovery file, updates hashes and revokes sessions transactionally, then
replaces the private credentials file. If final file replacement fails after commit,
retain the pending file containing the new passwords; do not blindly rerun the command.
Passwords are never printed.

## Scope limits and historical reports

This is the document's **seven-day MVP**, not its full enterprise roadmap.
Customer accounts, rental accounting, payments, invoices, commissions, private documents,
advanced analytics, email/WhatsApp automation, password-reset email, email verification,
refresh-token rotation and two-factor authentication remain later phases.
Leads provide basic contact records, not a customer-account portal. Property history is
available, but a general audit-log screen is not. Visit/deal lists are capped at 500.

Historical alignment and Day 2 reports are retained under `docs`. Their earlier local-run
instructions are superseded by this README; they are not claims of full-SRS completion.
The software does not verify ownership or guarantee compliance. Free-tier hosting does
not provide a production SLA; quotas, backups and account access remain the owner's responsibility.
