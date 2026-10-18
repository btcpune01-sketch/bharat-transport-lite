import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate, formatDateForInput } from '../utils/dateFormatter'

export default function MR() {
  const navigate = useNavigate()
  const [mrs, setMrs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchMRs()
  }, [])

  const fetchMRs = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const res = await fetch(`${apiUrl}/api/mr`, { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      setMrs(data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('क्या आप इस MR को delete करना चाहते हैं?')) return
    try {
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const response = await fetch(`${apiUrl}/api/mr/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Unable to delete MR.')
      }
      fetchMRs()
      alert('MR deleted successfully')
    } catch (err) {
      alert('Error deleting MR: ' + err.message)
    }
  }

  const filteredMRs = mrs.filter(mr => {
    if (filter === 'advance') return mr.is_advance
    if (filter === 'bilty') return mr.bilty_lr_no
    if (filter === 'bill') return mr.bill_no
    if (filter === 'today') {
      const today = formatDateForInput(new Date())
      return mr.mr_date && mr.mr_date.startsWith(today)
    }
    if (filter === 'month') {
      const thisMonth = formatDateForInput(new Date()).substring(0, 7)
      return mr.mr_date && mr.mr_date.startsWith(thisMonth)
    }
    return true
  }).filter(mr => {
    if (!search) return true
    const s = search.toLowerCase()
    return (mr.mr_no || '').toLowerCase().includes(s) ||
           (mr.party_name || '').toLowerCase().includes(s) ||
           (mr.bilty_lr_no || '').toLowerCase().includes(s)
  })

  const totalAmount = filteredMRs.reduce((sum, mr) => sum + parseFloat(mr.amount || 0), 0)

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-purple-700 to-purple-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="font-bold text-xl">🧾 Money Receipt Register</h1>
            <p className="text-xs text-purple-200">Total: {filteredMRs.length} MRs | Amount: ₹{totalAmount.toLocaleString('en-IN')}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/mr/create')} className="bg-white text-purple-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-50">+ New MR</button>
            <button onClick={() => navigate('/')} className="bg-purple-800 text-white px-4 py-2 rounded-lg font-bold text-sm">← Dashboard</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Search & Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="🔍 Search by MR No, Party Name, LR No..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[250px] border p-2 rounded"
            />
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'all', label: 'All MRs' },
                { id: 'today', label: "Today" },
                { id: 'month', label: 'This Month' },
                { id: 'advance', label: 'Advance' },
                { id: 'bilty', label: 'Bilty Linked' },
                { id: 'bill', label: 'Bill Linked' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-2 rounded text-sm font-bold transition ${filter === f.id ? 'bg-purple-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? <div className="text-center py-20 text-xl">Loading...</div> : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="p-3 text-left text-sm font-bold">MR No</th>
                    <th className="p-3 text-left text-sm font-bold">Date</th>
                    <th className="p-3 text-left text-sm font-bold">Party Name</th>
                    <th className="p-3 text-left text-sm font-bold">Type</th>
                    <th className="p-3 text-left text-sm font-bold">Linked To</th>
                    <th className="p-3 text-left text-sm font-bold">Amount</th>
                    <th className="p-3 text-left text-sm font-bold">Mode</th>
                    <th className="p-3 text-left text-sm font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMRs.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-500">No MRs found</td></tr>
                  ) : filteredMRs.map(mr => (
                    <tr key={mr.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-bold text-purple-700">{mr.mr_no}</td>
                      
                      {/* ✅ FIX 1 Applied Here: Proper Date Format */}
                      <td className="p-3 text-sm">{formatDate(mr.mr_date)}</td>
                      
                      <td className="p-3 text-sm font-medium">{mr.party_name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${mr.is_advance ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {mr.is_advance ? '⚠️ Advance' : '✅ Payment'}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        {mr.bilty_lr_no && <div className="text-blue-700 font-bold">📝 {mr.bilty_lr_no}</div>}
                        {mr.bill_no && <div className="text-purple-700 font-bold">💰 {mr.bill_no}</div>}
                        {!mr.bilty_lr_no && !mr.bill_no && <span className="text-gray-400">-</span>}
                      </td>
                      <td className="p-3 font-bold text-green-700">₹{parseFloat(mr.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-sm">{mr.payment_mode}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {/* ✅ FIX 2 Applied Here: Pass mr_no in URL so MRPrint.jsx can read it */}
                          <button 
                            onClick={() => navigate(`/mr/print?mr_no=${encodeURIComponent(mr.mr_no)}`)} 
                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                            title="Print MR"
                          >
                            🖨️
                          </button>
                          <button 
                            onClick={() => handleDelete(mr.id)} 
                            className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                            title="Delete MR"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
