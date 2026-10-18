import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate, formatDateForInput } from '../utils/dateFormatter'

export default function POD({ branchMode = false }) {
  const navigate = useNavigate()
  const [pendingBilties, setPendingBilties] = useState([])
  const [deliveredBilties, setDeliveredBilties] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedBilty, setSelectedBilty] = useState(null)
  const [search, setSearch] = useState('')
  const [branches, setBranches] = useState([])
  const [branchFilter, setBranchFilter] = useState('')

  const [formData, setFormData] = useState({
    lr_no: '',
    delivery_date: formatDateForInput(new Date()),
    delivered_by: '',
    receiver_name: '',
    receiver_phone: '',
    delivery_remarks: '',
    photo_url: ''
  })

  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    fetchPODData()
    if (!branchMode) fetchBranches()
  }, [branchFilter, branchMode])

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const res = await fetch(`${apiUrl}/api/branches`, { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      setBranches(data.data || [])
    } catch (err) { console.error(err) }
  }

  const fetchPODData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      
      const branchParam = branchFilter ? `?branch_id=${branchFilter}` : ''
      const [podRes, biltyRes] = await Promise.all([
        fetch(`${apiUrl}/api/pod${branchParam}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/consignments${branchParam}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      const podData = await podRes.json()
      const biltyData = await biltyRes.json()

      const deliveredLRs = new Set((podData.data || []).map(p => p.lr_no))
      const allBilties = biltyData.data || []

      setPendingBilties(allBilties.filter(b => !deliveredLRs.has(b.lr_no) && b.status !== 'Cancelled'))
      setDeliveredBilties(podData.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.lr_no || !formData.receiver_name) {
      alert('LR No और Receiver Name जरूरी है!')
      return
    }
    try {
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const res = await fetch(`${apiUrl}/api/pod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...formData, branch_id: selectedBilty?.branch_id || user.branch_id })
      })
      if (res.ok) {
        alert('✅ POD submitted successfully! Delivery confirmed.')
        setShowForm(false)
        setSelectedBilty(null)
        resetForm()
        fetchPODData()
      } else {
        const err = await res.json()
        alert('Error: ' + (err.error || err.message))
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleSelectBilty = (bilty) => {
    setSelectedBilty(bilty)
    setFormData(prev => ({
      ...prev,
      lr_no: bilty.lr_no,
      delivered_by: user.username || ''
    }))
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
      lr_no: '',
      delivery_date: formatDateForInput(new Date()),
      delivered_by: user.username || '',
      receiver_name: '',
      receiver_phone: '',
      delivery_remarks: '',
      photo_url: ''
    })
  }

  const filteredPending = pendingBilties.filter(b => {
    if (!search) return true
    const s = search.toLowerCase()
    return (b.lr_no || '').toLowerCase().includes(s) ||
           (b.consignor_name || '').toLowerCase().includes(s) ||
           (b.consignee_name || '').toLowerCase().includes(s)
  })

  const filteredDelivered = deliveredBilties.filter(p => {
    if (!search) return true
    const s = search.toLowerCase()
    return (p.lr_no || '').toLowerCase().includes(s) ||
           (p.receiver_name || '').toLowerCase().includes(s)
  })

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-green-700 to-green-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="font-bold text-xl">📦 POD - Proof of Delivery</h1>
            <p className="text-xs text-green-200">
              Pending: {pendingBilties.length} | Delivered: {deliveredBilties.length}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/')} className="bg-green-800 text-white px-4 py-2 rounded-lg font-bold text-sm">← Dashboard</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="🔍 Search LR No, Consignor, Consignee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[250px] border p-2 rounded"
            />
            {!branchMode && (
              <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="border p-2 rounded">
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.branch_code} - {b.branch_name}</option>
                ))}
              </select>
            )}
            <button onClick={fetchPODData} className="bg-green-600 text-white px-4 py-2 rounded font-bold">🔄 Refresh</button>
          </div>
        </div>

        {showForm && selectedBilty && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-green-500">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-xl font-bold text-green-800">📦 Submit POD for LR: {selectedBilty.lr_no}</h2>
              <button onClick={() => { setShowForm(false); setSelectedBilty(null); resetForm() }} className="text-gray-500 hover:text-gray-700 text-xl font-bold">×</button>
            </div>

            <div className="bg-green-50 p-4 rounded-lg mb-4">
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div><b>LR No:</b> {selectedBilty.lr_no}</div>
                <div><b>Date:</b> {formatDate(selectedBilty.lr_date)}</div>
                <div><b>From → To:</b> {selectedBilty.from_name} → {selectedBilty.to_name}</div>
                <div><b>Consignor:</b> {selectedBilty.consignor_name}</div>
                <div><b>Consignee:</b> {selectedBilty.consignee_name}</div>
                <div><b>Amount:</b> ₹{parseFloat(selectedBilty.grand_total || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-bold text-gray-700">LR Number</label>
                  <input value={formData.lr_no} readOnly className="w-full border p-2 rounded mt-1 bg-gray-100 font-bold" />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Delivery Date *</label>
                  <input type="date" name="delivery_date" value={formData.delivery_date} onChange={(e) => setFormData({...formData, delivery_date: e.target.value})} className="w-full border p-2 rounded mt-1" required />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Delivered By</label>
                  <input name="delivered_by" value={formData.delivered_by} onChange={(e) => setFormData({...formData, delivered_by: e.target.value})} className="w-full border p-2 rounded mt-1" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-gray-700">Receiver Name *</label>
                  <input name="receiver_name" value={formData.receiver_name} onChange={(e) => setFormData({...formData, receiver_name: e.target.value})} className="w-full border-2 border-green-400 p-2 rounded mt-1 font-bold" required placeholder="Who received the goods?" />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Receiver Phone</label>
                  <input name="receiver_phone" value={formData.receiver_phone} onChange={(e) => setFormData({...formData, receiver_phone: e.target.value})} className="w-full border p-2 rounded mt-1" placeholder="Mobile number" />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">Delivery Remarks</label>
                <textarea name="delivery_remarks" value={formData.delivery_remarks} onChange={(e) => setFormData({...formData, delivery_remarks: e.target.value})} rows="3" className="w-full border p-2 rounded mt-1" placeholder="Any damage, shortage, or notes..."></textarea>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">Photo URL (Optional)</label>
                <input name="photo_url" value={formData.photo_url} onChange={(e) => setFormData({...formData, photo_url: e.target.value})} className="w-full border p-2 rounded mt-1" placeholder="https://... (delivery photo)" />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button type="submit" className="bg-green-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-800">
                  ✅ Confirm Delivery (Submit POD)
                </button>
                <button type="button" onClick={() => { setShowForm(false); setSelectedBilty(null); resetForm() }} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-400">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Pending Deliveries */}
        <div className="bg-white rounded-xl shadow mb-6">
          <div className="bg-orange-500 text-white px-4 py-3 rounded-t-xl flex justify-between items-center">
            <h3 className="font-bold text-lg">⏳ Pending Deliveries ({filteredPending.length})</h3>
            <span className="text-xs">Click on any LR to submit POD</span>
          </div>
          {loading ? (
            <div className="text-center py-10">Loading...</div>
          ) : filteredPending.length === 0 ? (
            <div className="p-8 text-center text-gray-500"> All bilties delivered!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left text-xs font-bold">LR No</th>
                    <th className="p-3 text-left text-xs font-bold">Date</th>
                    <th className="p-3 text-left text-xs font-bold">Consignor</th>
                    <th className="p-3 text-left text-xs font-bold">Consignee</th>
                    <th className="p-3 text-left text-xs font-bold">To</th>
                    <th className="p-3 text-left text-xs font-bold">Amount</th>
                    <th className="p-3 text-left text-xs font-bold">Status</th>
                    <th className="p-3 text-left text-xs font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPending.map(b => (
                    <tr key={b.id} className="border-t hover:bg-orange-50 cursor-pointer" onClick={() => handleSelectBilty(b)}>
                      <td className="p-3 font-bold text-red-700">{b.lr_no}</td>
                      <td className="p-3 text-sm">{formatDate(b.lr_date)}</td>
                      <td className="p-3 text-sm">{b.consignor_name}</td>
                      <td className="p-3 text-sm">{b.consignee_name}</td>
                      <td className="p-3 text-sm">{b.to_name}</td>
                      <td className="p-3 font-bold">₹{parseFloat(b.grand_total || 0).toLocaleString('en-IN')}</td>
                      <td className="p-3"><span className="px-2 py-1 rounded text-xs font-bold bg-orange-100 text-orange-700">⏳ In-Transit</span></td>
                      <td className="p-3"><button className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700">📦 Submit POD</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delivered */}
        <div className="bg-white rounded-xl shadow">
          <div className="bg-green-600 text-white px-4 py-3 rounded-t-xl">
            <h3 className="font-bold text-lg">✅ Delivered ({filteredDelivered.length})</h3>
          </div>
          {filteredDelivered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No deliveries yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left text-xs font-bold">LR No</th>
                    <th className="p-3 text-left text-xs font-bold">Delivery Date</th>
                    <th className="p-3 text-left text-xs font-bold">Receiver</th>
                    <th className="p-3 text-left text-xs font-bold">Phone</th>
                    <th className="p-3 text-left text-xs font-bold">Delivered By</th>
                    <th className="p-3 text-left text-xs font-bold">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDelivered.map(p => (
                    <tr key={p.id} className="border-t hover:bg-green-50">
                      <td className="p-3 font-bold text-green-700">{p.lr_no}</td>
                      <td className="p-3 text-sm">{formatDate(p.delivery_date)}</td>
                      <td className="p-3 text-sm font-bold">{p.receiver_name}</td>
                      <td className="p-3 text-sm">{p.receiver_phone || '-'}</td>
                      <td className="p-3 text-sm">{p.delivered_by || '-'}</td>
                      <td className="p-3 text-sm text-gray-600">{p.delivery_remarks || '-'}</td>
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
