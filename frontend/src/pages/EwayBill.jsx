import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate, formatDateForInput } from '../utils/dateFormatter'

export default function EwayBill() {
  const navigate = useNavigate()
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState(null)
  
  const [formData, setFormData] = useState({
    eway_bill_no: '',
    eway_valid_upto: '',
    transporter_id: '',
    transporter_name: ''
  })

  useEffect(() => {
    fetchBills()
  }, [])

  const fetchBills = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const headers = { 'Authorization': `Bearer ${token}` }

      const res = await fetch(`${apiUrl}/api/eway-bills`, { headers })
      if (res.ok) {
        const data = await res.json()
        setBills(data.data || [])
      }
    } catch (err) {
      console.error('Eway fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (bill) => {
    setEditId(bill.id)
    setFormData({
      eway_bill_no: bill.eway_bill_no || '',
      eway_valid_upto: formatDateForInput(bill.eway_valid_upto),
      transporter_id: bill.transporter_id || '',
      transporter_name: bill.transporter_name || ''
    })
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      
      const res = await fetch(`${apiUrl}/api/eway-bills/${editId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        alert('E-Way Bill details updated successfully!')
        setEditId(null)
        setFormData({ eway_bill_no: '', eway_valid_upto: '', transporter_id: '', transporter_name: '' })
        fetchBills()
      } else {
        const err = await res.json()
        alert('Error: ' + err.error)
      }
    } catch (err) {
      console.error('Update error:', err)
      alert('Failed to update')
    }
  }

  const formatCurrency = (amount) => {
    return '₹' + parseFloat(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700"></div>
          <p className="mt-4 text-gray-500">Loading E-Way Bills...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="bg-white/20 p-2 rounded-lg hover:bg-white/30">← Back</button>
            <div>
              <h1 className="font-bold text-xl">📄 E-Way Bill Generator</h1>
              <p className="text-xs text-indigo-200">Smart GST Compliance (₹50K Inter-state / ₹1L Intra-state)</p>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {editId && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-2 border-indigo-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">✏️ Update E-Way Bill Details</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Way Bill Number *</label>
                <input required type="text" name="eway_bill_no" value={formData.eway_bill_no} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 331026000000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Upto *</label>
                <input required type="date" name="eway_valid_upto" value={formData.eway_valid_upto} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transporter ID</label>
                <input type="text" name="transporter_id" value={formData.transporter_id} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="GSTIN of Transporter" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transporter Name</label>
                <input type="text" name="transporter_name" value={formData.transporter_name} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500" placeholder="e.g., TCI Express" />
              </div>
              <div className="md:col-span-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setEditId(null)} className="px-6 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-indigo-700 text-white rounded-lg font-bold hover:bg-indigo-800 shadow">💾 Save Details</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">📋 Consignments Requiring E-Way Bill</h2>
            <div className="text-sm text-gray-500">Total: {bills.length}</div>
          </div>

          {bills.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="text-4xl mb-3">📄</div>
              <p className="font-medium">No consignments require E-Way Bill right now.</p>
              <p className="text-sm mt-1">Bilties with declared value over ₹50,000 (or ₹1,00,000 for same state) will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-left font-bold text-gray-600">LR No</th>
                    <th className="p-4 text-left font-bold text-gray-600">Route (State)</th>
                    <th className="p-4 text-right font-bold text-gray-600">Declared Value</th>
                    <th className="p-4 text-left font-bold text-gray-600">E-Way Bill No</th>
                    <th className="p-4 text-left font-bold text-gray-600">Valid Upto</th>
                    <th className="p-4 text-center font-bold text-gray-600">Status</th>
                    <th className="p-4 text-center font-bold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map(b => {
                    const isSameState = b.from_state && b.to_state && b.from_state.toUpperCase().trim() === b.to_state.toUpperCase().trim();
                    const limit = isSameState ? '₹1,00,000' : '₹50,000';
                    
                    return (
                      <tr key={b.id} className="border-t hover:bg-indigo-50/30 transition-colors">
                        <td className="p-4 font-bold text-indigo-700">{b.lr_no}</td>
                        <td className="p-4">
                          <div className="font-medium text-xs">{b.from_name || 'N/A'} → {b.to_name || 'N/A'}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {b.from_state || '?'} → {b.to_state || '?'} 
                            <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold ${isSameState ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                              Limit: {limit}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right font-bold text-green-700">{formatCurrency(b.declared_value)}</td>
                        <td className="p-4">
                          {b.eway_bill_no ? (
                            <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-bold">{b.eway_bill_no}</span>
                          ) : (
                            <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold">Pending</span>
                          )}
                        </td>
                        <td className="p-4 text-xs">{b.eway_valid_upto ? formatDate(b.eway_valid_upto) : '-'}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${b.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleEdit(b)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold hover:bg-indigo-200">
                            {b.eway_bill_no ? '✏️ Edit' : '➕ Generate'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
