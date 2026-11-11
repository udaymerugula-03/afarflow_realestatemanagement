# AQARFLOW
## Functionality, Application Flow and Project Alignment Report

**A VIRELEO PROJECT | Project 01 | Internship MVP**

**Report date:** 10 November 2026  
**Requirements baseline:** Project_01 (web).docx, version 1.1 - 7-Day MVP Edition  
**Implementation reviewed:** Separate React frontend and Node.js/Express backend in the AqarFlow project  
**Final requested market:** Pakistan / Pakistani rupees (PKR)  
**Delivery environment:** Local development and demonstration; deployment deferred by request
**Confirmed implementation scope:** Strict seven-day MVP from Sections 14-16, not the full enterprise roadmap
**Current Word copy:** docs\AqarFlow_MVP_Alignment_Updated.docx

## 1. Executive conclusion

**The core local MVP is implemented, but the complete enterprise application described across the entire specification is not implemented.**

The developed code supports the principal business journey: an administrator publishes a property, a visitor submits an inquiry, the agency follows up the resulting lead, an agent schedules a visit, and an authorized user tracks a linked deal through booking or closure.

The project document explicitly limits first-week acceptance to the MVP in Sections 14-16. Rentals, full finance, private documents, maintenance, automation and other enterprise capabilities remain later-phase work. They must not be reported as completed merely because they appear in the wider requirements document.

**Alignment verdict:** The implementation broadly follows the documented MVP business workflow, with the limitations and approved changes recorded below. It is not a literal implementation of every detailed SRS item. Day 7 release/deployment and the complete deliverables checklist remain partial.

The strict-MVP alignment update adds editable basic contact/inquiry records, a qualified-lead prerequisite for deals, Requested/Confirmed visit creation, reference-code search, property activity/status history and clearer workspace screen titles. These extend existing MVP screens; they do not imply that separate enterprise customer, accounting or rental modules are complete.

### 1.1 Status definitions

| Status | Meaning |
|---|---|
| Implemented | The reviewed application contains the capability at local-MVP level. |
| Partial | A basic version exists, but some details from the wider requirement are missing. |
| Not implemented | The current code has no corresponding application module or endpoint. |
| Deferred | The work is explicitly excluded from the current delivery by the project boundary or user decision. |
| Not verified | The requirement needs evidence beyond the current local source review and automated workflow coverage. |

### 1.2 Approved decisions and differences

| Area | Original specification | Current decision | Assessment |
|---|---|---|---|
| Frontend | Next.js / React and TypeScript | React.js, TypeScript, Vite and React Router | User-approved technology change; not a Next.js implementation. |
| Backend | Python / FastAPI | Node.js / Express.js | User-approved technology change; not a FastAPI implementation. |
| Database | PostgreSQL | PostgreSQL through local PGlite; conventional PostgreSQL connection supported | Local PostgreSQL is operational; a separate managed/server installation is not the demonstrated environment. |
| Market/currency | Pakistan-first / PKR | Pakistan / PKR | Restored to the original requirement. The intermediate India/INR request was withdrawn. |
| Images | Property images and validation | Real, locally stored stock photographs for demos; actual user photo upload supported | Photos are labelled as samples and do not prove the fictional listing's identity or location. |
| Deployment | Deployed frontend, API and database | Local application only | Deferred by user request, not completed. |
| Version control | Git and GitHub with meaningful history | Separate Git repository initialized on main | No commits or GitHub remote were present at inspection. |

## 2. Implemented architecture and local entry points

```text
Public visitor / Agency Admin / Agent
                  |
           React.js frontend
                  |
          JSON REST API (/api/v1)
                  |
          Node.js / Express.js
                  |
       PostgreSQL data and transactions
       (local PGlite by default)

Property photos -> local backend uploads
Demo photographs -> local backend public\demo
```

The frontend does not connect directly to PostgreSQL. The backend performs authentication, role checks, agency scoping, linked-record validation, scheduling checks and deal-side effects.

| Entry point | Address / location |
|---|---|
| Public application | http://localhost:3000 |
| Staff login | http://localhost:3000/login |
| Staff workspace | http://localhost:3000/workspace |
| REST API base | http://localhost:8000/api/v1 |
| Interactive API documentation | http://localhost:8000/docs |
| OpenAPI definition | http://localhost:8000/openapi.json |
| Health endpoint | http://localhost:8000/health |
| Source folders | frontend and backend |
| Local run commands | start-frontend.ps1 and start-backend.ps1 from the project root |

The local API binds to the loopback interface. Local HTTP is not a verified production HTTPS deployment. PGlite persists PostgreSQL data in the backend's `.data` folder; one API process should open that directory at a time.

## 3. Roles and permissions actually implemented

| Action | Public visitor | Agency Admin | Agent |
|---|---|---|---|
| Browse eligible public listings | Yes | Yes | Yes |
| Submit a property inquiry | Yes, with consent | Public form available | Public form available |
| Open the business workspace | No | Yes | Yes |
| Read agency property inventory | No | Own agency | Own agency, read-only |
| Create, edit, publish, upload images or archive properties | No | Yes | No |
| Create a lead manually | No | Yes | Yes; assigned to self |
| View agency-wide leads | No | Own agency | No; own assigned leads only |
| Assign/reassign leads | No | Yes | No |
| Add lead notes and update stages/follow-up | No | Authorized agency leads | Own assigned leads |
| Edit lead contact/inquiry details | No | Authorized agency leads | Own assigned leads |
| Create/update visits and deals | No | Authorized agency records | Own assigned records |
| Create Agent accounts | No | Yes | No |
| View business-wide financial modules | No | Not implemented | Not implemented |

The current roles are fixed values: Admin and Agent. There is no custom permission builder or invitation-based role system. Agents can read the agency's inventory; properties are not restricted to only the agent's own property assignments. Agent lead, visit and deal access is assignment-scoped.

Manager, Accountant, Property Manager, Platform Super Admin and registered Customer roles are not implemented. The public visitor does not need an account to inquire.

**Code evidence:** `backend\src\app.js` functions `auth`, `admin`, `owned`, `agent` and `listAssigned`; frontend `components\auth.tsx`, `workspace.tsx` and `staff.tsx`.

## 4. End-to-end application flow

### 4.1 Main business journey

```text
Admin signs in
  -> Creates an Agent account if required
  -> Creates a sale/rent property
  -> Uploads images and sets Available
  -> Publishes the property

Visitor searches published properties
  -> Opens a property detail page
  -> Submits contact details, message and consent
  -> Backend creates a New lead for the property's agency

Admin reviews the lead
  -> Assigns/reassigns it to an Agent
  -> Reviews contact details and qualifies the lead
  -> Agent records notes, stage and next follow-up
  -> Authorized staff schedule a linked property visit
  -> Backend rejects overlapping active visits for that Agent

Authorized staff create a linked deal
  -> Offer / Negotiation
  -> Booking / Documentation reserves the property
  -> Closed Won: Sold/Rented + unpublished + lead Converted
  -> Closed Lost: reservation released where applicable
```

The backend requires a lead in Qualified, Visit Scheduled or Negotiation before creating a deal. A stage change into Booking, Documentation or Closed Won also checks this prerequisite. New, Contacted, Lost and Converted leads cannot start another deal. The application does not enforce a strict step-by-step transition graph between all nine deal stages.

### 4.2 Property publication flow

1. Admin opens Properties and selects Add property.
2. Admin supplies title, unique agency reference, description, sale/rent purpose, type, PKR price, area/unit, bedrooms, bathrooms and location.
3. Admin may assign a default Agent to the property.
4. Admin saves the property, then uploads photos.
5. To appear publicly, the property must be published, not archived, and Available or Reserved.
6. Draft, Sold, Rented and Inactive properties are hidden from public search even if the publish checkbox was enabled.
7. Archive removes the record from active inventory while retaining database history. Open deals must be closed before archiving.
8. Property details show agency-scoped activity, including recorded status/publication changes and automatic booking/closure effects. New status/publication/assignment updates include before/after values; older events may have only their original limited details.

Photo uploads accept JPEG, PNG or WebP, up to 5 MB and 25 megapixels, with a maximum of ten images per property. The backend validates and re-encodes images. Cover selection, manual ordering, captions and photo removal are not implemented.

### 4.3 Inquiry and CRM flow

1. Visitor opens an eligible property and submits name, email, phone, message and consent.
2. The backend derives the agency and initial Agent from the property, rather than accepting an arbitrary agency from the visitor.
3. A lead is created with stage New and an initial activity record.
4. If the property has no assigned Agent, the lead remains unassigned until the Admin assigns it.
5. Admin/assigned Agent can edit contact/inquiry details, update the lead stage, write notes and store a follow-up date. Contact edits validate and normalize email/phone without losing the lead's links or activity.
6. The timeline displays notes and selected system-generated activity.

Follow-up dates are stored and displayed. They do not trigger email, WhatsApp, scheduled reminders or a notification service.

### 4.4 Visit flow

1. Staff select an accessible lead.
2. The property must match that lead; the responsible Agent must match its current assignment.
3. The property must be Available or Reserved.
4. Staff enter a future start time, later end time, Requested/Confirmed initial status and optional notes. Confirmed remains the default.
5. The backend checks overlapping Requested/Confirmed visits for the same Agent.
6. A conflict returns HTTP 409 with a visible message instead of creating the second appointment.
7. Creating a visit sets the lead stage to Visit Scheduled.
8. Staff can update the visit to Requested, Confirmed, Completed, Cancelled or No-show.

Visits are shown as list/cards, not a full calendar. Notes provide basic outcome recording; meeting point, visitor count, notifications and a dedicated next-action field are not implemented.

### 4.5 Deal and closure flow

1. Staff choose a Qualified, Visit Scheduled or Negotiation lead, its linked property and assigned Agent. The form explains the prerequisite and links back to the lead if it needs qualification; the backend independently rejects invalid stages.
2. Staff record a stage, offer amount and notes.
3. Multiple preliminary offers are possible, but only one Booking, Documentation or Closed Won deal is permitted per property.
4. Booking or Documentation changes the property to Reserved.
5. Leaving a reservation stage releases it to Available where applicable.
6. Closed Won changes a sale property to Sold, or a rent property to Rented; the property is unpublished and the lead becomes Converted.
7. A Closed Won deal cannot be reopened in this MVP. Notes and offer amount remain editable; this is not an immutable finance ledger.

A rent-purpose deal closing as Rented does not create a lease, rent schedule or payment record. Deal bookings do not collect token payments or generate legal documents.

### 4.6 Actual statuses and dashboard definitions

| Record / metric | Implemented values or definition |
|---|---|
| Property statuses | Draft, Available, Reserved, Sold, Rented, Inactive. Under Offer and Leased are absent. |
| Lead stages | New, Contacted, Qualified, Visit Scheduled, Negotiation, Converted, Lost. |
| Visit statuses | Requested, Confirmed, Completed, Cancelled, No-show. |
| Deal stages | Inquiry, Qualified, Visit, Offer, Negotiation, Booking, Documentation, Closed Won, Closed Lost. |
| Published properties | Published, non-archived Available/Reserved listings in the agency. |
| Available properties | Non-archived Available properties, including private ones. |
| New leads / Total leads | Stage New / all accessible leads. |
| Upcoming visits | Future Requested/Confirmed visits. |
| Open deals | Deals not Closed Won or Closed Lost. |

For Agents, lead/visit/deal counts are assignment-scoped. Inventory counts refer to the accessible agency inventory. Pipeline summaries count the returned deal collection, not an unrestricted analytics dataset.

## 5. Screen and navigation inventory

| Area | Current route | Functionality |
|---|---|---|
| Public | `/` | Home, property discovery, property photos, search and contact calls to action. |
| Public | `/properties` | Search results, filters and pagination. |
| Public | `/properties/:id` | Property details, images and consent-based inquiry form. |
| Public | `/contact` | Guidance directing visitors to listing inquiries; no general contact form endpoint. |
| Access | `/login` | Admin/Agent email and password sign-in. |
| Workspace | `/workspace` | Six live count cards and navigation. |
| Workspace | `/workspace/properties` | Inventory search and list. |
| Workspace | `/workspace/properties/new` | Admin property creation. |
| Workspace | `/workspace/properties/:id` | Admin editor/upload/archive; Agent read-only details; property activity/status history. |
| Workspace | `/workspace/leads` | Lead inbox, filters and manual lead creation. |
| Workspace | `/workspace/leads/:id` | Contact/inquiry editing, notes, stages, assignment and follow-up. |
| Workspace | `/workspace/visits` | Request/confirm, schedule and update visits using forms/cards. |
| Workspace | `/workspace/deals` | Deal cards, stage summary and update forms. |
| Workspace | `/workspace/staff` | Admin team list and immediate Agent account creation. |
| System | Unknown routes / runtime conditions | Not-found screen, session gate, alerts, loading/empty states and error boundary. |

The full Section 6 navigation list is not implemented. There are no separate About, Services, FAQ, legal/privacy, Register, Forgot Password, Customer Dashboard, Favorites, My Inquiries, My Visits, Customers, Owners, Rentals, Tenants, Leases, Finance, Documents, Maintenance, Notifications, Reports, Audit Log or Settings screens.

Lead Kanban, a visit calendar and standalone visit/deal detail pages are also absent. Deal editing is performed on cards rather than a dedicated detail route. Permission failures use visible alerts/API responses rather than a dedicated 403 page; runtime failures use an error boundary rather than a standalone 500 route.

## 6. Detailed requirements comparison

| Spec section | Area | Status against full section | Current implementation and remaining gap |
|---|---|---|---|
| 4.1 | Public website | Partial | MVP home/list/detail/contact/search works. No maps, customer accounts, favorites, full informational/legal pages, sitemap or structured-data implementation. |
| 4.2 | Business workspace | Partial | Inventory, CRM, staff, visits, deals and counts exist. Most ERP/finance/rental modules do not. |
| 5.1 | Authentication/accounts | Partial | Bcrypt passwords, JWT plus revocable sessions, backend roles and agency scoping. No email verification, password-reset email, public registration, profile editor, 2FA, token refresh rotation or user-facing logout-all. |
| 5.2 | Property inventory | Partial | Core sale/rent fields, six statuses, uploads, publish/archive, reference search/uniqueness, pagination and property activity/status history. No lease purpose, Under Offer/Leased statuses, owner records, maps, amenities, ownership files, bulk updates or image-management controls. |
| 5.3 | CRM/follow-ups | Partial | Public/manual leads, stated seven stages, Agent assignment, notes and follow-up dates. No budget/preference/source fields, typed communication events, automatic reminders or duplicate merge. Converted is a lead stage, not a separate contact conversion. |
| 5.4 | Customer/owner records | Partial | Basic customer contact data is stored and editable inside leads, retaining linked inquiry/activity. No independent contact/owner profiles, KYC files or relationship pages. |
| 5.5 | Agent/staff operations | Partial | Admin creates Agent accounts and assigns properties/leads. No invitation flow, activate/deactivate controls, custom roles, targets, commission or performance reporting. |
| 5.6 | Visits | Partial | Linked scheduling, date/time range, notes, five statuses and overlap rejection. No calendar, meeting point, visitor count, reminders or notification integration. |
| 5.7 | Deals | Partial | Qualified-lead prerequisite, linked deals, nine stages, offer amount, notes, reservation guard and closure effects. No buyer/seller contact entities, agreed amount, close date, token/payment schedule, legal documents or printable statement. |
| 5.8 | Rentals/leases | Not implemented | A rent listing is supported; lease agreements, obligations, deposits, renewals and collections are not. |
| 5.9 | Finance/invoices | Not implemented | No payments, invoices, receipts, expense ledger, commission calculations or finance reports. Explicit MVP boundary defers these despite broader first-release wording elsewhere. |
| 5.10 | Private documents | Not implemented | Public property photos are not a private document vault. No KYC/ownership file storage or signed downloads. |
| 5.11 | Maintenance | Not implemented | No maintenance request module, vendor allocation or service-cost tracking. |
| 5.12 | Notifications | Not implemented | Form alerts and stored activity are not a notification centre. No email, WhatsApp, delivery tracking or background workers. |
| 5.13 | Reports/analytics | Partial | Basic dashboard counts and deal stage summary. No advanced charts, report filters, financial metrics, exports or PDF reporting. |
| 5.14 | Agency/settings | Partial | Agency identity, fixed roles and selected audit events are stored. No settings UI, branches, configurable categories, permissions or invoice configuration. |

## 7. Data model, API and implementation evidence

### 7.1 Tables present

| Table | Current purpose |
|---|---|
| agencies | Agency identity. |
| users | Agency membership, name, email, password hash and fixed role. |
| sessions | Session expiry and revocation. |
| properties | Core inventory, image URL array, publish/archive state and Agent assignment. |
| leads | Contact information, inquiry, stage, property link, Agent and follow-up. |
| activities | Lead notes and selected system activity. |
| visits | Linked lead/property/Agent appointments and outcomes. |
| deals | Linked opportunities, stage, offer amount and notes. |
| audit_logs | Selected important actions, deal-stage changes, and before/after inventory status/publication/assignment changes from the alignment update onward. |
| rate_buckets | Database-backed login/inquiry rate counters. |
| schema_migrations | Applied SQL migration versions. |

UUIDs, foreign keys, indexes and selected created timestamps are present. General `updated_at` handling, full before/after audit snapshots of every field/entity and the complete Section 9 schema are not implemented. Older missing snapshots are not reconstructed. Images use a JSON array, not the full `property_media` model. There is no separate `contacts` or `deal_events` table.

### 7.2 Current REST API

All resource endpoints below use the `/api/v1` prefix.

| Resource | Implemented operations | Important distinction from suggested contract |
|---|---|---|
| Auth | POST login/logout; GET me | No refresh or password-reset endpoints. |
| Public | GET properties and properties/:id; POST inquiries | UUID detail address, not SEO slug. |
| Properties | GET list/detail/history; POST create; PATCH edit; DELETE archive; POST :id/images | History uses GET :id/history. Image endpoint is images, not media; upload is public listing photography only. |
| Leads | GET list/detail; POST create; PATCH contact/stage/follow-up/assignment; POST :id/activities | Assignment uses PATCH, not a separate assign endpoint. |
| Staff | GET users; POST users | Admin creates Agent immediately; no email invitation lifecycle. |
| Visits | GET list; POST Requested/Confirmed create; PATCH :id | Completion uses status PATCH, not a separate complete endpoint. |
| Deals | GET list; POST create; PATCH :id | No separate GET deal detail/stage endpoint; UI edits returned cards. |
| Dashboard | GET reports/dashboard | No sales, rent-collection or expense reports. |

The document says suggested endpoints are a baseline rather than a locked contract. Different endpoint names do not by themselves mean the equivalent business workflow is missing.

### 7.3 Main source references

| Concern | Evidence in the project |
|---|---|
| Backend auth, permissions and workflows | `backend\src\app.js` |
| Input fields and allowed statuses | `backend\src\schemas.js` |
| PostgreSQL adapter and migrations | `backend\src\database.js`; `backend\migrations` |
| OpenAPI/Swagger | `backend\src\openapi.js` |
| Demo accounts and data | `backend\src\seed.js` |
| Frontend public routes | `frontend\App.tsx`; `frontend\pages` |
| Workspace routes and session gate | `frontend\pages\Workspace.tsx`; `frontend\components\workspace.tsx` |
| Inventory / CRM / staff / visits / deals | Corresponding files in `frontend\components` |
| Authentication and REST client | `frontend\components\auth.tsx`; `frontend\lib\api.ts` |
| Photo origin and licensing | `backend\public\demo\photo-sources.json` |

## 8. Section 16 MVP acceptance comparison

| ID | Acceptance item | Local status | Assessment |
|---|---|---|---|
| A1 | Admin login and protected workspace | Implemented | Backend credentials/session validation and frontend session gate exist; not a production HTTPS certification. |
| A2 | Agent only accesses permitted records | Implemented | Own assigned leads/visits/deals; own-agency inventory is read-only. |
| A3 | Property create/edit/publish/images/core fields | Implemented | Core sale/rent MVP capability; advanced media/owner fields remain partial as noted. |
| A4 | Published public listings and filters | Implemented | Additional eligibility rule restricts results to Available/Reserved non-archived listings. |
| A5 | Visitor inquiry creates linked lead | Implemented | Property and agency derived/validated by backend. |
| A6 | Admin assignment, Agent notes and stages | Implemented | Assignment is Admin-only; Agent records are scoped. |
| A7 | Visits and scheduling conflict warning | Implemented | Backend overlap checks and HTTP 409 are surfaced by the UI. |
| A8 | Basic linked deal/booking | Implemented | Basic deal fields and reservation/closure logic exist; no finance settlement. |
| A9 | Accurate basic dashboard counts | Implemented | Defined counts are calculated from authorized database records. |
| A10 | Desktop/mobile usability and feedback | Implemented | Responsive layouts, loading/empty/error states and browser workflow coverage exist; formal accessibility/cross-browser certification is not claimed. |
| A11 | Deployed MVP with setup, demo and tests | Partial | Local setup, examples, demo data and tests exist. Deployment and production flow verification were deferred by request. |

These are local implementation assessments, not signed business acceptance, exhaustive certification or a percentage-complete claim for the enterprise specification.

## 9. Seven-day plan and deliverables status

### 9.1 Work-package comparison

| Document day | Planned work package | Current status |
|---|---|---|
| Day 1 | Foundation, application structure and database | Implemented with approved React/Express stack and local PostgreSQL. |
| Day 2 | Login, roles and protected workspace | Implemented for Admin and Agent. |
| Day 3 | Basic property management and images | Implemented at MVP level. |
| Day 4 | Public portal and inquiry flow | Implemented at MVP level. |
| Day 5 | Basic CRM and Agent assignment | Implemented; contact details are embedded in leads. |
| Day 6 | Basic visits, deals, dashboard and activity | Implemented at MVP level. |
| Day 7 | QA, handover and deployed release | Partial: local tests and documentation exist; deployment is deferred. |

These labels compare the document's work packages. They are not a claim that seven full working days have elapsed.

### 9.2 Section 17 deliverables

| Deliverable | Status | Notes |
|---|---|---|
| Frontend and backend source | Implemented | Separate applications in the project folder. |
| Git repository with meaningful history | Partial | Repository initialized; no commits/remote at inspection. |
| Database schema, migrations and seed | Implemented | SQL migrations and local demo seed supplied. |
| OpenAPI and endpoint examples | Implemented | Interactive Swagger and machine-readable schema. |
| README / environment examples | Partial | Local setup, architecture and limitations provided; production deployment instructions/configuration are not delivered. |
| Automated API and browser tests | Implemented | Existing regression and end-to-end coverage; not exhaustive for all roadmap requirements. |
| Verified production deployment | Deferred | Explicit user decision. |
| Admin/Agent guide and flow | Implemented | Local README and Sections 3, 4 and 11 of this report. |
| Limitations, third-party list and handover | Partial | Limitations and photo sources supplied; formal release sign-off/operational handover remains outstanding. |

## 10. Quality coverage and explicit limitations

Backend tests cover authentication/logout, role restrictions, agency isolation, public visibility/reference search, inquiries, contact-edit normalization/history, assignments, notes, Requested/Confirmed visit conflicts, qualified-deal prerequisites, property history, reservation/closure, upload validation, rate limiting, migrations, data persistence and demo photo delivery. Frontend tests cover payloads, REST errors, sessions, money formatting, date helpers, deal eligibility and safe history formatting. Playwright covers the main business flow, contact editing, qualification feedback, Requested visits, property history refresh, real photo rendering, backgrounds, Agent restrictions and mobile layout.

### 10.1 Latest local run after strict MVP alignment

| Activity | Local result | Scope |
|---|---|---|
| Backend automated suite | 20 tests passed | API workflows, contact editing, qualification, requested visits, sale/rent closure history, access rules, migrations, persistence and data/photo preservation. |
| Frontend automated suite | 20 tests passed | Request handling, payloads, PKR formatting, date/form helpers, qualification eligibility and safe history formatting. |
| Frontend production build | Passed | TypeScript checking and Vite bundle generation; not a deployed release. |
| Browser end-to-end suite | 2 tests passed | Photo/background rendering and visitor-to-deal workflow, including contact edits, qualification feedback, Requested visits, history and role restrictions. |
| Local demonstration data | Pakistan / PKR | Lahore, Islamabad and Karachi samples retain real JPEG photo links. |

These are results of the existing local suites, not a coverage percentage, load test, business sign-off or proof that every full-SRS requirement is implemented.

### 10.2 Requirements that remain limited or unverified

| Requirement area | Evidence / limitation |
|---|---|
| Passwords and access control | Bcrypt, signed expiring tokens, persisted revocable sessions and backend role/agency checks. Simple shared demo credentials are not production credentials. |
| Authentication strategy | Browser tab session storage; eight-hour bearer tokens. No refresh rotation, cookie sessions or user-facing logout-all. CSRF-cookie controls do not apply to a cookie strategy that is not used. |
| Uploads and photos | Local image content validation and processing; stock photos stored locally with licence/source record. No private signed document storage. |
| Auditability | Property activity/status history, inventory before/after status/publication/assignment changes and deal old/new stages are recorded. Older events retain their original details. Not a complete audit trail of every field, operation or read/download. |
| Performance | Lists paginated and indexed. No documented under-one-second load benchmark or scale certification. |
| List limits | Visits/deals limited to 500 records. Workflow selectors initially load 100 leads/properties; linked property fallback is available. |
| Browser/accessibility | Local Edge/Chromium workflow and responsive viewport coverage. Firefox, Safari and formal WCAG conformance are not verified. |
| Operations | No production HTTPS, cloud deployment, backup/restore drill, monitoring service or separate staging environment. |
| Privacy/legal | Inquiry consent is present. No complete privacy/legal pages, retention workflow, KYC verification or ownership guarantee. |
| Accounting | Deal values are opportunity amounts, not received revenue. No payment ledger or settlement guarantees. |

## 11. Admin, Agent and visitor demonstration guide

### 11.1 Start and sign in

1. Open the AqarFlow project folder in VS Code.
2. Start `start-backend.ps1` and `start-frontend.ps1` in separate terminals, using the execution-policy command in the root README if needed.
3. Open http://localhost:3000.
4. Read the local demo login details from `backend\.demo-credentials.json`. Passwords are intentionally not reproduced in this report.
5. Use the Admin account for inventory/team management and the Agent account to demonstrate restricted access.

### 11.2 Recommended demonstration sequence

| Step | Actor and screen | Expected result |
|---|---|---|
| 1 | Admin - Team | Create an Agent or use the existing demo Agent. |
| 2 | Admin - Add property | Save a fictional Pakistan sale/rent listing in PKR. |
| 3 | Admin - Property editor | Upload a real sample photo, set Available and publish. |
| 4 | Visitor - Properties | Find the listing using city/type/purpose/price filters. |
| 5 | Visitor - Property detail | Submit a consent-based inquiry. |
| 6 | Admin - Lead inbox | Find and assign the new lead; review contact details and set Qualified when appropriate. |
| 7 | Agent - Assigned lead | Correct contact details if needed, add a note and follow-up date; verify no reassignment control is available. |
| 8 | Staff - Visits | Schedule a future Requested/Confirmed visit with matching lead/property/Agent. |
| 9 | Staff - Visits | Try an overlapping active appointment; expect a visible conflict. |
| 10 | Staff - Deals | Create a deal and move it to Booking/Documentation; property becomes Reserved. |
| 11 | Staff - Deals | Close Won; property becomes Sold/Rented, is unpublished, and lead becomes Converted. |
| 12 | Public portal / Dashboard / Property history | Listing is hidden publicly, relevant counts update and property history records reservation/closure. |
| 13 | Agent / Logout | Confirm Admin-only controls are unavailable and logout ends the session. |

Use only fictional records for the internship demo. Sample stock photos do not depict the fictional Pakistan addresses.

## 12. Remaining work and final assessment

Before describing the whole original specification as completed, the project would still need the wider customer/owner model, remaining roles, complete account lifecycle, advanced property/media controls, visits calendar, richer CRM, rentals, finance, private documents, maintenance, notifications, reports, settings and the associated tests.

Before describing the original seven-day release package as fully delivered, it would also need meaningful version-control history/GitHub handover, formal user acceptance, an operational release plan and verified deployment when deployment is authorized.

**Accurate internship status statement:** "AqarFlow's core local MVP business flow has been developed using React.js, Node.js/Express and PostgreSQL. The application supports Pakistan/PKR property discovery, inquiry capture, Admin/Agent operations, basic CRM, scheduling, deal tracking and dashboard counts. The full enterprise roadmap and production deployment are not complete."

This report documents the reviewed implementation and its boundaries; it does not promise a completion date for the remaining enterprise modules or certify production security, legal compliance or property ownership.
