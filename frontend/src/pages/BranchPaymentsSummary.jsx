import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function BranchPaymentsSummary() {
  const [summary, setSummary] = useState(null)
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [localStorageMode, setLocalStorageMode] = useState(false)

  useEffect(() => {
    let cancelled = false

    api.get('/branch-payments/summary')
      .then(({ data }) => {
        if (cancelled) return
        setSummary(data.summary || { total_given: 0, total_received: 0, current_balance: 0 })
        setBranches(data.branches || [])
        setLocalStorageMode(data.message === 'Running in LocalStorage Mode')
      })
      .catch((requestError) => {
        if (cancelled) return
        console.error('Branch payment summary fetch error:', requestError)
        setError(requestError.response?.data?.error || 'Unable to load branch payment summary.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

  return (
    <main className="min-h-screen bg-white p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Branch Payment Summary</h1>
          <Link to="/branch-payments" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
            View Payments
          </Link>
        </div>

        {loading && <p role="status" className="text-slate-600">Loading branch payment summary...</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}

        {!loading && !error && summary && (
          <>
            {localStorageMode && (
              <p className="mb-4 rounded-lg bg-amber-50 p-4 text-amber-800" role="status">
                No Data - 0. Running in LocalStorage Mode; branch payment records are not available without a database.
              </p>
            )}
            <section className="mb-6 grid gap-4 md:grid-cols-3">
              {[
                ['Total Given', summary.total_given],
                ['Total Received', summary.total_received],
                ['Current Balance', summary.current_balance]
              ].map(([label, amount]) => (
                <article key={label} className="rounded-xl bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-medium text-slate-500">{label}</h2>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(amount)}</p>
                </article>
              ))}
            </section>

            <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3">Branch</th>
                    <th className="p-3">Code</th>
                    <th className="p-3 text-right">Total Given</th>
                    <th className="p-3 text-right">Total Received</th>
                    <th className="p-3 text-right">Current Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branches.map((branch) => (
                    <tr key={branch.id}>
                      <td className="p-3 font-medium text-slate-900">{branch.branch_name}</td>
                      <td className="p-3 text-slate-600">{branch.branch_code}</td>
                      <td className="p-3 text-right">{formatCurrency(branch.total_given)}</td>
                      <td className="p-3 text-right">{formatCurrency(branch.total_received)}</td>
                      <td className="p-3 text-right">{formatCurrency(branch.current_balance)}</td>
                    </tr>
                  ))}
                  {branches.length === 0 && (
                    <tr><td className="p-4 text-center text-slate-500" colSpan="5">No branch balances found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
