import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
const dashboard = await readFile(new URL('../src/pages/dashboard/TMSDashboard.jsx', import.meta.url), 'utf8')
const routeCount = (app.match(/<Route\b/g) || []).length
const failures = []

if (routeCount < 46) failures.push(`Expected at least 46 route declarations, found ${routeCount}.`)

const requiredAdminPaths = [
  '/admin/branches',
  '/admin/backup',
  '/admin/users',
  '/admin/stationery-stock',
  '/admin/settings',
  '/admin/audit',
  '/admin/database',
  '/admin/all-branches'
]
for (const path of requiredAdminPaths) {
  if (!app.includes(`path="${path}"`)) failures.push(`Missing admin route ${path}.`)
}

const requiredBranchModules = [
  'bilty-entry', 'consignments', 'bilty-print', 'gadi-challan', 'gate-pass',
  'branch-transfer', 'vehicle-tracking', 'bill-entry', 'bill-list',
  'money-receipt', 'payment-entry', 'delivery', 'party-master', 'reports',
  'user-management', 'backup', 'stationery-stock'
]
for (const moduleName of requiredBranchModules) {
  if (!app.includes(`'${moduleName}':`)) failures.push(`Missing branch module mapping "${moduleName}".`)
}

const routePaths = new Set([...app.matchAll(/<Route\b[^>]*\bpath="([^"]+)"/g)].map((match) => match[1]))
const hasRoute = (path) => routePaths.has(path)
  || routePaths.has(`${path}/:id?`)
  || routePaths.has(`${path}/:id`)
const branchMapStart = app.indexOf('const branchPages = {')
const branchMapEnd = app.indexOf('\n}', branchMapStart)
const branchModules = new Set(
  [...app.slice(branchMapStart, branchMapEnd).matchAll(/'([^']+)'\s*:/g)]
    .map((match) => match[1])
)
const globalAliasesStart = dashboard.indexOf('    const globalAliases = {')
const globalAliasesEnd = dashboard.indexOf('\n    }', globalAliasesStart)
const globalAliases = new Map(
  [...dashboard.slice(globalAliasesStart, globalAliasesEnd).matchAll(/(?:'([^']+)'|([a-zA-Z][\w-]*)):\s*'([^']+)'/g)]
    .map((match) => [match[1] || match[2], match[3]])
)
const moduleAliases = new Map([
  ['freight-calculator', 'rate-master'],
  ['party/new', 'party-entry'],
  ['mr/create', 'money-receipt'],
  ['accounts/tds-register', 'accounts'],
  ['billing/pending', 'outstanding'],
  ['fleet/status', 'fleet-status'],
  ['branch-payments/summary', 'branch-payments-summary']
])
const dashboardLinks = [...dashboard.matchAll(/path:\s*'([^']+)'/g)].map((match) => match[1])
for (const link of new Set(dashboardLinks)) {
  if (link.startsWith('admin/')) {
    if (!hasRoute(`/${link}`)) failures.push(`Admin dashboard link "${link}" has no route.`)
    continue
  }
  if (link.startsWith('bookings/list')) {
    if (!hasRoute('/bookings/list')) failures.push(`Dashboard link "${link}" has no booking-list route.`)
    continue
  }

  const branchModule = moduleAliases.get(link) || link.split('/')[0]
  if (!branchModules.has(branchModule)) failures.push(`Branch dashboard link "${link}" has no branch module mapping.`)

  const globalPath = globalAliases.get(link) || `/${link}`
  if (!hasRoute(globalPath)) failures.push(`Dashboard link "${link}" resolves to missing global route "${globalPath}".`)
}

const adminMenuStart = dashboard.indexOf('  admin: {', dashboard.indexOf('const administrationMenus'))
const branchMenuStart = dashboard.indexOf('  branch: {', adminMenuStart)
const branchMenuEnd = dashboard.indexOf('\n  }\n}', branchMenuStart)
const adminMenu = dashboard.slice(adminMenuStart, branchMenuStart)
const branchMenu = dashboard.slice(branchMenuStart, branchMenuEnd)
for (const label of [
  'Branch Management',
  'Global User Management',
  'Backup & Restore',
  'Global Stationery Stock',
  'System Settings',
  'Audit Logs',
  'Database Management'
]) {
  if (!adminMenu.includes(label)) failures.push(`Admin menu is missing "${label}".`)
}
for (const label of ['Branch User Management', 'Stationery Stock (Branch)', 'Branch Settings']) {
  if (!branchMenu.includes(label)) failures.push(`Branch menu is missing "${label}".`)
}
for (const label of ['Branch Management', 'Global User Management', 'Backup & Restore']) {
  if (branchMenu.includes(label)) failures.push(`Branch menu must not expose admin-only "${label}".`)
}

const quickActionStart = dashboard.indexOf('const adminQuickActions = [')
const quickActionEnd = dashboard.indexOf('\n]', quickActionStart)
const quickActionCount = (dashboard.slice(quickActionStart, quickActionEnd).match(/\{ label:/g) || []).length
if (quickActionCount < 12) failures.push(`Expected at least 12 quick actions, found ${quickActionCount}.`)

if (failures.length) {
  console.error('Function audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  const navigationStart = dashboard.indexOf('const navigation = [')
  const quickActionsStart = dashboard.indexOf('const adminQuickActions = [', navigationStart)
  const baseMenuEntries = (dashboard.slice(navigationStart, quickActionsStart).match(/label:\s*'[^']+'/g) || []).length - 9
  const adminEntries = (adminMenu.match(/label:\s*'[^']+'/g) || []).length - 1
  const branchEntries = (branchMenu.match(/label:\s*'[^']+'/g) || []).length - 1
  console.log(`Function audit passed: ${routeCount} routes; ${baseMenuEntries + adminEntries} admin menu entries; ${baseMenuEntries + branchEntries} branch menu entries.`)
}
