import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../api'

const bookTypes = [
  { key: 'bilty_book', label: 'Bilty Book' },
  { key: 'bill_book', label: 'Bill Book' },
  { key: 'mr_book', label: 'Money Receipt Book' },
  { key: 'challan_book', label: 'Gadi Challan Book' },
  { key: 'a4_paper_reams', label: 'A4 Paper Reams' },
  { key: 'printer_ink_black', label: 'Printer Ink (Black)' },
  { key: 'dot_matrix_ribbon', label: 'Dot Matrix Ribbon' },
  { key: 'envelopes_large', label: 'Envelopes (Large)' },
  { key: 'stapler_pins', label: 'Stapler Pins' },
  { key: 'file_folders', label: 'File Folders' },
  { key: 'carbon_paper', label: 'Carbon Paper' },
  { key: 'stamp_pad', label: 'Stamp Pad' },
  { key: 'pen_marker', label: 'Pen / Marker' }
]

const emptyRequest = { type: bookTypes[0].key, qty: '', reason: '', urgency: 'medium' }

function responseData(response) {
  return response.data?.data ?? response.data
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export default function StationeryStockBranch({ branchCode }) {
  const routeParams = useParams()
  const branchSlug = branchCode || routeParams.branchSlug || routeParams.branchCode || ''
  const [stock, setStock] = useState([])
  const [request, setRequest] = useState(emptyRequest)
  const [showRequest, setShowRequest] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadStock() {
    setError('')
    try {
      const response = await api.get('/stationery-stock', { params: { branch: branchSlug } })
      const data = responseData(response)
      if (!Array.isArray(data)) throw new Error('The server returned an invalid stationery stock list.')
      setStock(data)
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || 'Unable to load branch stationery stock.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (branchSlug) loadStock()
  }, [branchSlug])

  const history = useMemo(() => stock
    .flatMap((item) => (item.history || []).map((entry) => ({
      ...entry,
      book_type: entry.book_type || item.book_type
    })))
    .sort((left, right) => new Date(right.created_at) - new Date(left.created_at)), [stock])

  function getStock(type) {
    return stock.find((item) => item.book_type === type) || { total_assigned: 0, used: 0, remaining: 0 }
  }

  async function submitRequest(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.post('/stationery-stock/request', {
        branch: branchSlug,
        type: request.type,
        qty: Number(request.qty),
        reason: request.reason.trim(),
        urgency: request.urgency
      })
      setRequest(emptyRequest)
      setShowRequest(false)
      setNotice('Stock request sent to the administrator.')
      await loadStock()
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || 'Unable to submit stationery request.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Branch Stationery Stock</h1>
            <p className="mt-1 text-sm text-slate-600">View assigned printed books and request additional stock.</p>
          </div>
          <button type="button" onClick={() => setShowRequest(true)} className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
            Request More Stock
          </button>
        </header>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

        <section aria-label="Assigned stationery stock" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {bookTypes.map((book) => {
            const item = getStock(book.key)
            const total = Number(item.total_assigned) || 0
            const remaining = Number(item.remaining) || 0
            const used = Number(item.used) || 0
            const percent = total > 0 ? Math.min(100, Math.round((remaining / total) * 100)) : 0
            return (
              <article key={book.key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700">{book.label}</h2>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  Remaining {loading ? '…' : remaining} <span className="text-base font-medium text-slate-500">/ Total {total}</span>
                </p>
                <p className="mt-1 text-sm text-slate-600">Used {used}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${book.label} remaining`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                  <div className={`h-full rounded-full ${percent <= 20 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${percent}%` }} />
                </div>
                <p className="mt-1 text-right text-xs text-slate-500">{percent}% remaining</p>
              </article>
            )
          })}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Stationery History</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Date</th><th className="px-3 py-3">Book Type</th><th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Qty</th><th className="px-3 py-3">By</th><th className="px-3 py-3">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((entry, index) => (
                  <tr key={`${entry.book_type}-${entry.created_at}-${index}`}>
                    <td className="px-3 py-3 text-slate-600">{formatDate(entry.created_at)}</td>
                    <td className="px-3 py-3">{bookTypes.find((book) => book.key === entry.book_type)?.label || entry.book_type}</td>
                    <td className="px-3 py-3 capitalize">{entry.action}</td>
                    <td className="px-3 py-3">{entry.quantity}</td>
                    <td className="px-3 py-3">{entry.performed_by || '—'}</td>
                    <td className="px-3 py-3">{entry.remaining ?? '—'}</td>
                  </tr>
                ))}
                {!loading && history.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No stationery stock history yet.</td></tr>}
                {loading && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Loading stock history…</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showRequest && (
        <div role="dialog" aria-modal="true" aria-labelledby="request-stock-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={submitRequest} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 id="request-stock-title" className="text-lg font-bold text-slate-900">Request More Stock</h2>
              <button type="button" aria-label="Close" onClick={() => setShowRequest(false)} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">×</button>
            </div>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Book Type
              <select value={request.type} onChange={(event) => setRequest({ ...request, type: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                {bookTypes.map((book) => <option key={book.key} value={book.key}>{book.label}</option>)}
              </select>
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Quantity Needed
              <input required type="number" min="1" step="1" value={request.qty} onChange={(event) => setRequest({ ...request, qty: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Reason
              <textarea required rows={3} value={request.reason} onChange={(event) => setRequest({ ...request, reason: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Urgency
              <select value={request.urgency} onChange={(event) => setRequest({ ...request, urgency: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowRequest(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button disabled={saving} type="submit" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Submit Request</button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}
