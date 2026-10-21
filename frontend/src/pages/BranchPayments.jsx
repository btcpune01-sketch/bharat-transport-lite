import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { branchAPI, branchPaymentsAPI } from '../api'

const initialDate = () => {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

const amount = (value) => Number(value || 0)
const formatINR = (value) =>
  `₹${amount(value).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.valueOf())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getSavedBranchName(fallback) {
  try {
    const session = JSON.parse(localStorage.getItem('branch_session') || 'null')
    return session?.branch?.branch_name || fallback || 'Your branch'
  } catch {
    return fallback || 'Your branch'
  }
}

function SummaryCard({ label, value, detail, tone }) {
  const tones = {
    blue: 'border-blue-100 bg-blue-50 text-blue-950',
    green: 'border-emerald-100 bg-emerald-50 text-emerald-950',
    amber: 'border-amber-100 bg-amber-50 text-amber-950'
  }

  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className="text-sm font-semibold opacity-70">{label}</p>
      <p className="mt-3 text-2xl font-extrabold tracking-tight">{formatINR(value)}</p>
      <p className="mt-2 text-xs font-medium opacity-70">{detail}</p>
    </article>
  )
}

export default function BranchPayments({ branchMode = false, branchCode }) {
  const [searchParams] = useSearchParams()
  const [branches, setBranches] = useState([])
  const [selectedBranchId, setSelectedBranchId] = useState(
    () => searchParams.get('branch_id') || ''
  )
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({
    total_given: 0,
    total_received: 0,
    current_balance: 0
  })
  const [activeTab, setActiveTab] = useState(branchMode ? 'received' : 'given')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [form, setForm] = useState(() => ({
    branch_id: searchParams.get('branch_id') || '',
    date: initialDate(),
    amount: '',
    payment_mode: 'Cash',
    notes: ''
  }))

  const branchName = useMemo(() => getSavedBranchName(branchCode), [branchCode])

  useEffect(() => {
    if (branchMode) return undefined

    let active = true
    branchAPI.getAll()
      .then((response) => {
        if (active) setBranches(Array.isArray(response.data?.data) ? response.data.data : [])
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.error || 'Could not load branches.')
      })

    return () => { active = false }
  }, [branchMode])

  useEffect(() => {
    let active = true
    const params = !branchMode && selectedBranchId ? { branch_id: selectedBranchId } : {}

    const loadLedger = async () => {
      try {
        const [summaryResponse, transactionsResponse] = await Promise.all([
          branchPaymentsAPI.getSummary(params),
          branchPaymentsAPI.getAll({ ...params, limit: 500 })
        ])
        if (!active) return
        setSummary(summaryResponse.data?.summary || {
          total_given: 0,
          total_received: 0,
          current_balance: 0
        })
        setTransactions(Array.isArray(transactionsResponse.data?.data) ? transactionsResponse.data.data : [])
        setError('')
      } catch (requestError) {
        if (active) {
          setError(requestError.response?.data?.error || 'Could not load the branch payment ledger.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadLedger()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadLedger()
    }, 8000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [branchMode, selectedBranchId, refreshVersion])

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return transactions
    return transactions.filter((transaction) =>
      String(transaction.branch_name || '').toLocaleLowerCase().includes(query)
    )
  }, [transactions, search])

  const selectedBranch = branches.find((branch) => String(branch.id) === String(selectedBranchId))
  const balance = amount(summary.current_balance)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!branchMode && !form.branch_id) {
      setError('Select a branch before saving the payment.')
      return
    }

    setSaving(true)
    try {
      await branchPaymentsAPI.create({
        branch_id: branchMode ? undefined : form.branch_id,
        date: form.date,
        amount: form.amount,
        type: activeTab,
        payment_mode: form.payment_mode,
        notes: form.notes
      })
      setNotice(activeTab === 'given' ? 'Payment given to the branch was recorded.' : 'Returned payment was recorded.')
      setForm((current) => ({
        ...current,
        date: initialDate(),
        amount: '',
        notes: ''
      }))
      setRefreshVersion((version) => version + 1)
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not save the payment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1440px] space-y-6 bg-slate-50 p-4 text-slate-900 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Accounts • Branches</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Branch payment ledger</h1>
          <p className="mt-2 text-sm text-slate-500">
            Track funds sent to branches and payments returned to admin.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Auto-sync every 8 seconds
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Payment summary">
        <SummaryCard
          label="Total given"
          value={summary.total_given}
          detail="Payments sent from admin to branches"
          tone="blue"
        />
        <SummaryCard
          label="Total received"
          value={summary.total_received}
          detail="Payments returned by branches"
          tone="green"
        />
        <SummaryCard
          label="Net pending balance"
          value={summary.current_balance}
          detail={balance >= 0 ? 'Currently pending with branches' : 'More has been returned than sent'}
          tone="amber"
        />
      </section>

      {selectedBranch && !branchMode && (
        <div className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          <span className="font-bold text-slate-900">{selectedBranch.branch_name}:</span>{' '}
          {balance > 0
            ? `${formatINR(balance)} ${selectedBranch.branch_name} Branch ke paas pending hai.`
            : balance < 0
              ? `Branch ne ${formatINR(Math.abs(balance))} extra return kiya hai.`
              : 'Branch ka balance settled hai.'}
        </div>
      )}
      {branchMode && (
        <div className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          <span className="font-bold text-slate-900">{branchName}:</span>{' '}
          {balance > 0
            ? `${formatINR(balance)} ${branchName} Branch ke paas pending hai.`
            : balance < 0
              ? `Branch ne ${formatINR(Math.abs(balance))} extra return kiya hai.`
              : 'Branch ka balance settled hai.'}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">New entry</p>
            <h2 className="mt-1 text-lg font-bold">
              {activeTab === 'given' ? 'Give payment to branch' : 'Receive payment from branch'}
            </h2>
          </div>

          {!branchMode && (
            <div className="flex gap-2 border-b border-slate-100 px-5 pt-4">
              <button
                type="button"
                onClick={() => setActiveTab('given')}
                aria-pressed={activeTab === 'given'}
                className={`rounded-t-lg px-3 py-2 text-sm font-semibold transition ${
                  activeTab === 'given'
                    ? 'border-b-2 border-blue-700 text-blue-800'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Give to branch
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('received')}
                aria-pressed={activeTab === 'received'}
                className={`rounded-t-lg px-3 py-2 text-sm font-semibold transition ${
                  activeTab === 'received'
                    ? 'border-b-2 border-emerald-700 text-emerald-800'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Receive from branch
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            {branchMode ? (
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Branch</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800">
                  {branchName}
                </div>
                <p className="mt-1 text-xs text-slate-500">This entry is tied to your signed-in branch.</p>
              </div>
            ) : (
              <div>
                <label htmlFor="payment-branch" className="mb-1 block text-sm font-semibold text-slate-700">
                  Branch
                </label>
                <select
                  id="payment-branch"
                  required
                  value={form.branch_id}
                  onChange={(event) => setForm((current) => ({ ...current, branch_id: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select a branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.branch_name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="payment-date" className="mb-1 block text-sm font-semibold text-slate-700">Date</label>
                <input
                  id="payment-date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label htmlFor="payment-amount" className="mb-1 block text-sm font-semibold text-slate-700">Amount (₹)</label>
                <input
                  id="payment-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="payment-mode" className="mb-1 block text-sm font-semibold text-slate-700">Payment mode</label>
              <select
                id="payment-mode"
                value={form.payment_mode}
                onChange={(event) => setForm((current) => ({ ...current, payment_mode: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank">Bank</option>
              </select>
            </div>

            <div>
              <label htmlFor="payment-notes" className="mb-1 block text-sm font-semibold text-slate-700">Notes</label>
              <textarea
                id="payment-notes"
                rows="3"
                maxLength="1000"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Reference, purpose, or other details"
                className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={saving || (!branchMode && branches.length === 0)}
              className={`w-full rounded-lg px-4 py-3 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                activeTab === 'given' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {saving ? 'Saving…' : activeTab === 'given' ? 'Record payment given' : 'Record payment received'}
            </button>
          </form>
        </article>

        <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Activity</p>
              <h2 className="mt-1 text-lg font-bold">Transaction ledger</h2>
              <p className="mt-1 text-xs text-slate-500">
                {loading ? 'Loading records…' : `${filteredTransactions.length} records shown`}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {!branchMode && (
                <select
                  aria-label="Filter ledger by branch"
                  value={selectedBranchId}
                  onChange={(event) => setSelectedBranchId(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">All branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.branch_name}</option>
                  ))}
                </select>
              )}
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search branch name"
                aria-label="Search branch name"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Date</th>
                  <th className="px-4 py-3 font-bold">Branch</th>
                  <th className="px-4 py-3 text-right font-bold">Given</th>
                  <th className="px-4 py-3 text-right font-bold">Received</th>
                  <th className="px-4 py-3 text-right font-bold">Balance after</th>
                  <th className="px-4 py-3 font-bold">Mode</th>
                  <th className="px-4 py-3 font-bold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-slate-500">
                      {loading ? 'Loading transactions…' : 'No branch payments found for this filter.'}
                    </td>
                  </tr>
                ) : filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(transaction.date)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">{transaction.branch_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-rose-700">
                      {transaction.type === 'given' ? formatINR(transaction.amount) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-700">
                      {transaction.type === 'received' ? formatINR(transaction.amount) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-800">
                      {formatINR(transaction.balance_after_transaction)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {transaction.payment_mode}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-slate-600">
                      <span className="block truncate" title={transaction.notes || ''}>{transaction.notes || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  )
}
