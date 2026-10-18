import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate, formatDateForInput } from '../utils/dateFormatter'

export default function Claims() {
  const navigate = useNavigate()
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)

  const [formData, setFormData] = useState({
    lr_no: '',
    claim_date: formatDateForInput(new Date()),
    claim_type: 'Damage',
    description: '',
    claim_amount: '',
    settled_amount: '',
    status: 'Open',
    remarks: ''
  })

  useEffect(() => {
    fetchClaims()
  }, [])

  const fetchClaims = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const headers = { 'Authorization': `Bearer ${token}` }

      const res = await fetch(`${apiUrl}/api/claims`, { headers })
      if (res.ok) {
        const data = await res.json()
        setClaims(data.data || [])
      }
    } catch (err) {
      console.error('Claims fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'

      const url = editId ? `${apiUrl}/api/claims/${editId}` : `${apiUrl}/api/claims`
      const method = editId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        alert(editId ? 'Claim updated successfully!' : 'Claim registered successfully!')
        setShowForm(false)
        setEditId(null)
        setFormData({
          lr_no: '',
          claim_date: formatDateForInput(new Date()),
          claim_type: 'Damage',
          description: '',
          claim_amount: '',
          settled_amount: '',
          status: 'Open',
          remarks: ''
        })
        fetchClaims()
      } else {
        const err = await res.json()
        alert('Error: ' + err.error)
      }
    } catch (err) {
      console.error('Claim save error:', err)
      alert('Failed to save claim')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (claim) => {
    setFormData({
      ...claim,
      claim_date: formatDateForInput(claim.claim_date)
    })
    setEditId(claim.id)
    setShowForm(true)
  }

  const formatCurrency = (amount) => {
    return '₹' + parseFloat(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'Open': return 'bg-red-100 text-red-700'
      case 'In-Progress': return 'bg-yellow-100 text-yellow-700'
      case 'Settled': return 'bg-green-100 text-green-700'
      case 'Rejected': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading && claims.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-rose-700"></div>
          <p className="mt-4 text-gray-500">Loading Claims...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-rose-700 to-rose-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="bg-white/20 p-2 rounded-lg hover:bg-white/30">← Back</button>
            <div>
              <h1 className="font-bold text-xl">⚠️ Claim Management</h1>
              <p className="text-xs text-rose-200">Track Damage, Loss, Shortage & Settlements</p>
            </div>
          </div>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setEditId(null); }}
              className="bg-white text-rose-700 px-5 py-2 rounded-lg font-bold text-sm hover:bg-rose-50 shadow flex items-center gap-2"
            >
              <span>+</span> Register New Claim
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {showForm ? (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">
              {editId ? '✏️ Edit Claim' : '📝 Register New Claim'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LR Number *</label>
                  <input required type="text" name="lr_no" value={formData.lr_no} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500 uppercase" placeholder="e.g., BTC/26/0001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Claim Date *</label>
                  <input required type="date" name="claim_date" value={formData.claim_date} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Claim Type *</label>
                  <select required name="claim_type" value={formData.claim_type} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500">
                    <option value="Damage">Damage</option>
                    <option value="Loss">Loss</option>
                    <option value="Shortage">Shortage</option>
                    <option value="Delay">Delay</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Claim Amount (₹) *</label>
                  <input required type="number" step="0.01" name="claim_amount" value={formData.claim_amount} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Settled Amount (₹)</label>
                  <input type="number" step="0.01" name="settled_amount" value={formData.settled_amount} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select required name="status" value={formData.status} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500">
                    <option value="Open">Open</option>
                    <option value="In-Progress">In-Progress</option>
                    <option value="Settled">Settled</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description of Incident *</label>
                <textarea required name="description" value={formData.description} onChange={handleChange} rows="3" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500" placeholder="Describe what happened..."></textarea>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / Action Taken</label>
                <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="2" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500" placeholder="Any internal notes..."></textarea>
              </div>

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="px-6 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-8 py-2.5 bg-rose-700 text-white rounded-lg font-bold hover:bg-rose-800 shadow disabled:opacity-50">
                  {loading ? 'Saving...' : editId ? '🔄 Update Claim' : '✅ Register Claim'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">⚠️ Recent Claims</h2>
              <div className="text-sm text-gray-500">Total: {claims.length}</div>
            </div>

            {claims.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <div className="text-4xl mb-3">🛡️</div>
                <p className="font-medium">No claims registered yet.</p>
                <p className="text-sm mt-1">Click "Register New Claim" to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 text-left font-bold text-gray-600">LR No</th>
                      <th className="p-4 text-left font-bold text-gray-600">Date</th>
                      <th className="p-4 text-left font-bold text-gray-600">Type</th>
                      <th className="p-4 text-right font-bold text-gray-600">Claim Amount</th>
                      <th className="p-4 text-right font-bold text-gray-600">Settled</th>
                      <th className="p-4 text-center font-bold text-gray-600">Status</th>
                      <th className="p-4 text-center font-bold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map(c => (
                      <tr key={c.id} className="border-t hover:bg-rose-50/30 transition-colors">
                        <td className="p-4 font-bold text-rose-700">{c.lr_no}</td>
                        <td className="p-4">{c.claim_date ? formatDate(c.claim_date) : '-'}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-700">{c.claim_type}</span>
                        </td>
                        <td className="p-4 text-right font-bold text-red-600">{formatCurrency(c.claim_amount)}</td>
                        <td className="p-4 text-right font-bold text-green-600">{formatCurrency(c.settled_amount)}</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(c.status)}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleEdit(c)} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold hover:bg-yellow-200">
                            ✏️ Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
