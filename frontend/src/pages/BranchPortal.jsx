import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import { BRANCH_MODULES } from '../components/branchModules'
import { formatDate } from '../utils/dateFormatter'

const moduleCategories = {
  '': 'Bilty & Consignment',
  'bilty-entry': 'Bilty & Consignment',
  consignments: 'Bilty & Consignment',
  'bilty-print': 'Bilty & Consignment',
  'bill-entry': 'Billing',
  'bill-list': 'Billing',
  'bill-print': 'Billing',
  'money-receipt': 'Billing',
  payment: 'Billing',
  'gadi-challan': 'Vehicle & Movement',
  'gate-pass': 'Vehicle & Movement',
  drivers: 'Vehicle & Movement',
  vehicles: 'Vehicle & Movement',
  'diesel-entry': 'Vehicle & Movement',
  tyre: 'Vehicle & Movement',
  'branch-transfer': 'Vehicle & Movement',
  tracking: 'Vehicle & Movement',
  'challan-payment': 'Vehicle & Movement',
  pod: 'POD & Delivery',
  'pod-list': 'POD & Delivery',
  'stock-report': 'Masters & Stock',
  'stock-entry': 'Masters & Stock',
  customers: 'Masters & Stock',
  suppliers: 'Masters & Stock',
  'rate-master': 'Masters & Stock',
  'city-master': 'Masters & Stock',
  commission: 'Reports & Accounts',
  'commission-report': 'Reports & Accounts',
  'diesel-report': 'Reports & Accounts',
  expense: 'Reports & Accounts',
  income: 'Reports & Accounts',
  'cash-book': 'Reports & Accounts',
  ledger: 'Reports & Accounts',
  gst: 'Reports & Accounts',
  tds: 'Reports & Accounts',
  'topay-report': 'Reports & Accounts',
  outstanding: 'Reports & Accounts',
  'profit-loss': 'Reports & Accounts',
  notifications: 'Settings',
  support: 'Settings'
}

const moduleCategoriesList = [
  'All',
  'Bilty & Consignment',
  'Billing',
  'Vehicle & Movement',
  'POD & Delivery',
  'Masters & Stock',
  'Reports & Accounts',
  'Settings'
]

export default function BranchPortal() {
  const { branchSlug } = useParams()
  const navigate = useNavigate()
  const [branch, setBranch] = useState(null)
  const [stats, setStats] = useState(null)
  const [consignments, setConsignments] = useState([])
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [moduleSearch, setModuleSearch] = useState('')

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

    if (!session?.token || session.branch?.url_slug !== branchSlug) {
      localStorage.removeItem('branch_session')
      navigate(`/branch-login/${branchSlug}`, { replace: true })
      return () => controller.abort()
    }

    setBranch(session.branch)
    setLoading(true)
    setError('')
    Promise.all([
      api.get('/dashboard/stats', { signal: controller.signal }),
      api.get('/consignments', { signal: controller.signal }),
      api.get('/bills', { signal: controller.signal })
    ]).then(([statsResponse, consignmentResponse, billResponse]) => {
      setStats(statsResponse.data)
      setConsignments(consignmentResponse.data?.data || [])
      setBills(billResponse.data?.data || [])
    }).catch((requestError) => {
      if (controller.signal.aborted) return
      setError(requestError.response?.data?.error || requestError.message || 'Unable to load branch records.')
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })

    return () => controller.abort()
  }, [branchSlug, navigate])

  const visibleModules = useMemo(() => {
    const query = moduleSearch.trim().toLowerCase()
    return BRANCH_MODULES.filter((module) => {
      const matchesCategory = activeCategory === 'All' || moduleCategories[module.path] === activeCategory
      return matchesCategory && (!query || module.label.toLowerCase().includes(query))
    })
  }, [activeCategory, moduleSearch])

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600">Loading branch workspace...</main>
  }

  const cards = [
    { label: 'Bilties', value: stats?.total_lr ?? consignments.length, path: 'consignments' },
    { label: 'Bills', value: stats?.total_bills ?? bills.length, path: 'bill-list' },
    { label: 'Pending POD', value: stats?.pending_pod ?? '—', path: 'pod-list' },
    { label: 'Outstanding', value: `₹${Number(stats?.pending_amount || 0).toLocaleString('en-IN')}`, path: 'outstanding' }
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-2xl bg-gradient-to-r from-blue-950 to-blue-800 p-6 text-white shadow-lg sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-200">Branch Dashboard</p>
            <h1 className="mt-2 text-3xl font-extrabold">{branch?.branch_name}</h1>
            <p className="mt-1 text-sm text-blue-100">{[branch?.city, branch?.state].filter(Boolean).join(', ') || branch?.branch_code}</p>
          </div>
          <button type="button" onClick={logout} className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold hover:bg-white/10">
            Log out
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label="Branch summary">
        {cards.map((card) => (
          <Link key={card.label} to={`/branch/${branchSlug}/${card.path}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-blue-950">{card.value}</p>
          </Link>
        ))}
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Branch Software</h2>
            <p className="mt-1 text-sm text-slate-500">Choose a module to open its workspace.</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={moduleSearch}
              onChange={(event) => setModuleSearch(event.target.value)}
              placeholder="Search module..."
              aria-label="Search modules"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 sm:w-56"
            />
            <span className="shrink-0 text-sm font-semibold text-blue-800">{visibleModules.length} modules</span>
          </div>
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Module categories">
          {moduleCategoriesList.map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={activeCategory === category}
              onClick={() => setActiveCategory(category)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                activeCategory === category
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-800'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {visibleModules.map((module) => (
            <Link
              key={module.path || 'dashboard'}
              to={module.path ? `/branch/${branchSlug}/${module.path}` : `/branch/${branchSlug}`}
              className="group flex min-h-28 flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md"
            >
              <span className="text-2xl" aria-hidden="true">{module.icon}</span>
              <span className="mt-3 text-sm font-semibold text-slate-800 group-hover:text-blue-800">{module.label}</span>
            </Link>
          ))}
          {!visibleModules.length && (
            <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No modules found.
            </p>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-900">Recent Bilties</h2>
            <Link to={`/branch/${branchSlug}/consignments`} className="text-sm font-semibold text-blue-700 hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="px-5 py-3">LR No.</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Consignor</th><th className="px-5 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {consignments.slice(0, 8).map((row) => (
                  <tr key={row.id} className="text-slate-700">
                    <td className="px-5 py-3 font-semibold">{row.lr_no}</td>
                    <td className="px-5 py-3">{formatDate(row.lr_date)}</td>
                    <td className="px-5 py-3">{row.consignor_name || row.from_name || '—'}</td>
                    <td className="px-5 py-3">{row.status || '—'}</td>
                  </tr>
                ))}
                {!consignments.length && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">No bilties found for this branch.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-900">Recent Bills</h2>
            <Link to={`/branch/${branchSlug}/bill-list`} className="text-sm font-semibold text-blue-700 hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="px-5 py-3">Bill No.</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Party</th><th className="px-5 py-3">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.slice(0, 8).map((row) => (
                  <tr key={row.id} className="text-slate-700">
                    <td className="px-5 py-3 font-semibold">{row.bill_no}</td>
                    <td className="px-5 py-3">{formatDate(row.bill_date)}</td>
                    <td className="px-5 py-3">{row.party_name || '—'}</td>
                    <td className="px-5 py-3">₹{Number(row.grand_total || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {!bills.length && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">No bills found for this branch.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
