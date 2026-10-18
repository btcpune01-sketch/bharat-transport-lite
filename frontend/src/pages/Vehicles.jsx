import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate, formatDateForInput } from '../utils/dateFormatter'

export default function Vehicles() {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expiryAlerts, setExpiryAlerts] = useState([])

  const [formData, setFormData] = useState({
    vehicle_no: '',
    vehicle_type: 'Truck',
    owner_name: '',
    owner_phone: '',
    rc_expiry: '',
    insurance_expiry: '',
    fitness_expiry: '',
    permit_expiry: '',
    puc_expiry: '',
    status: 'Active'
  })

  useEffect(() => {
    fetchVehicles()
    fetchExpiryAlerts()
  }, [])

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const res = await fetch(`${apiUrl}/api/vehicles`, { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      setVehicles(data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchExpiryAlerts = async () => {
    try {
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const res = await fetch(`${apiUrl}/api/vehicles/expiring`, { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      setExpiryAlerts(data.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.vehicle_no || !formData.owner_name) {
      alert('Vehicle No और Owner Name जरूरी है!')
      return
    }
    try {
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      let res
      if (editingVehicle) {
        res = await fetch(`${apiUrl}/api/vehicles/${editingVehicle.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(formData)
        })
      } else {
        res = await fetch(`${apiUrl}/api/vehicles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(formData)
        })
      }
      if (res.ok) {
        alert(editingVehicle ? '✅ Vehicle updated!' : '✅ Vehicle added!')
        setShowForm(false)
        setEditingVehicle(null)
        resetForm()
        fetchVehicles()
        fetchExpiryAlerts()
      } else {
        const err = await res.json()
        alert('Error: ' + (err.error || err.message))
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle)
    setFormData({
      vehicle_no: vehicle.vehicle_no || '',
      vehicle_type: vehicle.vehicle_type || 'Truck',
      owner_name: vehicle.owner_name || '',
      owner_phone: vehicle.owner_phone || '',
      rc_expiry: formatDateForInput(vehicle.rc_expiry),
      insurance_expiry: formatDateForInput(vehicle.insurance_expiry),
      fitness_expiry: formatDateForInput(vehicle.fitness_expiry),
      permit_expiry: formatDateForInput(vehicle.permit_expiry),
      puc_expiry: formatDateForInput(vehicle.puc_expiry),
      status: vehicle.status || 'Active'
    })
    setShowForm(true)
  }

  const handleStatusToggle = async (vehicle) => {
    if (!confirm(`क्या आप ${vehicle.vehicle_no} का status बदलना चाहते हैं?`)) return
    try {
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      await fetch(`${apiUrl}/api/vehicles/${vehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...vehicle, status: vehicle.status === 'Active' ? 'Inactive' : 'Active' })
      })
      fetchVehicles()
    } catch (err) {
      alert('Error updating status')
    }
  }

  const resetForm = () => {
    setFormData({
      vehicle_no: '',
      vehicle_type: 'Truck',
      owner_name: '',
      owner_phone: '',
      rc_expiry: '',
      insurance_expiry: '',
      fitness_expiry: '',
      permit_expiry: '',
      puc_expiry: '',
      status: 'Active'
    })
  }

  const getDaysUntilExpiry = (dateStr) => {
    if (!dateStr) return null
    const expiry = formatDateForInput(dateStr).split('-').map(Number)
    const today = formatDateForInput(new Date()).split('-').map(Number)
    if (expiry.length !== 3 || expiry.some(Number.isNaN)) return null
    return (Date.UTC(expiry[0], expiry[1] - 1, expiry[2]) - Date.UTC(today[0], today[1] - 1, today[2])) / (1000 * 60 * 60 * 24)
  }

  const isExpiringSoon = (dateStr) => {
    const days = getDaysUntilExpiry(dateStr)
    return days !== null && days <= 30 && days >= 0
  }

  const isExpired = (dateStr) => {
    const days = getDaysUntilExpiry(dateStr)
    return days !== null && days < 0
  }

  const filteredVehicles = vehicles.filter(v => {
    const matchSearch = !search || 
      (v.vehicle_no || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.owner_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.owner_phone || '').includes(search)
    const matchStatus = statusFilter === 'all' || v.status === statusFilter
    return matchSearch && matchStatus
  })

  const activeVehicles = vehicles.filter(v => v.status === 'Active').length
  const inactiveVehicles = vehicles.filter(v => v.status !== 'Active').length

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="font-bold text-xl">🚛 Vehicle Master</h1>
            <p className="text-xs text-blue-200">
              Total: {vehicles.length} | Active: {activeVehicles} | Inactive: {inactiveVehicles}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { resetForm(); setEditingVehicle(null); setShowForm(true) }} className="bg-white text-blue-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-50">+ Add Vehicle</button>
            <button onClick={() => navigate('/')} className="bg-blue-800 text-white px-4 py-2 rounded-lg font-bold text-sm">← Dashboard</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Expiry Alerts Banner */}
        {expiryAlerts.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
              ⚠️ Document Expiry Alerts (Next 30 Days)
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {expiryAlerts.map(v => (
                <div key={v.id} className="bg-white p-3 rounded border border-red-200 text-sm shadow-sm">
                  <div className="font-bold text-gray-800">{v.vehicle_no} <span className="text-xs font-normal text-gray-500">({v.vehicle_type})</span></div>
                  <div className="mt-1 space-y-1">
                    {isExpired(v.insurance_expiry) && <div className="text-red-600">❌ Insurance Expired: {formatDate(v.insurance_expiry)}</div>}
                    {isExpiringSoon(v.insurance_expiry) && !isExpired(v.insurance_expiry) && <div className="text-orange-600">⚠️ Insurance expires in {getDaysUntilExpiry(v.insurance_expiry)} days</div>}
                    {isExpired(v.fitness_expiry) && <div className="text-red-600">❌ Fitness Expired: {formatDate(v.fitness_expiry)}</div>}
                    {isExpiringSoon(v.fitness_expiry) && !isExpired(v.fitness_expiry) && <div className="text-orange-600">⚠️ Fitness expires in {getDaysUntilExpiry(v.fitness_expiry)} days</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showForm ? (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-xl font-bold text-blue-800">
                {editingVehicle ? '✏️ Edit Vehicle' : '➕ Add New Vehicle'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingVehicle(null); resetForm() }} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-bold text-gray-700">Vehicle Number *</label>
                  <input name="vehicle_no" value={formData.vehicle_no} onChange={handleChange} placeholder="e.g., RJ-14-AB-1234" className="w-full border-2 border-blue-300 p-2 rounded mt-1 font-bold uppercase" required />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Vehicle Type</label>
                  <select name="vehicle_type" value={formData.vehicle_type} onChange={handleChange} className="w-full border p-2 rounded mt-1">
                    <option>Truck</option>
                    <option>Trailer</option>
                    <option>Container</option>
                    <option>Tempo</option>
                    <option>Pickup</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full border p-2 rounded mt-1">
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>Under Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-gray-700">Owner Name *</label>
                  <input name="owner_name" value={formData.owner_name} onChange={handleChange} className="w-full border p-2 rounded mt-1" required />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Owner Phone</label>
                  <input name="owner_phone" value={formData.owner_phone} onChange={handleChange} className="w-full border p-2 rounded mt-1" />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold text-gray-800 mb-3">📄 Document Expiry Dates</h3>
                <div className="grid md:grid-cols-5 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700">RC Expiry</label>
                    <input name="rc_expiry" type="date" value={formData.rc_expiry} onChange={handleChange} className="w-full border p-2 rounded mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700">Insurance Expiry *</label>
                    <input name="insurance_expiry" type="date" value={formData.insurance_expiry} onChange={handleChange} className={`w-full border p-2 rounded mt-1 ${isExpiringSoon(formData.insurance_expiry) ? 'border-orange-500 bg-orange-50' : ''}`} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700">Fitness Expiry *</label>
                    <input name="fitness_expiry" type="date" value={formData.fitness_expiry} onChange={handleChange} className={`w-full border p-2 rounded mt-1 ${isExpiringSoon(formData.fitness_expiry) ? 'border-orange-500 bg-orange-50' : ''}`} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700">Permit Expiry</label>
                    <input name="permit_expiry" type="date" value={formData.permit_expiry} onChange={handleChange} className="w-full border p-2 rounded mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700">PUC Expiry</label>
                    <input name="puc_expiry" type="date" value={formData.puc_expiry} onChange={handleChange} className="w-full border p-2 rounded mt-1" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button type="submit" className="bg-blue-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-800">
                  {editingVehicle ? '💾 Update Vehicle' : '✅ Add Vehicle'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingVehicle(null); resetForm() }} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-400">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Search & Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex flex-wrap gap-3 items-center">
                <input
                  type="text"
                  placeholder="🔍 Search by Vehicle No, Owner Name, Phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 min-w-[250px] border p-2 rounded"
                />
                <div className="flex gap-2">
                  {[
                    { id: 'all', label: `All (${vehicles.length})` },
                    { id: 'Active', label: `Active (${activeVehicles})` },
                    { id: 'Inactive', label: `Inactive (${inactiveVehicles})` }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setStatusFilter(f.id)}
                      className={`px-3 py-2 rounded text-sm font-bold transition ${statusFilter === f.id ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-20 text-xl">Loading vehicles...</div>
            ) : filteredVehicles.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-12 text-center">
                <div className="text-6xl mb-4">🚛</div>
                <h2 className="text-2xl font-bold text-gray-700 mb-2">No Vehicles Found</h2>
                <p className="text-gray-500 mb-4">अपना पहला vehicle add करें</p>
                <button onClick={() => setShowForm(true)} className="bg-blue-700 text-white px-6 py-2 rounded-lg font-bold">+ Add First Vehicle</button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVehicles.map(v => (
                  <div key={v.id} className={`bg-white rounded-xl shadow-lg overflow-hidden border-l-4 ${v.status === 'Active' ? 'border-blue-600' : 'border-gray-400 opacity-75'}`}>
                    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs text-blue-200 font-bold">VEHICLE NO</div>
                          <div className="text-2xl font-black">{v.vehicle_no}</div>
                          <div className="text-sm text-blue-100">{v.vehicle_type}</div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          v.status === 'Active' ? 'bg-green-500' : 
                          v.status === 'Under Maintenance' ? 'bg-yellow-500' : 'bg-gray-500'
                        }`}>
                          {v.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg text-gray-800 mb-1">{v.owner_name}</h3>
                      {v.owner_phone && <p className="text-sm text-gray-500 mb-3">📞 {v.owner_phone}</p>}
                      
                      <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Insurance:</span>
                          <span className={`font-bold ${isExpired(v.insurance_expiry) ? 'text-red-600' : isExpiringSoon(v.insurance_expiry) ? 'text-orange-600' : 'text-green-600'}`}>
                            {v.insurance_expiry ? formatDate(v.insurance_expiry) : '-'} {isExpired(v.insurance_expiry) && '❌'} {isExpiringSoon(v.insurance_expiry) && !isExpired(v.insurance_expiry) && '⚠️'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fitness:</span>
                          <span className={`font-bold ${isExpired(v.fitness_expiry) ? 'text-red-600' : isExpiringSoon(v.fitness_expiry) ? 'text-orange-600' : 'text-green-600'}`}>
                            {v.fitness_expiry ? formatDate(v.fitness_expiry) : '-'} {isExpired(v.fitness_expiry) && '❌'} {isExpiringSoon(v.fitness_expiry) && !isExpired(v.fitness_expiry) && '⚠️'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Permit:</span>
                          <span className="font-bold text-gray-800">{v.permit_expiry ? formatDate(v.permit_expiry) : '-'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button onClick={() => handleEdit(v)} className="flex-1 bg-blue-600 text-white py-2 rounded text-xs font-bold hover:bg-blue-700">✏️ Edit</button>
                        <button onClick={() => handleStatusToggle(v)} className={`flex-1 py-2 rounded text-xs font-bold ${v.status === 'Active' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                          {v.status === 'Active' ? '⏸️ Deactivate' : '▶️ Activate'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
