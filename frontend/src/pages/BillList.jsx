import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { formatDate } from '../utils/dateFormatter'

export default function BillList({ branchMode = false, branchCode }) {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [totalBills, setTotalBills] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const requestSequence = useRef(0)
  const navigate = useNavigate()

  const branchPath = (path) => branchMode
    ? `/branch/${encodeURIComponent(branchCode)}/${path}`
    : `/${path}`

  useEffect(() => {
    const refresh = () => loadBills()
    refresh()
    window.addEventListener('focus', refresh)
    return () => {
      requestSequence.current += 1
      window.removeEventListener('focus', refresh)
    }
  }, [branchMode, branchCode, search])

  const loadBills = async (offset = 0) => {
    const requestId = ++requestSequence.current
    try {
      if (offset === 0) setLoading(true)
      else setLoadingMore(true)
      const res = await api.get('/bills', {
        params: {
          limit: 50,
          offset,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(branchMode && branchCode ? { branch: branchCode } : {})
        }
      })
      const billsData = res.data?.data || res.data || []
      if (!Array.isArray(billsData)) throw new Error('The server returned an invalid bill list.')
      if (requestId !== requestSequence.current) return
      setBills((current) => offset === 0 ? billsData : [
        ...current,
        ...billsData.filter((bill) => !current.some((item) => String(item.id) === String(bill.id)))
      ])
      setTotalBills(Number(res.data?.total ?? billsData.length))
      setHasMore(Boolean(res.data?.hasMore))
      setLoadError('')
    } catch (err) {
      if (requestId !== requestSequence.current) return
      console.error('Bill list load failed:', err)
      setLoadError(err.response?.data?.error || err.message || 'Unable to load bills.')
    } finally {
      if (requestId === requestSequence.current) {
        if (offset === 0) setLoading(false)
        else setLoadingMore(false)
      }
    }
  }

  const deleteBill = async (bill) => {
    if (!window.confirm(`Delete bill ${bill.bill_no || ''}? This cannot be undone.`)) return
    try {
      await api.delete(`/bills/${bill.id}`)
      setBills(current => current.filter(item => item.id !== bill.id))
      setTotalBills((current) => Math.max(0, current - 1))
    } catch (err) {
      window.alert(err.response?.data?.error || 'Unable to delete this bill.')
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#eef2f7]">
      <header className="bg-red-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-bold text-lg">📋 Bill List ({totalBills})</h1>
          <div className="flex gap-2">
            <Link to={branchPath('bill-entry')} className="bg-white text-red-700 px-4 py-2 rounded-lg text-sm font-medium">+ New Bill</Link>
            <button onClick={() => navigate(branchMode ? `/branch/${encodeURIComponent(branchCode)}/dashboard` : '/dashboard')} className="bg-white/20 px-4 py-2 rounded-lg text-sm">← Back</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loadError && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>Bills could not be loaded: {loadError}</span>
            <button type="button" onClick={loadBills} className="shrink-0 font-semibold underline">Retry</button>
          </div>
        )}
        <input
          type="text"
          placeholder="Search all bills by Bill No or Party Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 mb-4 border rounded-lg shadow-sm"
        />
        {!loading && !loadError && (
          <p className="mb-3 text-sm text-slate-600">
            Showing {bills.length} of {totalBills} bills
          </p>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Bill No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Party</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Grand Total</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Balance</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8">Loading...</td></tr>
              ) : loadError && bills.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-amber-700">Bill data is unavailable. Retry after the database connection is restored.</td></tr>
              ) : bills.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">No bills found</td></tr>
              ) : bills.map(bill => (
                <tr key={bill.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-red-700" style={{ wordBreak: 'break-word' }}>
                    {bill.bill_no || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm">{bill.bill_date ? formatDate(bill.bill_date) : '-'}</td>
                  <td className="px-4 py-3 text-sm" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                    {bill.party_name || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    ₹{Number(bill.grand_total || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">
                    ₹{Number(bill.net_balance || bill.balance_due || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      to={branchMode
                        ? `/branch/${encodeURIComponent(branchCode)}/bill-entry/${bill.id}`
                        : `/bill-edit/${bill.id}`}
                      className="ml-2 bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 text-sm font-medium inline-block"
                    >
                      Edit
                    </Link>
                    <Link
                      to={branchMode
                        ? `/branch/${encodeURIComponent(branchCode)}/bill-print/${bill.id}`
                        : `/bill-print/${bill.id}`}
                      className="ml-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium inline-block"
                    >
                      Print
                    </Link>
                    <button
                      type="button"
                      onClick={() => deleteBill(bill)}
                      className="ml-2 bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !loadError && hasMore && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => loadBills(bills.length)}
              disabled={loadingMore}
              className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? 'Loading…' : `Load More (${totalBills - bills.length} remaining)`}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
