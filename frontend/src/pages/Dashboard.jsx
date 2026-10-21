import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  Wallet
} from 'lucide-react'
import { useAuth } from '../AuthContext'
import { branchAPI, branchPaymentsAPI } from '../api'

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Branch Portal', to: '/branch-portal', icon: Building2 },
  { label: 'Branch Payments', to: '/branch-payments', icon: Wallet },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Settings', to: '/settings', icon: Settings }
]

const numeric = (value) => Number(value || 0)
const formatINR = (value) =>
  `₹${numeric(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

const formatDate = (value) => {
  if (!value) return '—'
  const dateValue = String(value).slice(0, 10)
  const date = new Date(`${dateValue}T00:00:00`)
  return Number.isNaN(date.valueOf())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function Navigation({ mobile = false }) {
  const location = useLocation()

  return (
    <nav className={mobile ? 'flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden' : 'space-y-1'}>
      {navItems.map(({ label, to, icon: Icon }) => {
        const active = location.pathname === to ||
          (to !== '/dashboard' && location.pathname.startsWith(`${to}/`))
        return (
          <Link
            key={label}
            to={to}
            className={mobile
              ? `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${active ? 'bg-blue-700 text-white' : 'bg-white text-slate-600'}`
              : `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
            }
          >
            <Icon size={18} strokeWidth={2} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function MetricCard({ label, value, detail, icon: Icon, tone }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-800 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-800 ring-amber-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200'
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{detail}</p>
        </div>
        <span className={`rounded-xl p-3 ring-1 ${tones[tone]}`}>
          <Icon size={20} />
        </span>
      </div>
    </article>
  )
}

export default function Dashboard() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [branches, setBranches] = useState([])
  const [branchBalances, setBranchBalances] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [summary, setSummary] = useState({
    total_given: 0,
    total_received: 0,
    current_balance: 0
  })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    let active = true
    let requestInFlight = false

    const loadDashboard = async () => {
      if (requestInFlight) return
      requestInFlight = true
      setRefreshing(true)
      try {
        const [branchResponse, summaryResponse, transactionResponse] = await Promise.all([
          branchAPI.getAll(),
          branchPaymentsAPI.getSummary(),
          branchPaymentsAPI.getAll({ limit: 10 })
        ])
        if (!active) return

        const branchRows = Array.isArray(branchResponse.data?.data) ? branchResponse.data.data : []
        const summaryData = summaryResponse.data?.summary || {}
        setBranches(branchRows)
        setSummary(summaryData)
        setBranchBalances(Array.isArray(summaryResponse.data?.branches) ? summaryResponse.data.branches : [])
        setRecentTransactions(Array.isArray(transactionResponse.data?.data) ? transactionResponse.data.data : [])
        setError('')
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.error || 'Dashboard data could not be loaded.')
      } finally {
        if (active) {
          setLoading(false)
          setRefreshing(false)
        }
        requestInFlight = false
      }
    }

    loadDashboard()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadDashboard()
    }, 15000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [refreshVersion])

  const visibleBranches = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return [...branchBalances]
      .filter((branch) => !query || String(branch.branch_name || '').toLocaleLowerCase().includes(query))
      .sort((a, b) => numeric(b.current_balance) - numeric(a.current_balance))
  }, [branchBalances, search])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const displayName = currentUser?.username || currentUser?.full_name || 'Administrator'
  const netPending = numeric(summary.current_balance)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-950 text-white lg:flex">
        <div className="border-b border-slate-800 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 font-extrabold">BT</div>
            <div>
              <p className="font-bold leading-tight">Bharat Transport</p>
              <p className="mt-1 text-xs text-slate-400">Company operations</p>
            </div>
          </div>
        </div>
        <div className="flex-1 px-4 py-6">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
          <Navigation />
        </div>
        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 px-3">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="mt-1 text-xs capitalize text-slate-400">{currentUser?.role || 'Admin'}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Operations</p>
              <h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Admin dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-right sm:block">
                <span className="block text-sm font-semibold text-slate-800">{displayName}</span>
                <span className="block text-xs capitalize text-slate-500">{currentUser?.role || 'Admin'}</span>
              </span>
              <button
                type="button"
                onClick={() => setRefreshVersion((version) => version + 1)}
                disabled={refreshing}
                aria-label="Refresh dashboard data"
                className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50 lg:hidden"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
          <Navigation mobile />
        </header>

        <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:space-y-8 lg:p-8">
          <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Branch payments at a glance</h2>
              <p className="mt-1 text-sm text-slate-500">Balances and recent activity across your branches.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Auto-refreshes every 15 seconds
            </div>
          </section>

          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4" aria-label="Company KPIs">
            <MetricCard
              label="Total branches"
              value={loading ? '—' : branches.length.toLocaleString('en-IN')}
              detail="Active branch locations"
              icon={Building2}
              tone="slate"
            />
            <MetricCard
              label="Total payment given"
              value={formatINR(summary.total_given)}
              detail="Funds sent to branches"
              icon={ArrowUpRight}
              tone="blue"
            />
            <MetricCard
              label="Total payment received"
              value={formatINR(summary.total_received)}
              detail="Funds returned to admin"
              icon={ArrowDownLeft}
              tone="green"
            />
            <MetricCard
              label="Net pending with branches"
              value={formatINR(summary.current_balance)}
              detail={netPending >= 0 ? 'Pending cash held by branches' : 'Net amount returned in excess'}
              icon={Wallet}
              tone="amber"
            />
          </section>

          <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
            <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">Branch-wise pending</h2>
                  <p className="mt-1 text-sm text-slate-500">Given, received, and current balance by location.</p>
                </div>
                <label className="relative block w-full sm:max-w-xs">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search branch"
                    className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[620px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">Branch</th>
                      <th className="px-5 py-3 text-right font-bold">Total given</th>
                      <th className="px-5 py-3 text-right font-bold">Total received</th>
                      <th className="px-5 py-3 text-right font-bold">Pending balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleBranches.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-5 py-12 text-center text-slate-500">
                          {loading ? 'Loading branch balances…' : 'No matching branch balances.'}
                        </td>
                      </tr>
                    ) : visibleBranches.map((branch) => {
                      const balance = numeric(branch.current_balance)
                      return (
                        <tr key={branch.id} className="hover:bg-slate-50/80">
                          <td className="px-5 py-4">
                            <Link
                              to={`/branch-payments?branch_id=${branch.id}`}
                              className="group inline-flex items-center gap-2 font-semibold text-slate-900 hover:text-blue-700"
                            >
                              <span>{branch.branch_name}</span>
                              <ChevronRight size={15} className="text-slate-400 transition group-hover:translate-x-0.5" />
                            </Link>
                            <p className="mt-1 text-xs text-slate-500">{branch.branch_code || 'Branch'}</p>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-right text-slate-700">{formatINR(branch.total_given)}</td>
                          <td className="whitespace-nowrap px-5 py-4 text-right text-emerald-700">{formatINR(branch.total_received)}</td>
                          <td className={`whitespace-nowrap px-5 py-4 text-right font-bold ${balance > 0 ? 'text-amber-800' : balance < 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                            {formatINR(branch.current_balance)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end border-t border-slate-100 px-5 py-3">
                <Link to="/branch-payments" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900">
                  Open full ledger <ChevronRight size={16} />
                </Link>
              </div>
            </article>

            <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
                <div>
                  <h2 className="font-bold text-slate-900">Recent transactions</h2>
                  <p className="mt-1 text-sm text-slate-500">Latest branch payment activity.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  Last 10
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {recentTransactions.length === 0 ? (
                  <div className="px-5 py-12 text-center text-sm text-slate-500">
                    {loading ? 'Loading recent transactions…' : 'No branch payments recorded yet.'}
                  </div>
                ) : recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        transaction.type === 'given' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {transaction.type === 'given' ? <ArrowUpRight size={19} /> : <ArrowDownLeft size={19} />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{transaction.branch_name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {transaction.type === 'given' ? 'Given to branch' : 'Received from branch'} · {formatDate(transaction.date)} · {transaction.payment_mode}
                        </p>
                      </div>
                    </div>
                    <p className={`shrink-0 text-sm font-extrabold ${transaction.type === 'given' ? 'text-blue-800' : 'text-emerald-800'}`}>
                      {transaction.type === 'given' ? '−' : '+'}{formatINR(transaction.amount)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end border-t border-slate-100 px-5 py-3">
                <Link to="/branch-payments" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900">
                  View all transactions <ChevronRight size={16} />
                </Link>
              </div>
            </article>
          </section>

          <footer className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>Bharat Transport • Branch accounts</span>
            <span>{refreshing ? 'Syncing latest figures…' : 'Financial totals update automatically.'}</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
