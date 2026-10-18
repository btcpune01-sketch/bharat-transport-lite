import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Outstanding() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      setLoading(true); setError(null)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const res = await fetch(`${apiUrl}/api/outstanding`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch outstanding')
      const d = await res.json()
      setData(d.data || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const fmt = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })

  const filtered = data.filter(r =>
    (r.party_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.party_code || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalPending = filtered.reduce((s, r) => s + parseFloat(r.pending_amount || 0), 0)

  const exportCSV = () => {
    const rows = [['Party Name', 'Party Code', 'Branch', 'Total Bilties', 'Pending Amount', 'Total Amount']]
    filtered.forEach(r => rows.push([r.party_name, r.party_code, r.branch_code, r.total_bilties, r.pending_amount, r.total_amount]))
    const csv = rows.map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `outstanding_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="bg-gradient-to-r from-orange-600 to-red-700 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">⏳ Outstanding Report</h1>
            <p className="text-orange-200 text-sm">Pending amounts from all parties</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="bg-white text-orange-700 px-4 py-2 rounded-lg font-bold hover:bg-orange-50">📥 Export CSV</button>
            <button onClick={() => navigate('/dashboard')} className="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30">← Dashboard</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-red-500 to-red-700 text-white rounded-2xl p-6 shadow-lg">
            <div className="text-sm opacity-90">TOTAL PENDING</div>
            <div className="text-3xl font-bold mt-2">{fmt(totalPending)}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-700 text-white rounded-2xl p-6 shadow-lg">
            <div className="text-sm opacity-90">PARTIES WITH DUES</div>
            <div className="text-3xl font-bold mt-2">{filtered.length}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl p-6 shadow-lg">
            <div className="text-sm opacity-90">AVG PENDING</div>
            <div className="text-3xl font-bold mt-2">{filtered.length ? fmt(totalPending / filtered.length) : '₹0'}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <input
            type="text"
            placeholder="🔍 Search party name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none"
          />
        </div>

        {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6 text-red-700">{error}</div>}

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-700 to-gray-900 text-white p-4">
            <h3 className="font-bold">Outstanding Parties ({filtered.length})</h3>
          </div>
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-gray-500 font-medium">No pending amounts! All clear.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">#</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">PARTY NAME</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">CODE</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">BRANCH</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">BILTIES</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600">PENDING</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600">TOTAL</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={i} className="border-t hover:bg-orange-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-800">{r.party_name}</td>
                      <td className="px-4 py-3 text-sm text-blue-700">{r.party_code}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.branch_code || '-'}</td>
                      <td className="px-4 py-3 text-sm text-center">{r.total_bilties}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-red-600">{fmt(r.pending_amount)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{fmt(r.total_amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => navigate(`/ledger`)} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 font-medium">View Ledger</button>
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
