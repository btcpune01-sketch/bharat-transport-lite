import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate, formatDateForInput } from '../utils/dateFormatter'

export default function Expenses() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    expense_date: formatDateForInput(new Date()),
    category: 'Fuel', description: '', amount: '', payment_mode: 'Cash', bill_no: ''
  })
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState('')

  useEffect(() => { fetchData() }, [])

  const apiUrl = 'https://bharat-transport-api.onrender.com'
  const getHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' })

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${apiUrl}/api/expenses`, { headers: getHeaders() })
      if (res.ok) { const d = await res.json(); setData(d.data || []) }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`${apiUrl}/api/expenses`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify(form)
      })
      if (res.ok) {
        setShowForm(false)
        setForm({ ...form, description: '', amount: '', bill_no: '' })
        fetchData()
      } else {
        const err = await res.json()
        alert('Error: ' + (err.error || 'Unknown'))
      }
    } catch (e) { alert('Network error: ' + e.message) }
    finally { setSaving(false) }
  }

  const fmt = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
  const fmtDate = (d) => d ? formatDate(d) : '-'

  const categories = ['Fuel', 'Driver Salary', 'Maintenance', 'Toll', 'Office', 'Rent', 'Electricity', 'Tea/Snacks', 'Other']
  const filtered = filterCat ? data.filter(r => r.category === filterCat) : data
  const total = filtered.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
  const todayTotal = data.filter(r => r.expense_date === formatDateForInput(new Date())).reduce((s, r) => s + parseFloat(r.amount || 0), 0)
  const monthTotal = data.filter(r => (r.expense_date || '').startsWith(formatDateForInput(new Date()).slice(0, 7))).reduce((s, r) => s + parseFloat(r.amount || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="bg-gradient-to-r from-red-700 to-red-900 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">💸 Expense Manager</h1>
            <p className="text-red-200 text-sm">Track all business expenses</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(!showForm)} className="bg-white text-red-700 px-4 py-2 rounded-lg font-bold hover:bg-red-50">➕ Add Expense</button>
            <button onClick={() => navigate('/dashboard')} className="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30">← Dashboard</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-red-500 to-red-700 text-white rounded-2xl p-6 shadow-lg">
            <div className="text-sm opacity-90">TODAY'S EXPENSE</div>
            <div className="text-3xl font-bold mt-2">{fmt(todayTotal)}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-700 text-white rounded-2xl p-6 shadow-lg">
            <div className="text-sm opacity-90">THIS MONTH</div>
            <div className="text-3xl font-bold mt-2">{fmt(monthTotal)}</div>
          </div>
          <div className="bg-gradient-to-br from-gray-600 to-gray-800 text-white rounded-2xl p-6 shadow-lg">
            <div className="text-sm opacity-90">{filterCat ? `${filterCat} TOTAL` : 'ALL TIME TOTAL'}</div>
            <div className="text-3xl font-bold mt-2">{fmt(total)}</div>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">➕ Add New Expense</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="date" required value={form.expense_date} onChange={e => setForm({...form, expense_date: e.target.value})} className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none" />
              <select required value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" required placeholder="Amount *" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none" />
              <input type="text" placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="md:col-span-2 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none" />
              <select value={form.payment_mode} onChange={e => setForm({...form, payment_mode: e.target.value})} className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none">
                <option value="Cash">Cash</option>
                <option value="Bank">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
              </select>
              <input type="text" placeholder="Bill No (optional)" value={form.bill_no} onChange={e => setForm({...form, bill_no: e.target.value})} className="md:col-span-3 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none" />
              <div className="md:col-span-3 flex gap-2">
                <button type="submit" disabled={saving} className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50">{saving ? 'Saving...' : '💾 Save Expense'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 bg-gray-200 rounded-lg font-medium hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 flex flex-wrap gap-3 items-center">
          <span className="text-sm font-bold text-gray-700">Filter:</span>
          <button onClick={() => setFilterCat('')} className={`px-4 py-2 rounded-lg text-sm font-medium ${!filterCat ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}>All ({data.length})</button>
          {categories.map(c => {
            const count = data.filter(r => r.category === c).length
            if (count === 0) return null
            return <button key={c} onClick={() => setFilterCat(c)} className={`px-4 py-2 rounded-lg text-sm font-medium ${filterCat === c ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{c} ({count})</button>
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-700 to-gray-900 text-white p-4">
            <h3 className="font-bold">Expense Records ({filtered.length})</h3>
          </div>
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">💸</div>
              <p className="text-gray-500">No expense records found</p>
              <button onClick={() => setShowForm(true)} className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700">➕ Add First Expense</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">DATE</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">CATEGORY</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">DESCRIPTION</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">BILL NO</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">MODE</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={i} className="border-t hover:bg-red-50">
                      <td className="px-4 py-3 text-sm">{fmtDate(r.expense_date)}</td>
                      <td className="px-4 py-3 text-sm"><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">{r.category}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.description || '-'}</td>
                      <td className="px-4 py-3 text-sm text-blue-700">{r.bill_no || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.payment_mode}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-red-700">{fmt(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
