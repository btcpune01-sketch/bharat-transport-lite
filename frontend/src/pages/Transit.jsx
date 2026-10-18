import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '../utils/dateFormatter'

export default function Transit() {
  const navigate = useNavigate()
  const [manifests, setManifests] = useState([])
  const [availableLrs, setAvailableLrs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  
  const [formData, setFormData] = useState({
    from_branch: '',
    to_branch: '',
    vehicle_no: '',
    driver_name: '',
    driver_mobile: '',
    remarks: ''
  })
  const [selectedLrs, setSelectedLrs] = useState([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const headers = { 'Authorization': `Bearer ${token}` }

      // Fetch Manifests
      const resManifests = await fetch(`${apiUrl}/api/manifests`, { headers })
      if (resManifests.ok) {
        const data = await resManifests.json()
        setManifests(data.data || [])
      }

      // Fetch Booked LRs for selection (Limit 100 for performance)
      const resLrs = await fetch(`${apiUrl}/api/consignments?status=Booked`, { headers })
      if (resLrs.ok) {
        const data = await resLrs.json()
        setAvailableLrs((data.data || []).slice(0, 100))
      }
    } catch (err) {
      console.error('Transit fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckboxChange = (lr) => {
    if (selectedLrs.find(item => item.lr_no === lr.lr_no)) {
      setSelectedLrs(selectedLrs.filter(item => item.lr_no !== lr.lr_no))
    } else {
      setSelectedLrs([...selectedLrs, lr])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedLrs.length === 0) {
      alert('Please select at least one LR/Bilty!')
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      
      const payload = {
        ...formData,
        lr_nos: selectedLrs.map(lr => lr.lr_no).join(','),
        status: 'Dispatched'
      }

      const res = await fetch(`${apiUrl}/api/manifests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        alert('Manifest Created Successfully! LRs status updated to In-Transit.')
        setShowForm(false)
        setFormData({ from_branch: '', to_branch: '', vehicle_no: '', driver_name: '', driver_mobile: '', remarks: '' })
        setSelectedLrs([])
        fetchData() // Refresh list
      } else {
        const err = await res.json()
        alert('Error: ' + err.error)
      }
    } catch (err) {
      console.error('Manifest create error:', err)
      alert('Failed to create manifest')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return '₹' + parseFloat(amount || 0).toLocaleString('en-IN')
  }

  if (loading && manifests.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700"></div>
          <p className="mt-4 text-gray-500">Loading Transit Data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <nav className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="bg-white/20 p-2 rounded-lg hover:bg-white/30">← Back</button>
            <div>
              <h1 className="font-bold text-xl">🔄 Transit & Manifest Management</h1>
              <p className="text-xs text-indigo-200">Hub-to-Hub Transfer & Vehicle Dispatch (TCI Style)</p>
            </div>
          </div>
          {!showForm && (
            <button 
              onClick={() => setShowForm(true)}
              className="bg-white text-indigo-700 px-5 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 shadow flex items-center gap-2"
            >
              <span>+</span> Create New Manifest
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {showForm ? (
          /* CREATE MANIFEST FORM */
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">📝 Create New Manifest</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Branch</label>
                  <input required type="text" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500" 
                    placeholder="e.g., DEL-01" value={formData.from_branch} onChange={e => setFormData({...formData, from_branch: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Branch (Destination)</label>
                  <input required type="text" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500" 
                    placeholder="e.g., MUM-02" value={formData.to_branch} onChange={e => setFormData({...formData, to_branch: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                  <input required type="text" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 uppercase" 
                    placeholder="e.g., DL-1C-AB-1234" value={formData.vehicle_no} onChange={e => setFormData({...formData, vehicle_no: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                  <input required type="text" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500" 
                    placeholder="Driver Name" value={formData.driver_name} onChange={e => setFormData({...formData, driver_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver Mobile</label>
                  <input required type="text" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500" 
                    placeholder="9876543210" value={formData.driver_mobile} onChange={e => setFormData({...formData, driver_mobile: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                  <input type="text" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500" 
                    placeholder="Any special instructions" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
                </div>
              </div>

              {/* LR Selection Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-gray-800">📦 Select Bilties / LRs to Dispatch ({selectedLrs.length} selected)</h3>
                  <span className="text-sm text-indigo-600 font-medium">Showing recent 'Booked' LRs</span>
                </div>
                
                <div className="border rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-indigo-50 sticky top-0">
                      <tr>
                        <th className="p-3 text-left w-10">☑️</th>
                        <th className="p-3 text-left">LR No</th>
                        <th className="p-3 text-left">Consignor</th>
                        <th className="p-3 text-left">To</th>
                        <th className="p-3 text-right">Pkgs</th>
                        <th className="p-3 text-right">Weight</th>
                        <th className="p-3 text-right">Freight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableLrs.length === 0 ? (
                        <tr><td colSpan="7" className="p-4 text-center text-gray-500">No 'Booked' LRs available for dispatch.</td></tr>
                      ) : (
                        availableLrs.map(lr => (
                          <tr key={lr.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => handleCheckboxChange(lr)}>
                            <td className="p-3 text-center">
                              <input type="checkbox" checked={!!selectedLrs.find(item => item.lr_no === lr.lr_no)} onChange={() => handleCheckboxChange(lr)} className="w-4 h-4 text-indigo-600 rounded" />
                            </td>
                            <td className="p-3 font-bold text-indigo-700">{lr.lr_no}</td>
                            <td className="p-3">{lr.consignor_name}</td>
                            <td className="p-3">{lr.to_name || lr.consignee_name}</td>
                            <td className="p-3 text-right">{lr.packages || '-'}</td>
                            <td className="p-3 text-right">{lr.actual_weight || lr.charged_weight || '-'} Kg</td>
                            <td className="p-3 text-right font-medium">{formatCurrency(lr.grand_total)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary & Actions */}
              <div className="bg-indigo-50 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-700">
                  <span className="font-bold text-indigo-800 text-lg">{selectedLrs.length}</span> LRs selected for this manifest.
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowForm(false); setSelectedLrs([]); }} className="px-6 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="px-6 py-2.5 bg-indigo-700 text-white rounded-lg font-bold hover:bg-indigo-800 shadow disabled:opacity-50 flex items-center gap-2">
                    {loading ? 'Saving...' : '🚀 Save & Dispatch Manifest'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* MANIFEST LIST VIEW */
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">📋 Recent Manifests</h2>
              <div className="text-sm text-gray-500">Total: {manifests.length}</div>
            </div>
            
            {manifests.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <div className="text-4xl mb-3">📦</div>
                <p className="font-medium">No manifests created yet.</p>
                <p className="text-sm mt-1">Click "Create New Manifest" to dispatch bilties.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 text-left font-bold text-gray-600">Manifest No</th>
                      <th className="p-4 text-left font-bold text-gray-600">Date</th>
                      <th className="p-4 text-left font-bold text-gray-600">Route</th>
                      <th className="p-4 text-left font-bold text-gray-600">Vehicle & Driver</th>
                      <th className="p-4 text-center font-bold text-gray-600">Total LRs</th>
                      <th className="p-4 text-left font-bold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manifests.map(m => (
                      <tr key={m.id} className="border-t hover:bg-indigo-50/30 transition-colors">
                        <td className="p-4 font-bold text-indigo-700">{m.manifest_no}</td>
                        <td className="p-4 text-gray-600">{formatDate(m.manifest_date)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{m.from_branch}</span>
                            <span className="text-gray-400">→</span>
                            <span className="font-medium">{m.to_branch}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-gray-800">{m.vehicle_no}</div>
                          <div className="text-xs text-gray-500">{m.driver_name} ({m.driver_mobile})</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-bold text-xs">
                            {m.total_lrs || 0} LRs
                          </span>
                        </td>
                        <td className="p-4">
                          {m.status === 'Dispatched' ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">🚚 Dispatched</span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">📝 Created</span>
                          )}
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
