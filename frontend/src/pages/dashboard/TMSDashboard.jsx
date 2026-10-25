import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  Activity, ArrowDownToLine, Calculator, ChevronDown, FilePlus2,
  Receipt, Search, Truck, Wallet
} from 'lucide-react'
import api, { branchAPI, dashboardAPI } from '../../api'

const navigation = [
  { label: 'Dashboard', items: [{ label: 'Dashboard Overview', path: 'dashboard' }] },
  {
    label: 'Bookings',
    items: [
      { label: 'New Bilty', path: 'bilty-entry' },
      { label: 'Bilty Register', path: 'consignments' },
      { label: 'Freight Calculator', path: 'freight-calculator' }
    ]
  },
  {
    label: 'Fleet & Drivers',
    items: [
      { label: 'Gadi Challan', path: 'gadi-challan' },
      { label: 'Vehicles', path: 'vehicle' },
      { label: 'Drivers', path: 'driver' }
    ]
  },
  {
    label: 'Operations',
    items: [
      { label: 'Gate Pass', path: 'gate-pass' },
      { label: 'Branch Transfer', path: 'branch-transfer' }
    ]
  },
  {
    label: 'Delivery',
    items: [
      { label: 'POD Entry', path: 'pod' },
      { label: 'POD Register', path: 'pod-list' }
    ]
  },
  {
    label: 'Customers & Parties',
    items: [
      { label: 'Customers', path: 'customer-master' },
      { label: 'Parties', path: 'supplier' }
    ]
  },
  {
    label: 'Billing & Invoices',
    items: [
      { label: 'Bill Entry', path: 'bill-entry' },
      { label: 'Bill List', path: 'bill-list' }
    ]
  },
  {
    label: 'Payments',
    items: [
      { label: 'Payment Entry', path: 'payment-entry' },
      { label: 'Money Receipts', path: 'money-receipt' }
    ]
  },
  {
    label: 'Accounts & Finance',
    items: [
      { label: 'Ledger', path: 'ledger' },
      { label: 'Outstanding', path: 'outstanding' },
      { label: 'Reports', path: 'reports' }
    ]
  },
  {
    label: 'Administration',
    items: [
      { label: 'User Management', path: 'user-management' },
      { label: 'Backup', path: 'backup' },
      { label: 'Stationery Stock', path: 'stationery-stock' },
      { label: 'Settings', path: 'settings' }
    ]
  }
]

const quickActions = [
  { label: 'New Bilty', path: 'bilty-entry', icon: FilePlus2, color: 'bg-blue-600 hover:bg-blue-700' },
  { label: 'New Bill', path: 'bill-entry', icon: Receipt, color: 'bg-blue-600 hover:bg-blue-700' },
  { label: 'Money Receipt', path: 'money-receipt', icon: Wallet, color: 'bg-purple-600 hover:bg-purple-700' },
  { label: 'Vehicle Challan', path: 'gadi-challan', icon: Truck, color: 'bg-emerald-600 hover:bg-emerald-700' },
  { label: 'Freight Calculator', path: 'freight-calculator', icon: Calculator, color: 'bg-slate-600 hover:bg-slate-700' }
]

const stationeryTypes = [
  { label: 'BILTY', matches: ['bilty', 'lr'] },
  { label: 'BILLING', matches: ['billing', 'bill'] },
  { label: 'MR', matches: ['mr', 'money_receipt'] },
  { label: 'GADI_CHALLAN', matches: ['gadi_challan', 'challan'] }
]

const valueOrZero = (value) => Number(value || 0)
const money = (value) => `₹${valueOrZero(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const number = (value) => valueOrZero(value).toLocaleString('en-IN')

function branchLabel(branch) {
  return (branch || 'Branch')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getData(response) {
  return response?.data?.data || response?.data || {}
}

export default function TMSDashboard({
  branch,
  isMainAdmin = false,
  showAllBranchesSelector = false
}) {
  const routeParams = useParams()
  const branchSlug = branch && branch !== 'global'
    ? branch
    : routeParams.branchSlug || routeParams.branchCode || ''
  const isBranchDashboard = Boolean(branchSlug && branchSlug !== 'global')
  const [stats, setStats] = useState(null)
  const [stock, setStock] = useState([])
  const [branches, setBranches] = useState([])
  const [selectedBranchId, setSelectedBranchId] = useState('all')
  const [statsUnavailable, setStatsUnavailable] = useState(false)
  const [activeMenu, setActiveMenu] = useState('')
  const [loading, setLoading] = useState(true)
  const [trackNumber, setTrackNumber] = useState('')
  const [trackMessage, setTrackMessage] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [branchSession, setBranchSession] = useState(null)

  useEffect(() => {
    if (!isBranchDashboard) return
    try {
      const session = JSON.parse(localStorage.getItem('branch_session') || 'null')
      if (!session?.token || session.branch?.url_slug !== branchSlug) {
        setBranchSession(false)
        return
      }
      setBranchSession(session)
    } catch (error) {
      console.error('Unable to read the saved branch session:', error)
      setBranchSession(false)
    }
  }, [branchSlug, isBranchDashboard])

  useEffect(() => {
    if (isBranchDashboard && branchSession === null) return
    if (isBranchDashboard && !branchSession) return

    let active = true
    setLoading(true)
    setStatsUnavailable(false)
    const statsBranchSlug = isBranchDashboard ? branchSlug : undefined
    const statsBranchId = isBranchDashboard
      ? branchSession?.branch?.id
      : selectedBranchId !== 'all' ? selectedBranchId : undefined
    const query = {}
    if (statsBranchSlug) query.branch = statsBranchSlug
    if (statsBranchId) query.branch_id = statsBranchId

    const requests = [
      dashboardAPI.getDashboardStats(statsBranchSlug, statsBranchId),
      api.get('/stock', { params: query })
    ]
    if (showAllBranchesSelector && isMainAdmin) requests.push(branchAPI.getAll())

    Promise.allSettled(requests).then((results) => {
      if (!active) return
      const [statsResult, stockResult, branchesResult] = results
      if (statsResult.status === 'fulfilled' && statsResult.value.data?.success !== false) {
        setStats(getData(statsResult.value))
        setStatsUnavailable(false)
      } else {
        setStats(null)
        setStatsUnavailable(true)
      }
      if (stockResult.status === 'fulfilled') {
        const data = getData(stockResult.value)
        setStock(Array.isArray(data) ? data : [])
      } else {
        setStock([])
      }
      if (branchesResult?.status === 'fulfilled') {
        const data = getData(branchesResult.value)
        setBranches(Array.isArray(data) ? data : [])
      }
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [
    branchSlug, branchSession, isBranchDashboard, isMainAdmin,
    selectedBranchId, showAllBranchesSelector, refreshKey
  ])

  if (isBranchDashboard && branchSession === false) {
    return <Navigate to={`/branch-login/${encodeURIComponent(branchSlug)}`} replace />
  }

  const branchPath = (path) => {
    if (isBranchDashboard) {
      const modulePath = path === 'freight-calculator' ? 'rate-master' : path
      return `/branch/${branchSlug}/${modulePath}`
    }
    return path === 'dashboard'
      ? '/dashboard'
      : path === 'freight-calculator' ? '/rates' : `/${path}`
  }
  const activeBranch = branchSession?.branch
  const selectedBranch = branches.find((item) => String(item.id) === String(selectedBranchId))
  const title = activeBranch?.branch_name
    || (isBranchDashboard ? branchLabel(branchSlug) : selectedBranch?.branch_name || 'All branches')

  async function handleTrack(event) {
    event.preventDefault()
    if (!trackNumber.trim()) return
    setTrackMessage('')
    try {
      const response = await api.get('/consignments/track', {
        params: {
          lr_no: trackNumber.trim(),
          ...(isBranchDashboard ? { branch: branchSlug, branch_id: activeBranch?.id } : {})
        }
      })
      setTrackMessage(response.data?.error || 'Tracking details loaded.')
    } catch (error) {
      setTrackMessage(error.response?.data?.error || 'Unable to track this bilty.')
    }
  }

  function stockBalance(stationery) {
    const itemStock = stock.find((entry) => {
      const entryType = String(entry.document_type || entry.documentType || entry.type || '').toLowerCase()
      return stationery.matches.some((key) => entryType.includes(key))
    })
    return itemStock
      ? `${number(itemStock.remaining_count ?? itemStock.remaining_quantity)}/${number(itemStock.total_stock ?? itemStock.total_quantity)}`
      : '--/--'
  }

  const getStat = (...keys) => {
    for (const key of keys) {
      if (stats?.[key] !== undefined && stats?.[key] !== null) return stats[key]
    }
    return 0
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-sm font-extrabold text-white">BTC</div>
          <strong className="text-sm font-bold text-slate-900">{title}</strong>
          <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-600">TMS 6.0 Live</span>
          <span className="text-xs font-semibold text-green-600">● System Online</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleTrack} className="flex">
            <label className="sr-only" htmlFor="dashboard-track">Track LR or bilty number</label>
            <input
              id="dashboard-track"
              value={trackNumber}
              onChange={(event) => setTrackNumber(event.target.value)}
              placeholder="Enter LR / Bilty Number..."
              className="w-56 rounded-l-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <button type="submit" className="rounded-r-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Search className="mr-1 inline h-4 w-4" />Track
            </button>
          </form>
          <label className="sr-only" htmlFor="dashboard-branch">Select branch</label>
          <select
            id="dashboard-branch"
            value={showAllBranchesSelector && isMainAdmin ? selectedBranchId : activeBranch?.id || ''}
            onChange={(event) => setSelectedBranchId(event.target.value)}
            disabled={!showAllBranchesSelector || !isMainAdmin}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:text-slate-700"
          >
            {showAllBranchesSelector && isMainAdmin ? (
              <>
                <option value="all">All branches</option>
                {branches.map((item) => (
                  <option key={item.id} value={item.id}>{item.branch_name || item.branch_code}</option>
                ))}
              </>
            ) : (
              <option value={activeBranch?.id || ''}>{title}</option>
            )}
          </select>
          <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
            Admin Branch
          </button>
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">AD</span>
            <span className="hidden text-xs font-semibold text-slate-700 sm:inline">Admin</span>
          </div>
        </div>
      </header>

      {trackMessage && (
        <p role="status" className="border-b border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-800">
          {trackMessage}
        </p>
      )}

      <nav aria-label="Main navigation" className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-1 px-3 py-2">
          {navigation.map((category) => (
            <div key={category.label} className="relative">
              <button
                type="button"
                aria-expanded={activeMenu === category.label}
                onClick={() => setActiveMenu(activeMenu === category.label ? '' : category.label)}
                className={`flex items-center gap-1 rounded-md px-3 py-2 text-xs font-semibold hover:bg-blue-50 hover:text-blue-700 ${activeMenu === category.label ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
              >
                {category.label}<ChevronDown className="h-3 w-3" />
              </button>
              {activeMenu === category.label && (
                <div className="absolute left-0 top-full z-20 mt-1 min-w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {category.items.map((item) => (
                    <Link
                      key={item.label}
                      to={branchPath(item.path)}
                      onClick={() => setActiveMenu('')}
                      className="block px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        {statsUnavailable && (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Dashboard statistics are temporarily unavailable because the database could not be queried.
          </div>
        )}

        <section aria-labelledby="quick-actions-title">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h1 id="quick-actions-title" className="text-lg font-bold text-slate-900">Quick Actions</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            {quickActions.map(({ label, path, icon: Icon, color }) => (
              <Link
                key={label}
                to={branchPath(path)}
                className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors ${color}`}
              >
                <Icon className="h-4 w-4" />+ {label}
              </Link>
            ))}
          </div>
        </section>

        <section aria-label="Dashboard statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Today&apos;s Booking</p>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{number(getStat('today_lr', 'todaysBooking'))} <span className="text-sm font-medium text-slate-500">Bilties</span></p>
            <p className="mt-2 text-sm text-slate-600">Today&apos;s Revenue <strong className="text-slate-900">{money(getStat('today_revenue'))}</strong></p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">This Month&apos;s Booking</p>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{number(getStat('month_lr', 'monthlyBooking'))} <span className="text-sm font-medium text-slate-500">Bilties</span></p>
            <p className="mt-2 text-sm text-slate-600">Month&apos;s Revenue <strong className="text-slate-900">{money(getStat('month_revenue'))}</strong></p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Pending Amount</p>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{money(getStat('pending_amount', 'pendingAmount'))}</p>
            <div className="mt-3 grid grid-cols-2 gap-y-2 text-xs text-slate-600">
              <span>Pending Bilties <strong>{number(getStat('pending_lr'))}</strong></span>
              <span>Bills <strong>{number(getStat('pending_bills'))}</strong></span>
              <span>Money Receipts <strong>{number(getStat('total_mr'))}</strong></span>
              <span>Gadi Challans <strong>{number(getStat('total_gadi_challan'))}</strong></span>
            </div>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Fleet &amp; Network Status</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>Active Vehicles <strong>{number(getStat('active_vehicles'))}</strong></p>
              <p>Active Drivers <strong>{number(getStat('active_drivers'))}</strong></p>
              <p>Branches <strong>{number(isBranchDashboard ? 1 : getStat('total_branches'))}</strong></p>
              <p>Pending POD <strong>{number(getStat('pending_pod'))}</strong> Deliveries</p>
            </div>
          </article>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Stationery &amp; Printed Books Stock (Remaining)</h2>
            {loading && <span className="text-xs text-slate-500">Updating…</span>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stationeryTypes.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-xs font-bold tracking-wide text-slate-600">{item.label}</span>
                <span className="text-sm font-bold text-slate-900">{stockBalance(item)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
