# Dashboard/Menu Function Audit

The Dashboard menu now exposes 46 selectable functions: 43 route links and 3 menu actions. All destinations point to existing application routes or implemented Dashboard actions; no placeholder pages were added.

| # | Function | Menu | Route / action | Present |
|---:|---|---|---|---|
| 1 | Dashboard Overview | Dashboard | `/` | Yes |
| 2 | Refresh Branch Data | Dashboard | Refresh action | Yes |
| 3 | New Bilty Booking | Bookings | `/consignments/new` | Yes |
| 4 | All Bilty Register | Bookings | `/consignments` | Yes |
| 5 | E-Way Bills | Bookings | `/eway-bills` | Yes |
| 6 | Quick LR Tracking | Bookings | Focus tracking input action | Yes |
| 7 | Vehicle Management | Fleet & Drivers | `/vehicles` | Yes |
| 8 | Driver List | Fleet & Drivers | `/drivers` | Yes |
| 9 | Document Expiry Alerts | Fleet & Drivers | `/vehicles/expiring` | Yes |
| 10 | Bilty List (LR Register) | Operations | `/consignments` | Yes |
| 11 | Track a Bilty | Operations | `/track` | Yes |
| 12 | Vehicle Challan | Operations | `/gadi-challan` | Yes |
| 13 | Gate Pass | Operations | `/gate-pass` | Yes |
| 14 | Manifest / Transit | Operations | `/manifests` | Yes |
| 15 | Trip Management | Operations | `/trips` | Yes |
| 16 | POD Register | Delivery | `/pod` | Yes |
| 17 | Upload POD | Delivery | `/pod-upload` | Yes |
| 18 | POD Viewer | Delivery | `/pod-view` | Yes |
| 19 | Public POD View | Delivery | `/public/pod-view` | Yes |
| 20 | Customer Directory | Customers & Parties | `/customers` | Yes |
| 21 | Party Master | Customers & Parties | `/parties` | Yes |
| 22 | Create Party | Customers & Parties | `/party/new` | Yes |
| 23 | Smart Rate Contracts | Customers & Parties | `/rates` | Yes |
| 24 | Freight Calculator | Customers & Parties | Calculator action | Yes |
| 25 | Bill Book | Billing & Invoices | `/bills` | Yes |
| 26 | Create New Bill | Billing & Invoices | `/bills/new` | Yes |
| 27 | Bill Print | Billing & Invoices | `/bill-print` | Yes |
| 28 | Reports | Billing & Invoices | `/reports` | Yes |
| 29 | Money Receipt (MR) | Payments | `/mr` | Yes |
| 30 | Create Money Receipt | Payments | `/mr/create` | Yes |
| 31 | Branch Payment Entry | Payments | `/branch-payments` | Yes |
| 32 | Party Ledger | Payments | `/ledger` | Yes |
| 33 | Outstanding Amounts | Payments | `/outstanding` | Yes |
| 34 | Financial Summary (P&L) | Accounts & Finance | `/accounts/summary` | Yes |
| 35 | Daily Expenses | Accounts & Finance | `/expenses` | Yes |
| 36 | TDS Register | Accounts & Finance | `/accounts/tds-register` | Yes |
| 37 | Commissions | Accounts & Finance | `/commissions` | Yes |
| 38 | Claims | Accounts & Finance | `/claims` | Yes |
| 39 | Branches | Administration | `/branches` | Yes |
| 40 | Branch Portal Management | Administration | `/branch-portal` | Yes |
| 41 | Branch Ledger | Administration | `/branch-payments/summary` | Yes |
| 42 | Document Stock | Administration | `/stock` | Yes |
| 43 | Users & Operators | Administration | `/users` | Yes |
| 44 | System Settings | Administration | `/settings` | Yes |
| 45 | Audit Logs | Administration | `/audit` | Yes |
| 46 | Backup & Restore | Administration | `/backup` | Yes |

## Inventory counts

- Frontend page files: 49.
- JSX route declarations: 71, including nested branch routes and aliases.
- Dashboard menu options: 46 (43 route links and 3 actions).
- Branch module entries: 40, defined separately for branch sessions.
- Backend Express route declarations scanned in `backend/server.js` and `backend/routes/`: 98.

These counts describe implemented routes, pages, and menu options; they are not a claim that every route was exercised against production data.
