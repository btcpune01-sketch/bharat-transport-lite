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
  { key: 'stamp_pad', label: 'Stamp Pad' }
]

const createStockForm = (bookType, item = {}) => ({
  bookType,
  action: 'add',
  quantity: '',
  startSerial: '',
  endSerial: '',
  currentRunningSerial: item.current_running_serial || '',
  supplier: item.supplier || '',
  cost: item.cost ?? '',
  remark: '',
  date: new Date().toISOString().slice(0, 10)
})

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
  const [stockForm, setStockForm] = useState(createStockForm(bookTypes[0].key))
  const [showStockModal, setShowStockModal] = useState(false)
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

  function openStockModal(bookType) {
    setStockForm(createStockForm(bookType, getStock(bookType)))
    setError('')
    setShowStockModal(true)
  }

  function updateStockForm(field, value) {
    setStockForm((current) => {
      const next = { ...current, [field]: value }
      if (field === 'startSerial' && (!current.currentRunningSerial || current.action === 'add')) {
        next.currentRunningSerial = value
      }
      if (field === 'quantity' || field === 'startSerial') {
        const serialMatch = next.startSerial.match(/^(.*?)(\d+)$/)
        const quantity = Number(next.quantity)
        if (serialMatch && Number.isSafeInteger(quantity) && quantity > 0) {
          const ending = BigInt(serialMatch[2]) + BigInt(quantity) - 1n
          next.endSerial = `${serialMatch[1]}${ending.toString().padStart(serialMatch[2].length, '0')}`
        }
      }
      return next
    })
  }

  async function submitStockUpdate(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.post('/stationery-stock/branch-self-update', {
        branchSlug,
        bookType: stockForm.bookType,
        action: stockForm.action,
        quantity: Number(stockForm.quantity),
        startSerial: stockForm.startSerial.trim(),
        endSerial: stockForm.endSerial.trim(),
        currentRunningSerial: stockForm.currentRunningSerial.trim(),
        supplier: stockForm.supplier.trim(),
        cost: stockForm.cost === '' ? null : Number(stockForm.cost),
        remark: stockForm.remark.trim(),
        date: stockForm.date
      })
      setShowStockModal(false)
      setNotice(`${bookTypes.find((book) => book.key === stockForm.bookType)?.label || 'Stock'} updated successfully.`)
      await loadStock()
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || 'Unable to update branch stationery stock.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Branch Stationery Stock - {branchSlug.replaceAll('-', ' ').toUpperCase()}</h1>
            <p className="mt-1 text-sm text-slate-600">Manage your branch stationery balances and serial ranges.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => openStockModal(bookTypes[0].key)} className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
              + Add / Update Stock
            </button>
            <button type="button" onClick={() => document.getElementById('branch-stationery-history')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white">
              History
            </button>
          </div>
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
              <article key={book.key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-700">{book.label}</h2>
                  <button type="button" onClick={() => openStockModal(book.key)} className="text-sm font-bold text-blue-700 hover:underline">+ Add</button>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  Remaining {loading ? '…' : remaining} <span className="text-base font-medium text-slate-500">/ Total {total}</span>
                </p>
                <p className="mt-1 text-sm text-slate-600">Used {used}</p>
                <p className="mt-3 text-xs text-slate-600">
                  Current Series: <span className="rounded bg-yellow-100 px-2 py-1 text-slate-800">{item.start_serial || '—'}{item.end_serial ? ` to ${item.end_serial}` : ''}</span>
                </p>
                <p className="mt-2 break-all text-xs text-slate-600">Current Running: {item.current_running_serial || '—'}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${book.label} remaining`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                  <div className={`h-full rounded-full ${percent <= 20 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${percent}%` }} />
                </div>
                <p className="mt-1 text-right text-xs text-slate-500">{percent}% remaining</p>
              </article>
            )
          })}
        </section>

        <section id="branch-stationery-history" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Stationery History</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Date</th><th className="px-3 py-3">Book Type</th><th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Qty</th><th className="px-3 py-3">By</th><th className="px-3 py-3">Remaining</th>
                  <th className="px-3 py-3">Serial</th>
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
                    <td className="px-3 py-3">{entry.current_running_serial || entry.start_serial || '—'}</td>
                  </tr>
                ))}
                {!loading && history.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">No stationery stock history yet.</td></tr>}
                {loading && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">Loading stock history…</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showStockModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="branch-stock-update-title" className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4">
          <form onSubmit={submitStockUpdate} className="my-4 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 id="branch-stock-update-title" className="text-lg font-bold text-slate-900">Update {bookTypes.find((book) => book.key === stockForm.bookType)?.label} Stock - {branchSlug.toUpperCase()}</h2>
              <button type="button" aria-label="Close" onClick={() => setShowStockModal(false)} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">×</button>
            </div>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Book Type
              <select value={stockForm.bookType} onChange={(event) => updateStockForm('bookType', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                {bookTypes.map((book) => <option key={book.key} value={book.key}>{book.label}</option>)}
              </select>
            </label>
            <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              Current stock: Remaining {getStock(stockForm.bookType).remaining || 0} / Total {getStock(stockForm.bookType).total_assigned || 0} · Used {getStock(stockForm.bookType).used || 0}
            </div>
            <fieldset className="mt-4">
              <legend className="text-sm font-medium text-slate-700">Action Type</legend>
              <div className="mt-2 flex flex-wrap gap-4">
                {[['add', 'Add New Stock'], ['update', 'Update Existing'], ['correction', 'Correction']].map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="radio" name="stock-action" value={value} checked={stockForm.action === value} onChange={(event) => updateStockForm('action', event.target.value)} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                {stockForm.action === 'correction' ? 'Quantity Adjustment (+/-)' : stockForm.action === 'update' ? 'New Total Quantity' : 'Quantity to Add'}
                <input required type="number" min={stockForm.action === 'correction' ? undefined : '1'} step="1" value={stockForm.quantity} onChange={(event) => updateStockForm('quantity', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Starting Serial No.
                <input value={stockForm.startSerial} onChange={(event) => updateStockForm('startSerial', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Ending Serial No.
                <input value={stockForm.endSerial} onChange={(event) => updateStockForm('endSerial', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Current Running Serial
                <input value={stockForm.currentRunningSerial} onChange={(event) => updateStockForm('currentRunningSerial', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Supplier / Press Name
                <input value={stockForm.supplier} onChange={(event) => updateStockForm('supplier', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Cost
                <input type="number" min="0" step="0.01" value={stockForm.cost} onChange={(event) => updateStockForm('cost', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                Remark
                <textarea rows={2} value={stockForm.remark} onChange={(event) => updateStockForm('remark', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Date
                <input required type="date" value={stockForm.date} onChange={(event) => updateStockForm('date', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowStockModal(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button disabled={saving} type="submit" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save Stock'}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}
