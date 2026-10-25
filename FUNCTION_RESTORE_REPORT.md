# TMS 6.0 Function Restoration Audit

## Scan results

- **Total functions found in scan:** 112 Express route-handler declarations. This is a code inventory, not 112 unique business functions.
- **Frontend inventory:** 50 page files, 86 route declarations, and 86 branch-module mappings.
- **Dashboard navigation:** 71 admin menu entries and 63 branch menu entries. These counts include repeated shortcuts and aliases; they are not unique-function counts.
- **Quick actions:** 13 for administrators and 12 for branch users.
- **Historical dashboard inventory:** 46 menu functions, documented in [AUDIT_46_FUNCTIONS.md](./AUDIT_46_FUNCTIONS.md).
- The scan covered the audit documents, `frontend/src/App.jsx`, frontend pages/components, `backend/server.js`, `backend/routes/`, package scripts, and `vercel.json`. The backend is primarily implemented in `backend/server.js`.

## Admin-special functions

There are **10 distinct admin-special functions** in the Administration menu. Database Management is an additional route/menu alias to the existing Backup page, not a separate database console.

1. Branch Management (add/edit/delete branches)
2. Global User Management
3. Backup & Restore
4. Global Stationery Stock
5. System Settings
6. Audit Logs
7. All Branches Data View
8. Role Management (within Global User Management)
9. Branch Portal Management
10. Branch Ledger

`/admin/database` currently maps to the existing Backup page because no separate database-management component or API was found in the scan.

## Branch functions

The branch dashboard exposes **63 menu entries** (including repeated links and aliases), grouped as follows:

- **Dashboard:** overview, today's bookings, monthly bookings, refresh
- **Bookings:** bilty entry, consignments, bilty/LR print, booking list, gate pass, branch transfer, LR tracking, e-way bills, freight calculator
- **Fleet & Drivers:** gadi challan, vehicle master, driver master, vehicle tracking, challan history, fleet status, expiry alerts, trip management
- **Operations:** gate pass/list, branch transfer/list, manifests/transit, tracking
- **Delivery:** POD entry/upload/register/view, delivery entry, pending delivery, POD and delivery reports
- **Customers & Parties:** party master, customer directory, customer ledger, party-wise report, rate contracts
- **Billing & Invoices:** bill entry/list/print/register, to-pay report
- **Payments:** payment entry, money receipt, outstanding report, paid report, day book
- **Accounts & Finance:** ledger, profit report, stock report, branch-wise report, all reports, expenses, TDS register, commissions, claims
- **Branch Administration:** branch user listing, branch stationery stock, branch settings

Branch users do not see global Branch Management, Global User Management, or Backup & Restore in their dashboard navigation. The branch user list is read-only and scoped to the authenticated branch. Party/customer catalogs are also read-only to branch users; their API reads were enabled while writes remain blocked by the branch access middleware.

## Missing before and restored

Before this restoration, the replacement dashboard did not surface the complete set of existing project routes through role-specific, category-based navigation. In particular, the dashboard menu lacked the comprehensive booking, operations, delivery/POD, fleet, billing, reports, branch-user, and admin-special entry points above.

Restored and wired in this change:

- Expanded the TMS 6.0 category menus and role-specific Administration menu.
- Expanded quick actions and linked the four dashboard statistics cards to their corresponding lists.
- Added or verified admin route aliases for branches, backup, global users, stationery stock, settings, audit, database alias, and all-branch data.
- Added branch module mappings for dashboard links, including branch user management, stationery stock, reports, delivery, and operational lists.
- Added branch-scoped user listing and branch stationery-stock views.
- Scoped driver and vehicle records by branch, including schema/runtime migration support.
- Added today/month filters to the booking list.
- Enabled read-only branch access to shared party/customer catalogs; removed branch-facing party create/edit/delete controls.
- Added `npm run audit:functions` to validate minimum route coverage, required admin and branch mappings, role-specific menu labels, quick-action count, and dashboard link destinations.

## Verification

- **Clickable:** Yes for route resolution at the static audit level: every dashboard link is checked against its global route or branch-module mapping.
- **Browser-tested:** 6 Playwright end-to-end workflows passed. These cover representative dashboard/admin/branch flows, not every individual menu item.
- **Live services:** Not verified against a production database. The build, route audit, and browser tests do not prove that every API endpoint is available in the deployed environment. Dashboard statistics fall back to zero values and show the temporary-unavailable notice if the API/database fails.
- **Specialized report labels:** Some report links intentionally resolve to the existing shared Reports or Accounts pages; this change restores navigation to existing functionality rather than creating distinct report engines or new backend endpoints.
