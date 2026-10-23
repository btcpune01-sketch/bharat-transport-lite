# Bharat Transport Lite Audit Report

## Summary

The reported production symptoms match a missing PostgreSQL connection URL in the Vercel backend service. The backend supports the provider-injected PostgreSQL URL variables, but no repository change can supply the production database credentials or recover records without connecting to the actual database.

The Bilty form failure was caused by a customer API response being assigned to an array state without validating its shape. The consignment-list route and page already existed; the operations menu was missing the requested shortcut, and its table lacked total amount and payment status fields.

## Fixes in this change

| File | Finding | Change |
|---|---|---|
| `backend/server.js` | Missing environment configuration was reported as a server error; bill/LR serial lookup failures did not clearly distinguish database unavailability. | Configuration failures now return HTTP 503 with the missing variable names and Vercel configuration guidance. Number-generation failures return 503 with a descriptive error. Empty bill tables still return serial zero, producing the first number from the existing generator. |
| `frontend/src/pages/Dashboard.jsx` | Operations did not offer a direct Bilty List link; dropdowns could exceed viewport height. | Added Bilty List as the first Operations entry, added links for existing implemented functions, constrained dropdown height with internal vertical scrolling, and maintained the wrapping 10-category navbar. Dashboard menu inventory is 46 options. |
| `frontend/src/pages/Consignments.jsx` | Bilty listing did not show the total amount or payment status required for reconciliation. | Added Total Amount and Payment columns; the existing search, status filtering, view/print, edit, and delete controls remain. |
| `AUDIT_46_FUNCTIONS.md` | No checked-in count of Dashboard menu functions. | Added the menu table and implementation inventory. |
| `AUDIT_REPORT.md` | No audit findings summary. | Added this report. |

## File-level review notes

- `backend/server.js`: This is the actual monolithic Express API entry point; the requested `backend/src/config/db.js`, `backend/src/db/index.js`, and top-level `api/index.js` paths do not exist. Environment gating is before the pool-backed handlers.
- `backend/database-url.js`: Shared URL selection supports the four documented provider variables and rejects localhost-only URLs in Vercel.
- `backend/database-migration.js`: Uses the shared URL resolver. The inspected migration statements are additive; they do not drop or truncate bill or consignment tables.
- `backend/.env.example`: Lists the supported database URL variables alongside `JWT_SECRET`, `PORT`, and `FRONTEND_URL`.
- `frontend/src/App.jsx`: The `/consignments` and `/consignments/new` routes already existed, so no duplicate page/route was added. The scan found no exact duplicate route path literals.
- `frontend/src/pages/BiltyEntry.jsx`: Customer response is normalized before setting array state; select options are guarded.
- `frontend/src/pages/Consignments.jsx`: Existing list now includes amount/payment columns and suppresses zero-count summary cards while the list request has failed.
- `frontend/src/pages/BillEntry.jsx` and `frontend/src/utils/billSerial.js`: New bill creation calls `/bills/last-serial`; an empty DB result is treated as serial zero and the next serial is one. A database outage now remains an explicit error rather than generating a potentially duplicate invoice number.
- `frontend/src/pages/Dashboard.jsx`: Contains the 10 responsive/wrapping menu categories and 46 audited selectable options.
- `frontend/src/pages/Reports.jsx`: Existing report fetch path handles API failure as an error state instead of a successful empty report.
- `vercel.json`: Existing backend/frontend service roots and `/api` rewrite are present; no Vercel routing change was necessary.

## Database and data integrity

- The PostgreSQL URL resolver already supports `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, and `POSTGRES_URL_NON_POOLING` from the prior change.
- There is no hardcoded database host fallback. A missing URL is rejected before database-backed API routes are served, rather than allowing `pg` to default to localhost.
- The app uses PostgreSQL tables including `bill_book`; no live SQL query was run because production DB credentials are not available here.
- No production data was deleted or modified. No `DROP TABLE` or `TRUNCATE` operation was run. The inspected migration file contains additive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` statements.
- A bill serial is only safe to generate by querying the database. The empty-table query returns zero and starts numbering at one; when the DB is unavailable, returning a guessed serial could collide with an existing invoice, so the API reports unavailable instead.
- Production records, bills, and bilties could not be confirmed or restored from this environment. Configure the valid remote PostgreSQL URL on the Vercel **backend service** and redeploy before checking record availability.

## Frontend crash, listing, and navigation

- `frontend/src/pages/BiltyEntry.jsx` normalizes the customer response and verifies it is an array before state update; the custom select also guards its options input.
- `/consignments` was already registered in `frontend/src/App.jsx` and rendered `frontend/src/pages/Consignments.jsx`; a duplicate page or route was unnecessary.
- The Operations dropdown now places Bilty List first and links it to `/consignments`.
- The list displays LR number, date, consignor, consignee, total amount, payment status, and delivery status, with search/filter and existing actions.
- The navbar already used `flex-wrap`; dropdowns now have a bounded height and vertical scrolling. This was not browser-tested at a physical 1366px viewport in this environment.
- `frontend/src/pages/Reports.jsx` (modified in the preceding commit) displays data-load errors rather than treating a failed API response as an empty report.

## Static inventory and checks

- 49 frontend page files under `frontend/src/pages/`.
- 71 JSX route declarations in `frontend/src/App.jsx`, including nested branch routes and aliases; no exact duplicate route path literals were found.
- 46 Dashboard menu options: 43 route links and 3 actions.
- 40 branch module entries in `frontend/src/components/branchModules.js`.
- 98 Express route declarations across `backend/server.js` and `backend/routes/`.
- A static search found 216 `.map()`, `.filter()`, and `.reduce()` calls in `frontend/src`. These operate on a mixture of literal arrays, normalized API state, and local collections; adding redundant guards mechanically to every call is not a safe substitute for validating each data source. The reported Bilty customer/options path and consignment list are guarded.
- No empty-array success fallbacks were found in backend route error handlers in the scan; DB outages should remain explicit errors rather than be presented as genuine empty data.
- No destructive migration statements (`DROP TABLE`/`TRUNCATE`) were found in the inspected migration.
- A repository-wide string scan found localhost references only in development CORS origins and the database URL resolver's local-host rejection check; no database connection is hardcoded to `127.0.0.1`.
- No repository `npm test` or lint scripts are defined in `frontend/package.json`.

## Validation

- `npm run build` — passed after the final menu and list edits.
- Backend `node --check` — passed for the server, database URL helper, migration, and backend route/middleware files.
- Missing database/JWT environment integration check — passed; backend returns actionable HTTP 503 rather than attempting a localhost connection or claiming an empty dataset.
- Vercel CLI build — not run; Vercel CLI is not installed in the environment.
- Live API/data checks — not possible without production credentials and a valid database URL.

## Deployment action still required

Set a valid PostgreSQL connection URL (prefer the Vercel Postgres integration's `POSTGRES_URL` or set `DATABASE_URL`) and `JWT_SECRET` in the Vercel backend service environment, then redeploy. This code cannot infer the correct production database or restore historical data from a missing/invalid URL.
