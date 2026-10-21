import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { dashboardAPI, branchAPI } from '../api'

const groups = [
  { title: 'Dashboard APIs', items: [['getDashboardStats', 'All KPI statistics', '/dashboard/stats'], ['getRecentActivities', 'Recent bilties, MR and claims', '/dashboard/recent'], ['getTopParties', 'Top 5 parties by revenue', '/dashboard/top-parties']] },
  { title: 'Dashboard Stats', items: [['getTodayLR', 'today_lr — Today LR count'], ['getMonthLR', 'month_lr — Monthly LR count'], ['getTotalLR', 'total_lr — Total LR count'], ['getPendingLR', 'pending_lr — Pending/In-transit LR'], ['getPaidLR', 'paid_lr — Paid LR count'], ['getTotalBills', 'total_bills — Total bills'], ['getPendingBills', 'pending_bills — Unpaid bills'], ['getTotalMR', 'total_mr — Money receipts'], ['getTotalParties', 'total_parties — Total parties'], ['getTotalCustomers', 'total_customers — Total customers'], ['getTotalRevenue', 'total_revenue — Paid revenue'], ['getPendingAmount', 'pending_amount — Pending amount'], ['getPendingPOD', 'pending_pod — Pending POD'], ['getActiveDrivers', 'active_drivers — Active drivers'], ['getActiveVehicles', 'active_vehicles — Active vehicles'], ['getOpenClaims', 'open_claims — Open claims'], ['getTodayExpenses', 'today_expenses — Today expenses'], ['getTotalBranches', 'total_branches — Branch count'], ['getTodayRevenue', 'today_revenue — Today revenue'], ['getMonthRevenue', 'month_revenue — Monthly revenue']] },
  { title: 'Recent Activities', items: [['getRecentBilties', 'Last 5 bilties'], ['getRecentMR', 'Last 5 money receipts'], ['getRecentClaims', 'Last 3 claims']] },
  { title: 'Branch Management', items: [['getAllBranches', 'All branches', '/branch-portal'], ['getBranchSummary', 'Branch payment summary', '/branch-payments'], ['getBranchPayments', 'Branch transactions', '/branch-payments'], ['createBranchPayment', 'Record branch payment', '/branch-payments'], ['getBranchLedger', 'Auto-calculated ledger', '/ledger']] },
  { title: 'Consignment / Bilty', items: [['getAllConsignments', 'All bilties', '/consignments'], ['createConsignment', 'Create new bilty', '/consignments/new'], ['generateBiltyNo', 'Auto-generate LR number', '/consignments/new'], ['getConsignmentsByBranch', 'Branch-wise bilties', '/consignments'], ['searchConsignments', 'Search by LR number', '/consignments']] },
  { title: 'Billing & Payment', items: [['getAllBills', 'All bills', '/bills'], ['createBill', 'Create new bill', '/bill-entry'], ['getAllMoneyReceipts', 'All money receipts', '/mr'], ['createMoneyReceipt', 'Create money receipt', '/mr/create'], ['getPartyLedger', 'Party-wise ledger', '/ledger']] },
  { title: 'Master Data', items: [['getAllParties', 'All parties', '/party'], ['getAllDrivers', 'All drivers', '/drivers'], ['getAllVehicles', 'All vehicles', '/vehicles'], ['getAllCustomers', 'All customers', '/customers'], ['getDashboardUserRole', 'Role-based access control', '/settings']] }
]

const statKeys = { getTodayLR: 'today_lr', getMonthLR: 'month_lr', getTotalLR: 'total_lr', getPendingLR: 'pending_lr', getPaidLR: 'paid_lr', getTotalBills: 'total_bills', getPendingBills: 'pending_bills', getTotalMR: 'total_mr', getTotalParties: 'total_parties', getTotalCustomers: 'total_customers', getTotalRevenue: 'total_revenue', getPendingAmount: 'pending_amount', getPendingPOD: 'pending_pod', getActiveDrivers: 'active_drivers', getActiveVehicles: 'active_vehicles', getOpenClaims: 'open_claims', getTodayExpenses: 'today_expenses', getTotalBranches: 'total_branches', getTodayRevenue: 'today_revenue', getMonthRevenue: 'month_revenue' }
const allItems = groups.flatMap((group) => group.items.map(([name, description, path]) => ({ name, description, path })))
const number = (value) => Number(value || 0)
const inr = (value) => `₹${number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const statValue = (stats, name) => { const key = statKeys[name]; if (!key) return null; const value = stats?.[key]; return ['total_revenue', 'pending_amount', 'today_expenses', 'today_revenue', 'month_revenue'].includes(key) ? inr(value) : number(value).toLocaleString('en-IN') }

export default function BranchDashboard() {
  const { branchCode } = useParams()
  const navigate = useNavigate()
  const [stats, setStats] = useState({})
  const [recent, setRecent] = useState({})
  const [topParties, setTopParties] = useState([])
  const [branches, setBranches] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.allSettled([dashboardAPI.getStats(), dashboardAPI.recentBilties(), dashboardAPI.topParties(), branchAPI.getAll()]).then((results) => {
      if (!active) return
      const [statsResult, recentResult, partiesResult, branchesResult] = results
      if (statsResult.status === 'fulfilled') setStats(statsResult.value.data || {})
      if (recentResult.status === 'fulfilled') setRecent(recentResult.value.data || {})
      if (partiesResult.status === 'fulfilled') { const data = partiesResult.value.data || {}; setTopParties(Array.isArray(data) ? data : (data.data || data.parties || [])) }
      if (branchesResult.status === 'fulfilled') { const data = branchesResult.value.data || {}; setBranches(Array.isArray(data) ? data : (data.data || [])) }
      if (results.every((result) => result.status === 'rejected')) setError('Dashboard data could not be loaded.')
      setLoading(false)
    })
    return () => { active = false }
  }, [branchCode])

  const visibleItems = useMemo(() => { const query = search.trim().toLowerCase(); return allItems.filter((item) => !query || `${item.name} ${item.description}`.toLowerCase().includes(query)) }, [search])
  const recentBilties = recent.bilties || recent.recent_bilties || []
  const recentMR = recent.mr || recent.money_receipts || recent.recent_mr || []
  const recentClaims = recent.claims || recent.recent_claims || []

  if (loading) return <div className="min-h-screen bg-slate-50 p-8 text-center font-semibold">Loading dashboard data…</div>

  return <div className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6">
    <header className="mb-6 flex flex-col gap-4 rounded-2xl bg-slate-950 p-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Bharat Transport</p><h1 className="mt-1 text-2xl font-extrabold">Dashboard Overview</h1><p className="mt-1 text-sm text-slate-300">Branch: {branchCode || 'Company'} · 46 functions connected</p></div><button type="button" onClick={() => navigate('/dashboard')} className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-blue-50">Back to Dashboard</button></header>
    {error && <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error} Existing bills and bilties were not changed.</div>}
    <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">{['getTodayLR', 'getMonthLR', 'getTotalLR', 'getPendingLR', 'getPaidLR', 'getTotalRevenue', 'getPendingAmount'].map((name) => <div key={name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">{name.replace('get', '')}</p><p className="mt-2 text-xl font-extrabold">{statValue(stats, name) ?? '—'}</p></div>)}</section>
    <div className="mb-6 grid gap-6 lg:grid-cols-3"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">All Dashboard Functions (46)</h2><p className="text-sm text-slate-500">All Discord functions are listed without changing existing data.</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search functions…" className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" /></div><div className="space-y-5">{groups.map((group) => { const items = group.items.map(([name, description, path]) => ({ name, description, path })).filter((item) => visibleItems.some((visible) => visible.name === item.name)); return <div key={group.title}><h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-blue-700">{group.title} <span className="text-slate-400">({items.length})</span></h3><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <button key={item.name} type="button" onClick={() => item.path && navigate(item.path)} disabled={!item.path} className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-default disabled:hover:border-slate-200 disabled:hover:bg-white"><p className="text-sm font-bold">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.description}</p>{statValue(stats, item.name) !== null && <p className="mt-2 text-lg font-extrabold text-blue-700">{statValue(stats, item.name)}</p>}</button>)}</div></div>})}</div></section><aside className="space-y-6"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-3 font-bold">Recent Activities</h2><p className="text-sm text-slate-600">Bilties: <b>{recentBilties.length}</b></p><p className="text-sm text-slate-600">Money receipts: <b>{recentMR.length}</b></p><p className="text-sm text-slate-600">Claims: <b>{recentClaims.length}</b></p></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-3 font-bold">Top Parties</h2>{topParties.slice(0, 5).map((party, index) => <div key={party.id || party.party_id || index} className="flex justify-between border-b border-slate-100 py-2 text-sm"><span>{party.name || party.party_name || party.customer_name || 'Party'}</span><b>{inr(party.revenue || party.total_revenue || party.amount)}</b></div>)}{topParties.length === 0 && <p className="text-sm text-slate-500">No party data available.</p>}</section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-3 font-bold">Branch Summary</h2><p className="text-sm text-slate-600">Total branches: <b>{branches.length || statValue(stats, 'getTotalBranches') || 0}</b></p><button type="button" onClick={() => navigate('/branch-portal')} className="mt-3 rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800">Open Branches</button></section></aside></div>
  </div>
}
