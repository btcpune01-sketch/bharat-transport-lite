import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '../utils/dateFormatter'

export default function Commissions() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ lr_no: '', agent_name: '', commission_percent: '', commission_amount: '', status: 'Pending' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchData() }, [])

  const apiUrl = 'https://bharat-transport-api.onrender.com'
  const getHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' })

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${apiUrl}/api/commissions`, { headers: getHeaders() })
      if (res.ok) { const d = await res.json(); setData(d.data || []) }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`${apiUrl}/api/commissions`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify(form)
      })
      if (res.ok) {
        setShowForm(false)
        setForm({ lr_no: '', agent_name: '', commission_percent: '', commission_amount: '', status: 'Pending' })
        fetchData()
      } else {
        const err = await res.json()
        alert('Error: ' + (err.error || 'Unknown'))
      }
    } catch (e) { alert('Network error: ' + e.message) }
    finally { setSaving(false) }
  }

  const fmt = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
  const totalCommission = data.reduce((s, r) => s + parseFloat(r.commission_amount || 0), 0)
  const paidCommission = data.filter(r => r.status === 'Paid').reduce((s, r) => s + parseFloat(r.commission_amount || 0), 0)
  const pendingCommission = totalCommission - paidCommission

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="bg-gradient-to-r from-purple-700 to-purple-900 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">💼 Agent Commissions</h1>
            <p className="text-purple-200 text-sm">Track commission payments to agents</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(!showForm)} className="bg-white text-purple-700 px-4 py-2 rounded-lg font-bold hover:bg-purple-50">➕ Add Commission</button>
            <button onClick={() => navigate('/dashboard')} className="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30">← Dashboard</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-2xl p-6 shadow-lg">
            <div className="text-sm opacity-90">TOTAL COMMISSION</div>
            <div className="text-3xl font-bold mt-2">{fmt(totalCommission)}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-700 text-white rounded-2xl p-6 shadow-lg">
            <div className="text-sm opacity-90">PAID</div>
            <div className="text-3xl font-bold mt-2">{fmt(paidCommission)}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-2xl p-6 shadow-lg">
            <div className="text-sm opacity-90">PENDING</div>
            <div className="text-3xl font-bold mt-2">{fmt(pendingCommission)}</div>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">Add New Commission</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="LR No" value={form.lr_no} onChange={e => setForm({...form, lr_no: e.target.value})} className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" />
              <input type="text" placeholder="Agent Name *" required value={form.agent_name} onChange={e => setForm({...form, agent_name: e.target.value})} className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" />
              <input type="number" placeholder="Commission %" value={form.commission_percent} onChange={e => setForm({...form, commission_percent: e.target.value})} className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" />
              <input type="number" placeholder="Commission Amount *" required value={form.commission_amount} onChange={e => setForm({...form, commission_amount: e.target.value})} className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" />
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none">
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50">{saving ? 'Saving...' : '💾 Save'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-3 bg-gray-200 rounded-lg font-medium hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-700 to-gray-900 text-white p-4">
            <h3 className="font-bold">All Commissions ({data.length})</h3>
          </div>
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : data.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">💼</div>
              <p className="text-gray-500">No commissions recorded yet</p>
              <button onClick={() => setShowForm(true)} className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700">➕ Add First Commission</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">LR NO</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">AGENT</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600">%</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600">AMOUNT</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">PAID DATE</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r, i) => (
                    <tr key={i} className="border-t hover:bg-purple-50">
                      <td className="px-4 py-3 text-sm text-blue-700 font-medium">{r.lr_no || '-'}</td>
                      <td className="px-4 py-3 text-sm font-bold">{r.agent_name}</td>
                      <td className="px-4 py-3 text-sm text-right">{r.commission_percent || 0}%</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-purple-700">{fmt(r.commission_amount)}</td>
                      <td className="px-4 py-3 text-sm">{r.paid_date ? formatDate(r.paid_date) : '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${r.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{r.status}</span>
                      </td>
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
