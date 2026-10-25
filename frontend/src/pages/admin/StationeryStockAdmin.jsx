import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../../api'

const bookTypes = [
  { key: 'bilty_book', label: 'Bilty Book', prefix: 'BTC-BILTY' },
  { key: 'bill_book', label: 'Bill Book', prefix: 'BTC-BILL' },
  { key: 'mr_book', label: 'Money Receipt Book', prefix: 'BTC-MR' },
  { key: 'challan_book', label: 'Gadi Challan Book', prefix: 'BTC-CHALLAN' }
]

const emptyForm = {
  type: bookTypes[0].key,
  qty: '',
  startNo: '',
  supplier: '',
  cost: '',
  date: new Date().toISOString().slice(0, 10)
}

function responseData(response) {
  return response.data?.data ?? response.data
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

export default function StationeryStockAdmin() {
  const [masterStock, setMasterStock] = useState([])
  const [branchStock, setBranchStock] = useState([])
  const [branches, setBranches] = useState([])
  const [requests, setRequests] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [distribution, setDistribution] = useState({ branchId: '', type: bookTypes[0].key, qty: '' })
  const [showDistribution, setShowDistribution] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const formRef = useRef(null)

  const selectedBook = bookTypes.find((book) => book.key === form.type) || bookTypes[0]
  const endingNumber = useMemo(() => {
    const quantity = Number(form.qty)
    const match = form.startNo.match(/^(.*?)(\d+)$/)
    if (!match || !Number.isSafeInteger(quantity) || quantity < 1) return ''
    return `${match[1]}${String(Number(match[2]) + quantity - 1).padStart(match[2].length, '0')}`
  }, [form.qty, form.startNo])

  const loadData = async () => {
    setError('')
    try {
      const [stockResponse, branchResponse, requestResponse] = await Promise.all([
        api.get('/stationery-stock', { params: { scope: 'all' } }),
        api.get('/branches'),
        api.get('/stationery-stock/requests')
      ])
      const stock = responseData(stockResponse)
      const branchData = responseData(branchResponse)
      const requestData = responseData(requestResponse)
      setMasterStock(Array.isArray(stock?.masterStock) ? stock.masterStock : [])
      setBranchStock(Array.isArray(stock?.branchStock) ? stock.branchStock : [])
      setBranches(Array.isArray(branchData) ? branchData : [])
      setRequests(Array.isArray(requestData) ? requestData : [])
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || 'Unable to load stationery stock.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const getMasterValue = (type, key) => {
    const row = masterStock.find((item) => item.book_type === type)
    return Number(row?.[key]) || 0
  }

  const getBranchValue = (branchId, type, key) => {
    const row = branchStock.find((item) => String(item.branch_id) === String(branchId) && item.book_type === type)
    return Number(row?.[key]) || 0
  }

  async function addStock(event) {
    event.preventDefault()
    if (!endingNumber) {
      setError('Enter a starting number ending in digits and a positive quantity to calculate the ending number.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.post('/stationery-stock/add', {
        type: form.type,
        qty: Number(form.qty),
        startNo: form.startNo.trim(),
        endNo: endingNumber,
        supplier: form.supplier.trim(),
        cost: form.cost === '' ? null : Number(form.cost),
        date: form.date
      })
      setForm(emptyForm)
      setNotice('Printed books added to main stock.')
      await loadData()
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || 'Unable to add stationery stock.')
    } finally {
      setSaving(false)
    }
  }

  async function distributeStock(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.post('/stationery-stock/distribute', {
        branchId: distribution.branchId,
        type: distribution.type,
        qty: Number(distribution.qty)
      })
      setShowDistribution(false)
      setDistribution({ branchId: '', type: bookTypes[0].key, qty: '' })
      setNotice('Stock assigned to the branch.')
      await loadData()
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || 'Unable to distribute stock.')
    } finally {
      setSaving(false)
    }
  }

  async function reviewRequest(request, action) {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.patch(`/stationery-stock/requests/${request.id}`, { action })
      setNotice(`Request ${action === 'approve' ? 'approved and assigned' : 'rejected'}.`)
      await loadData()
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || `Unable to ${action} request.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Stationery Stock Management</h1>
            <p className="mt-1 text-sm text-slate-600">Manage main stock, branch allocations, and branch requests.</p>
          </div>
          <button
            type="button"
            onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Add Stock
          </button>
        </header>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

        <section aria-label="Total company stock" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {bookTypes.map((book) => (
            <article key={book.key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-600">{book.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? '…' : getMasterValue(book.key, 'total_stock')}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {getMasterValue(book.key, 'available')} available in main stock
              </p>
            </article>
          ))}
        </section>

        <section ref={formRef} className="scroll-mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Add New Printed Books</h2>
          <form onSubmit={addStock} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-medium text-slate-700">
              Book Type
              <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                {bookTypes.map((book) => <option key={book.key} value={book.key}>{book.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Total Quantity
              <input type="number" min="1" step="1" required value={form.qty} onChange={(event) => setForm({ ...form, qty: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Starting Number
              <input required value={form.startNo} onChange={(event) => setForm({ ...form, startNo: event.target.value })} placeholder={`${selectedBook.prefix}-0001`} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Ending Number
              <input readOnly value={endingNumber} placeholder="Auto calculated" className="mt-1 block w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Supplier / Press Name
              <input value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Cost
              <input type="number" min="0" step="0.01" value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Date
              <input type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <div className="flex items-end">
              <button disabled={saving} type="submit" className="w-full rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                Add to Main Stock
              </button>
            </div>
          </form>
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Branch Distribution</h2>
                <p className="mt-1 text-sm text-slate-600">Stock currently assigned to each branch.</p>
              </div>
              <button type="button" onClick={() => setShowDistribution(true)} className="rounded-md border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                Distribute
              </button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Branch Name</th>
                    {bookTypes.map((book) => <th key={book.key} className="px-3 py-3">{book.label} Assigned</th>)}
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branches.map((branch) => (
                    <tr key={branch.id}>
                      <td className="px-3 py-3 font-medium text-slate-800">{branch.branch_name}</td>
                      {bookTypes.map((book) => <td key={book.key} className="px-3 py-3 text-slate-700">{getBranchValue(branch.id, book.key, 'total_assigned')}</td>)}
                      <td className="px-3 py-3">
                        <button type="button" onClick={() => { setDistribution({ ...distribution, branchId: String(branch.id) }); setShowDistribution(true) }} className="font-semibold text-blue-700 hover:underline">Distribute</button>
                      </td>
                    </tr>
                  ))}
                  {!loading && branches.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No branches found.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Branch Requests</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr><th className="px-3 py-3">Branch</th><th className="px-3 py-3">Book Type</th><th className="px-3 py-3">Qty</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-3 py-3">{request.branch_name}</td>
                      <td className="px-3 py-3">{bookTypes.find((book) => book.key === request.book_type)?.label || request.book_type}</td>
                      <td className="px-3 py-3">{request.qty}</td>
                      <td className="px-3 py-3">{formatDate(request.date)}</td>
                      <td className="px-3 py-3">
                        {request.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button type="button" disabled={saving} onClick={() => reviewRequest(request, 'approve')} className="font-semibold text-green-700 hover:underline disabled:opacity-50">Approve</button>
                            <button type="button" disabled={saving} onClick={() => reviewRequest(request, 'reject')} className="font-semibold text-red-700 hover:underline disabled:opacity-50">Reject</button>
                          </div>
                        ) : <span className="capitalize text-slate-500">{request.status}</span>}
                      </td>
                    </tr>
                  ))}
                  {!loading && requests.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No branch requests.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {showDistribution && (
        <div role="dialog" aria-modal="true" aria-labelledby="distribute-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={distributeStock} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 id="distribute-title" className="text-lg font-bold text-slate-900">Distribute Stock</h2>
              <button type="button" aria-label="Close" onClick={() => setShowDistribution(false)} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">×</button>
            </div>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Branch
              <select required value={distribution.branchId} onChange={(event) => setDistribution({ ...distribution, branchId: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                <option value="">Select branch</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
              </select>
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Book Type
              <select value={distribution.type} onChange={(event) => setDistribution({ ...distribution, type: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                {bookTypes.map((book) => <option key={book.key} value={book.key}>{book.label}</option>)}
              </select>
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Quantity to Assign
              <input required type="number" min="1" step="1" value={distribution.qty} onChange={(event) => setDistribution({ ...distribution, qty: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
              <span className="mt-1 block text-xs text-slate-500">Available in main stock: {getMasterValue(distribution.type, 'available')}</span>
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowDistribution(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button disabled={saving} type="submit" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Assign</button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}
