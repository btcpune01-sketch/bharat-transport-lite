import { useEffect, useMemo, useState } from 'react'
import api from '../api'

const SMALL_PENDING_THRESHOLD = 1000

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export default function BranchPaymentStatus() {
  const [branches, setBranches] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    api.get('/admin/branch-payment-status')
      .then(({ data }) => {
        if (!active) return
        if (!Array.isArray(data?.branches)) {
          throw new Error('The server returned an invalid branch payment status.')
        }
        setBranches(data.branches)
        setError('')
      })
      .catch((requestError) => {
        if (!active) return
        console.error('Branch payment status load failed:', requestError)
        setError(requestError.response?.data?.error || requestError.message || 'Unable to load branch payment status.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const filteredBranches = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return branches
    return branches.filter((branch) => String(branch.branchName || '').toLocaleLowerCase().includes(query))
  }, [branches, search])

  return (
    <section aria-labelledby="branch-payment-status-title" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="branch-payment-status-title" className="text-base font-bold text-slate-900">Branch Payment Status</h2>
          <p className="mt-1 text-xs text-slate-500">Sent and received payment totals for each branch</p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search branches..."
          aria-label="Search branch payment status by branch name"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-64"
        />
      </div>

      {loading ? (
        <p role="status" className="py-6 text-center text-sm text-slate-500">Loading branch payment status...</p>
      ) : error ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : filteredBranches.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          {branches.length === 0 ? 'No payment records found.' : 'No branches match your search.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-3">Branch</th>
                <th className="p-3">Branch ID</th>
                <th className="p-3 text-right">Total Sent</th>
                <th className="p-3 text-right">Total Received</th>
                <th className="p-3 text-right">Net Balance</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBranches.map((branch) => {
                const netBalance = Number(branch.netBalance || 0)
                const balanced = branch.status === 'balanced' || Math.abs(netBalance) <= 0.005
                const smallPending = !balanced && Math.abs(netBalance) <= SMALL_PENDING_THRESHOLD
                const statusClass = balanced
                  ? 'bg-green-100 text-green-800'
                  : smallPending
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'

                return (
                  <tr key={branch.branchId} className="hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-900">{branch.branchName}</td>
                    <td className="p-3 text-slate-600">{branch.branchId}</td>
                    <td className="p-3 text-right">{formatCurrency(branch.totalSent)}</td>
                    <td className="p-3 text-right">{formatCurrency(branch.totalReceived)}</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(netBalance)}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
                        {balanced ? 'Balanced' : smallPending ? 'Small pending' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
