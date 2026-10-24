import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Activity, AlertTriangle, Boxes, Building2, Calculator, ChevronDown,
  ChevronRight, Clock, FilePlus, FileText, LogOut, Plus, RefreshCw, Search,
  ShieldCheck, TrendingUp, Truck
} from 'lucide-react'
import api from '../api'
import { formatDate } from '../utils/dateFormatter'

const categories = [
  { label: 'Dashboard', items: [{ label: 'Dashboard Overview', path: '' }] },
  {
    label: 'Bookings',
    items: [
      { label: 'New Bilty', path: 'bilty-entry' },
      { label: 'Bilty List', path: 'consignments' },
      { label: 'Bilty Register', path: 'consignments' },
      { label: 'Freight Calculator', action: 'calculator' }
    ]
  },
  {
    label: 'Fleet & Drivers',
    items: [
      { label: 'Gadi Challan', path: 'gadi-challan' },
      { label: 'Vehicle Entry', path: 'vehicle' },
      { label: 'Driver Master', path: 'driver' }
    ]
  },
  {
    label: 'Operations',
    items: [
      { label: 'Gate Pass', path: 'gate-pass' },
      { label: 'Trip Sheet', path: 'trip-sheet' },
      { label: 'Lory Receipt', path: 'money-receipt' }
    ]
  },
  {
    label: 'Delivery',
    items: [
      { label: 'POD Entry', path: 'pod' },
      { label: 'POD Register', path: 'pod-list' },
      { label: 'Delivery Register', path: 'pod-list' }
    ]
  },
  {
    label: 'Customers & Parties',
    items: [
      { label: 'Party Master', path: 'customer-master' },
      { label: 'Station Master', path: 'city-master' }
    ]
  },
  {
    label: 'Billing & Invoices',
    items: [
      { label: 'Bill Entry', path: 'bill-entry' },
      { label: 'Bill List', path: 'bill-list' },
      { label: 'Bill Register', path: 'bill-list' }
    ]
  },
  {
    label: 'Payments',
    items: [
      { label: 'Payment Entry', path: 'payment-entry' },
      { label: 'Money Receipt', path: 'money-receipt' }
    ]
  },
  {
    label: 'Accounts & Finance',
    items: [
      { label: 'Ledger', path: 'ledger' },
      { label: 'Outstanding', path: 'outstanding' },
      { label: 'Daily Report', path: 'profit-loss' },
      { label: 'Cash Book', path: 'cash-book' }
    ]
  },
  {
    label: 'Administration',
    items: [
      { label: 'Stock', path: 'stock-report' },
      { label: 'Document Stock', path: 'stock-entry' },
      { label: 'User Management', path: 'user-management' },
      { label: 'Branch Profile', path: 'branch-profile' },
      { label: 'Backup', path: 'backup' },
      { label: 'Rate Master', path: 'rate-master' }
    ]
  }
]

const stationeryTypes = [
  { label: 'BILTY', matches: ['bilty', 'lr'] },
  { label: 'BILLING', matches: ['billing', 'bill'] },
  { label: 'MR', matches: ['mr', 'money_receipt'] },
  { label: 'GADI_CHALLAN', matches: ['gadi_challan', 'challan'] }
]

function getList(response, keys = []) {
  const payload = response?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key]
    if (Array.isArray(payload?.data?.[key])) return payload.data[key]
  }
  return []
}

function getErrorMessage(error) {
  return error?.response?.data?.error || error?.message || 'Unable to load branch dashboard data.'
}

function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export default function BranchPortal() {
  const { branchSlug } = useParams()
  const navigate = useNavigate()
  const [branch, setBranch] = useState(null)
  const [stats, setStats] = useState({})
  const [consignments, setConsignments] = useState([])
  const [topConsignors, setTopConsignors] = useState([])
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [activeMenu, setActiveMenu] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [trackNumber, setTrackNumber] = useState('')
  const [trackResult, setTrackResult] = useState(null)
  const [trackError, setTrackError] = useState('')
  const [showCalculator, setShowCalculator] = useState(false)
  const [calculator, setCalculator] = useState({ from_city: '', to_city: '', weight_kg: '', packages: '' })
  const [calcResult, setCalcResult] = useState(null)

  function logout() {
    localStorage.removeItem('branch_session')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate(`/branch-login/${branchSlug}`, { replace: true })
  }

  useEffect(() => {
    const controller = new AbortController()
    let session
    try {
      session = JSON.parse(localStorage.getItem('branch_session') || 'null')
    } catch (readError) {
      console.error('Unable to read the saved branch session:', readError)
      localStorage.removeItem('branch_session')
    }

    if (!session?.token || session.branch?.url_slug !== branchSlug || !session.branch?.id) {
      localStorage.removeItem('branch_session')
      navigate(`/branch-login/${branchSlug}`, { replace: true })
      return () => controller.abort()
    }

    const activeBranch = session.branch
    const branchId = activeBranch.id
    const params = { branch_id: branchId }
    setBranch(activeBranch)
    setLoading(true)
    setRefreshing(true)
    setError('')

    Promise.allSettled([
      api.get('/dashboard/stats', { params, signal: controller.signal }),
      api.get('/consignments', { params, signal: controller.signal }),
      api.get('/dashboard/recent', { params, signal: controller.signal }),
      api.get('/dashboard/top-parties', { params, signal: controller.signal }),
      api.get('/stock', { params, signal: controller.signal })
    ]).then(([statsResult, consignmentsResult, recentResult, consignorsResult, stockResult]) => {
      if (controller.signal.aborted) return

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value.data?.data || statsResult.value.data || {})
      }
      if (consignmentsResult.status === 'fulfilled') {
        setConsignments(getList(consignmentsResult.value, ['bilties', 'consignments']))
      }
      if (recentResult.status === 'fulfilled') {
        const recentBilties = getList(recentResult.value, ['bilties', 'recent_bilties'])
        if (recentBilties.length) setConsignments(recentBilties)
      }
      if (consignorsResult.status === 'fulfilled') {
        setTopConsignors(getList(consignorsResult.value, ['parties', 'top_parties', 'consignors']))
      }
      if (stockResult.status === 'fulfilled') {
        setStock(getList(stockResult.value, ['stock', 'items']))
      }

      const failed = [statsResult, consignmentsResult, recentResult, consignorsResult, stockResult]
        .filter((result) => result.status === 'rejected')
      if (failed.length) setError(getErrorMessage(failed[0].reason))
    }).finally(() => {
      if (!controller.signal.aborted) {
        setLoading(false)
        setRefreshing(false)
      }
    })

    return () => controller.abort()
  }, [branchSlug, navigate, refreshKey])

  async function handleTrack(event) {
    event.preventDefault()
    if (!trackNumber.trim() || !branch?.id) return
    setTrackError('')
    setTrackResult(null)
    try {
      const response = await api.get('/consignments/track', {
        params: { lr_no: trackNumber.trim(), branch_id: branch.id }
      })
      setTrackResult(response.data?.data || response.data)
    } catch (requestError) {
      setTrackError(getErrorMessage(requestError))
    }
  }

  async function handleCalculate(event) {
    event.preventDefault()
    if (!branch?.id) return
    try {
      const response = await api.post('/rates/calculate', { ...calculator, branch_id: branch.id })
      setCalcResult(response.data)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }

  const branchPath = (path) => `/branch/${branchSlug}${path ? `/${path}` : ''}`
  const recentBilties = consignments.slice(0, 8)
  const stockForType = (item) => {
    const type = String(item.document_type || item.documentType || '').toLowerCase()
    return stock.find((entry) => item.matches.some((match) => type.includes(match)))
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">Loading branch dashboard...</main>
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-xl font-bold text-white shadow-md shadow-blue-500/20">BTC</div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900">{branch?.branch_name || 'Bharat Transport Company'}</h1>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">TMS 6.0 Live</span>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>{branch?.branch_code || branch?.city || 'Branch Dashboard'}</span>
                <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
                <span className="flex items-center gap-1 font-semibold text-emerald-600"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />System Online</span>
              </p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <form onSubmit={handleTrack} className="relative min-w-[220px] flex-1 sm:w-64 sm:flex-none">
              <input
                type="search"
                value={trackNumber}
                onChange={(event) => setTrackNumber(event.target.value)}
                placeholder="Enter LR / Bilty Number..."
                aria-label="Enter LR or bilty number to track"
                className="w-full rounded-lg border border-slate-200 bg-slate-100 py-2 pl-8 pr-16 text-xs transition-all hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <button type="submit" className="absolute right-1 top-1 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700">Track</button>
            </form>
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
              <Building2 className="h-4 w-4 text-slate-500" />
              <select aria-label="Branch" value={branch?.id || ''} disabled className="max-w-40 cursor-pointer bg-transparent focus:outline-none">
                <option value={branch?.id || ''}>{branch?.branch_name || 'Branch'}</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={refreshing}
              title="Refresh branch data"
              aria-label="Refresh branch data"
              className="rounded-lg border border-slate-200 bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold uppercase text-slate-700">AD</div>
              <div className="hidden text-left xl:block">
                <div className="text-xs font-bold leading-tight text-slate-900">Admin</div>
                <div className="text-[10px] font-medium capitalize text-slate-500">Branch</div>
              </div>
              <button type="button" onClick={logout} title="Log out" aria-label="Log out" className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <nav aria-label="Dashboard categories" className="border-t border-slate-100 bg-white">
          <div className="mx-auto max-w-[1600px] overflow-x-auto px-4 py-1">
            <div className="flex min-w-max items-center gap-1">
              {categories.map((category) => {
                const isOpen = activeMenu === category.label
                return (
                  <div
                    key={category.label}
                    className="relative"
                    onMouseEnter={() => setActiveMenu(category.label)}
                    onMouseLeave={() => setActiveMenu(null)}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setActiveMenu(isOpen ? null : category.label)}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-all ${isOpen ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'}`}
                    >
                      {category.label}
                      <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : 'text-slate-400'}`} />
                    </button>
                    {isOpen && (
                      <div className="absolute left-0 top-full z-50 mt-1 max-h-[70vh] w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
                        <div className="mb-1 flex items-center justify-between border-b border-slate-100 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                          <span>{category.label}</span><span className="text-blue-600">{category.items.length} options</span>
                        </div>
                        {category.items.map((item) => item.action === 'calculator' ? (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => { setShowCalculator(true); setActiveMenu(null) }}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Calculator className="h-4 w-4 text-slate-500" />{item.label}
                          </button>
                        ) : (
                          <Link
                            key={item.label}
                            to={branchPath(item.path)}
                            onClick={() => setActiveMenu(null)}
                            className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <FileText className="h-4 w-4 text-slate-500" />{item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 py-5">
        {error && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>}
        {trackError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{trackError}</div>}
        {trackResult && (
          <div role="status" className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <span><strong>LR: {trackResult.lr_no || trackNumber}</strong> · {trackResult.status || trackResult.pod_status || 'Tracking result available'}</span>
            <button type="button" onClick={() => setTrackResult(null)} aria-label="Close tracking result"><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}

        <section aria-label="Quick actions" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-1.5 pl-1 text-xs font-bold uppercase tracking-wider text-slate-500"><Plus className="h-4 w-4 text-blue-600" />Quick Actions:</div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to={branchPath('bilty-entry')} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"><FilePlus className="h-3.5 w-3.5" />+ New Bilty</Link>
            <Link to={branchPath('bill-entry')} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"><FileText className="h-3.5 w-3.5" />+ New Bill</Link>
            <Link to={branchPath('money-receipt')} className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700"><FileText className="h-3.5 w-3.5" />+ Money Receipt</Link>
            <Link to={branchPath('gadi-challan')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"><Truck className="h-3.5 w-3.5" />+ Vehicle Challan</Link>
            <button type="button" onClick={() => setShowCalculator((visible) => !visible)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-200"><Calculator className="h-3.5 w-3.5 text-blue-600" />Freight Calculator</button>
          </div>
        </section>

        {showCalculator && (
          <section className="rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 p-4 text-white shadow-lg">
            <div className="mb-3 flex items-center justify-between border-b border-blue-800 pb-2">
              <h2 className="flex items-center gap-2 text-sm font-bold"><Calculator className="h-5 w-5 text-amber-400" />Freight Calculator</h2>
              <button type="button" onClick={() => setShowCalculator(false)} className="text-xs text-blue-200 hover:text-white">Close</button>
            </div>
            <form onSubmit={handleCalculate} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ['from_city', 'From City'],
                ['to_city', 'To City'],
                ['weight_kg', 'Weight (Kg)'],
                ['packages', 'Packages']
              ].map(([field, label]) => (
                <label key={field} className="text-[11px] font-medium text-blue-200">
                  {label}
                  <input
                    required={field === 'from_city' || field === 'to_city'}
                    type={field === 'weight_kg' || field === 'packages' ? 'number' : 'text'}
                    value={calculator[field]}
                    onChange={(event) => setCalculator((current) => ({ ...current, [field]: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-blue-700 bg-blue-950/60 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </label>
              ))}
              <button type="submit" className="h-[35px] rounded-lg bg-amber-400 px-4 py-2 text-xs font-extrabold text-blue-950 hover:bg-amber-300">Calculate Freight</button>
            </form>
            {calcResult && <p className="mt-3 border-t border-blue-800 pt-3 text-sm text-amber-200">{calcResult.found ? `Estimated freight: ${formatMoney(calcResult.freight)}` : calcResult.error || 'No rate contract found for this route.'}</p>}
          </section>
        )}

        <section aria-label="Branch statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Today's Booking</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FileText className="h-4 w-4" /></span></div>
            <div className="text-2xl font-extrabold leading-tight text-slate-900">{Number(stats.today_lr || 0).toLocaleString('en-IN')} <span className="text-xs font-medium text-slate-500">Bilties</span></div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-600"><span>Today's Revenue:</span><span className="font-bold text-emerald-600">{formatMoney(stats.today_revenue)}</span></div>
          </article>
          <article className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">This Month's Booking</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><TrendingUp className="h-4 w-4" /></span></div>
            <div className="text-2xl font-extrabold leading-tight text-slate-900">{Number(stats.month_lr || 0).toLocaleString('en-IN')} <span className="text-xs font-medium text-slate-500">Bilties</span></div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-600"><span>Month's Revenue:</span><span className="font-bold text-emerald-600">{formatMoney(stats.month_revenue)}</span></div>
          </article>
          <article className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Amount</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><AlertTriangle className="h-4 w-4" /></span></div>
            <div className="text-2xl font-extrabold leading-tight text-rose-600">{formatMoney(stats.pending_amount)}</div>
            <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600">
              <div className="flex justify-between"><span>Pending Bilties:</span><span className="font-bold text-slate-800">{Number(stats.pending_lr || 0).toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span>Total Bills:</span><span className="font-bold text-slate-800">{Number(stats.total_bills || 0).toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span>Total Money Receipts:</span><span className="font-bold text-slate-800">{Number(stats.total_mr || 0).toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span>Total Gadi Challans:</span><span className="font-bold text-slate-800">{Number(stats.total_gadi_challan || 0).toLocaleString('en-IN')}</span></div>
            </div>
          </article>
          <article className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Fleet & Network Status</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><Truck className="h-4 w-4" /></span></div>
            <div className="grid grid-cols-3 gap-2 text-center text-slate-900">
              <div><span className="text-xl font-bold">{Number(stats.active_vehicles || 0).toLocaleString('en-IN')}</span><span className="block text-[10px] text-slate-500">Active Vehicles</span></div>
              <div className="border-x border-slate-200"><span className="text-xl font-bold">{Number(stats.active_drivers || 0).toLocaleString('en-IN')}</span><span className="block text-[10px] text-slate-500">Active Drivers</span></div>
              <div><span className="text-xl font-bold">{Number(stats.total_branches || 1).toLocaleString('en-IN')}</span><span className="block text-[10px] text-slate-500">Branches</span></div>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-600"><span>Pending POD:</span><span className="font-bold text-amber-600">{Number(stats.pending_pod || 0).toLocaleString('en-IN')} Deliveries</span></div>
          </article>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-700"><Boxes className="h-4 w-4 text-indigo-600" />Stationery & Printed Books Stock (Remaining):</h2>
            <Link to={branchPath('stock-report')} className="text-[11px] font-semibold text-blue-600 hover:underline">Stock Management <ChevronRight className="inline h-3 w-3" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stationeryTypes.map((item) => {
              const stockItem = stockForType(item)
              const remaining = Number(stockItem?.remaining_count ?? stockItem?.currentStock ?? 0)
              const total = Number(stockItem?.total_stock ?? stockItem?.totalStock ?? 0)
              const percent = total > 0 ? Math.min(100, Math.max(0, remaining / total * 100)) : 0
              return (
                <div key={item.label} className="rounded-lg border border-slate-200/80 bg-slate-50 p-2 text-center">
                  <div className="text-[11px] font-semibold uppercase text-slate-500">{item.label}</div>
                  <div className="mt-0.5 text-base font-extrabold text-slate-900">{stockItem ? remaining.toLocaleString('en-IN') : '—'} <span className="text-[10px] font-normal text-slate-400">/ {stockItem ? total.toLocaleString('en-IN') : '—'}</span></div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200"><div className={`h-full ${remaining < 50 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${percent}%` }} /></div>
                </div>
              )
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <section className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-bold text-slate-900">Recent Booked Bilties</h2></div>
              <Link to={branchPath('consignments')} className="flex items-center gap-0.5 text-xs font-semibold text-blue-600 hover:underline">View All<ChevronRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs text-slate-600">
                <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <tr><th className="px-3.5 py-2.5">LR No.</th><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Consignor</th><th className="px-3 py-2.5">Consignee</th><th className="px-3 py-2.5 text-right">Total Amount</th><th className="px-3 py-2.5 text-center">Payment</th><th className="px-3 py-2.5 text-center">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentBilties.map((bilty, index) => (
                    <tr key={bilty.id || bilty.lr_no || index} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-3.5 py-2.5 font-bold text-blue-700"><Link to={branchPath(`consignments/${bilty.id || bilty.lr_no}`)}>{bilty.lr_no || '—'}</Link></td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{formatDate(bilty.lr_date)}</td>
                      <td className="max-w-[140px] truncate px-3 py-2.5 font-medium text-slate-800">{bilty.consignor_name || bilty.from_name || '—'}</td>
                      <td className="max-w-[140px] truncate px-3 py-2.5 font-medium text-slate-800">{bilty.consignee_name || bilty.to_name || '—'}</td>
                      <td className="px-3 py-2.5 text-right font-extrabold text-slate-900">{formatMoney(bilty.grand_total || bilty.total_amount)}</td>
                      <td className="px-3 py-2.5 text-center"><span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${String(bilty.payment_status).toLowerCase() === 'paid' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{bilty.payment_status || 'Unpaid'}</span></td>
                      <td className="px-3 py-2.5 text-center"><span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">{bilty.status || 'Booked'}</span></td>
                    </tr>
                  ))}
                  {!recentBilties.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No recent bilties found. Click “+ New Bilty” to create one.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /><h2 className="text-sm font-bold text-slate-900">Top Consignors</h2></div>
              <Link to={branchPath('customer-master')} className="text-xs font-semibold text-blue-600 hover:underline">Party Account <ChevronRight className="inline h-3 w-3" /></Link>
            </div>
            <div className="flex flex-1 flex-col justify-between p-4">
              <div className="space-y-3.5">
                {topConsignors.map((party, index) => {
                  const revenue = Number(party.total_revenue || party.revenue || 0)
                  const maxRevenue = Number(topConsignors[0]?.total_revenue || topConsignors[0]?.revenue || 1)
                  const percent = Math.min(100, Math.round(revenue / maxRevenue * 100))
                  return (
                    <div key={party.id || party.consignor_name || index} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs"><span className="max-w-[180px] truncate font-bold text-slate-800">{index + 1}. {party.consignor_name || party.party_name || party.name || '—'}</span><span className="font-extrabold text-slate-900">{formatMoney(revenue)}</span></div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500"><span>{Number(party.total_bilties || party.bilty_count || 0).toLocaleString('en-IN')} bilties booked</span><span>{percent}% share</span></div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600" style={{ width: `${percent}%` }} /></div>
                    </div>
                  )
                })}
                {!topConsignors.length && <div className="py-8 text-center text-xs text-slate-400">No consignor data available.</div>}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg border-t border-slate-100 bg-slate-50/70 p-2.5 text-[11px] text-slate-600"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" /><span>Branch transactions are securely scoped to this branch.</span><Activity className="ml-auto h-4 w-4 shrink-0 text-blue-600" /></div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-500">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-2 px-4 sm:flex-row">
          <span>© 2026 Bharat Transport Company - All Rights Reserved.</span>
          <div className="flex items-center gap-4 font-medium text-slate-600"><Link to={branchPath('stock-report')} className="hover:text-blue-600">Stock</Link><Link to={branchPath('ledger')} className="hover:text-blue-600">Ledger</Link><button type="button" onClick={logout} className="hover:text-blue-600">Log out</button></div>
        </div>
      </footer>
    </div>
  )
}
