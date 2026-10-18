import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate, formatDateForInput } from '../utils/dateFormatter'

export default function Drivers() {
  const navigate = useNavigate()
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDriver, setEditingDriver] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expiryAlerts, setExpiryAlerts] = useState([])

  const [formData, setFormData] = useState({
    driver_code: '',
    driver_name: '',
    father_name: '',
    aadhar_no: '',
    license_no: '',
    license_expiry: '',
    phone: '',
    address: '',
    photo_url: '',
    joining_date: formatDateForInput(new Date()),
    status: 'Active'
  })

  useEffect(() => {
    fetchDrivers()
    fetchExpiryAlerts()
  }, [])

  const fetchDrivers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const res = await fetch(`${apiUrl}/api/drivers`, { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      setDrivers(data.data || [])
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
    if (!formData.driver_code || !formData.driver_name) {
      alert('Driver Code और Driver Name जरूरी है!')
      return
    }
    try {
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      let res
      if (editingDriver) {
        res = await fetch(`${apiUrl}/api/drivers/${editingDriver.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(formData)
        })
      } else {
        res = await fetch(`${apiUrl}/api/drivers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(formData)
        })
      }
      if (res.ok) {
        alert(editingDriver ? '✅ Driver updated!' : '✅ Driver added!')
        setShowForm(false)
        setEditingDriver(null)
        resetForm()
        fetchDrivers()
      } else {
        const err = await res.json()
        alert('Error: ' + (err.error || err.message))
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleEdit = (driver) => {
    setEditingDriver(driver)
    setFormData({
      driver_code: driver.driver_code || '',
      driver_name: driver.driver_name || '',
      father_name: driver.father_name || '',
      aadhar_no: driver.aadhar_no || '',
      license_no: driver.license_no || '',
      license_expiry: formatDateForInput(driver.license_expiry),
      phone: driver.phone || '',
      address: driver.address || '',
      photo_url: driver.photo_url || '',
      joining_date: formatDateForInput(driver.joining_date),
      status: driver.status || 'Active'
    })
    setShowForm(true)
  }

  const handleStatusToggle = async (driver) => {
    if (!confirm(`क्या आप ${driver.driver_name} का status बदलना चाहते हैं?`)) return
    try {
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      await fetch(`${apiUrl}/api/drivers/${driver.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...driver, status: driver.status === 'Active' ? 'Inactive' : 'Active' })
      })
      fetchDrivers()
    } catch (err) {
      alert('Error updating status')
    }
  }

  const resetForm = () => {
    setFormData({
      driver_code: '',
      driver_name: '',
      father_name: '',
      aadhar_no: '',
      license_no: '',
      license_expiry: '',
      phone: '',
      address: '',
      photo_url: '',
      joining_date: formatDateForInput(new Date()),
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

  const filteredDrivers = drivers.filter(d => {
    const matchSearch = !search || 
      (d.driver_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.driver_code || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.phone || '').includes(search) ||
      (d.license_no || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || d.status === statusFilter
    return matchSearch && matchStatus
  })

  const activeDrivers = drivers.filter(d => d.status === 'Active').length
  const inactiveDrivers = drivers.filter(d => d.status !== 'Active').length

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-teal-700 to-teal-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="font-bold text-xl">🚗 Driver Master</h1>
            <p className="text-xs text-teal-200">
              Total: {drivers.length} | Active: {activeDrivers} | Inactive: {inactiveDrivers}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { resetForm(); setEditingDriver(null); setShowForm(true) }} className="bg-white text-teal-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-teal-50">+ Add Driver</button>
            <button onClick={() => navigate('/')} className="bg-teal-800 text-white px-4 py-2 rounded-lg font-bold text-sm">← Dashboard</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Expiry Alerts */}
        {expiryAlerts.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-red-800 mb-2">⚠️ Document Expiry Alerts (Next 30 Days)</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
              {expiryAlerts.slice(0, 6).map(v => (
                <div key={v.id} className="bg-white p-2 rounded border border-red-200 text-sm">
                  <b>{v.vehicle_no}</b> - Insurance expires: {v.insurance_expiry ? formatDate(v.insurance_expiry) : '-'}
                </div>
              ))}
            </div>
          </div>
        )}

        {showForm ? (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-xl font-bold text-teal-800">
                {editingDriver ? '✏️ Edit Driver' : '➕ Add New Driver'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingDriver(null); resetForm() }} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-bold text-gray-700">Driver Code *</label>
                  <input name="driver_code" value={formData.driver_code} onChange={handleChange} placeholder="e.g., DRV001" className="w-full border-2 border-teal-300 p-2 rounded mt-1 font-bold uppercase" required />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-bold text-gray-700">Driver Name *</label>
                  <input name="driver_name" value={formData.driver_name} onChange={handleChange} className="w-full border p-2 rounded mt-1" required />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-bold text-gray-700">Father's Name</label>
                  <input name="father_name" value={formData.father_name} onChange={handleChange} className="w-full border p-2 rounded mt-1" />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Aadhar Number</label>
                  <input name="aadhar_no" value={formData.aadhar_no} onChange={handleChange} className="w-full border p-2 rounded mt-1" placeholder="XXXX-XXXX-XXXX" />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Phone *</label>
                  <input name="phone" value={formData.phone} onChange={handleChange} className="w-full border p-2 rounded mt-1" required />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-bold text-gray-700">License Number *</label>
                  <input name="license_no" value={formData.license_no} onChange={handleChange} className="w-full border p-2 rounded mt-1" required />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">License Expiry *</label>
                  <input name="license_expiry" type="date" value={formData.license_expiry} onChange={handleChange} className="w-full border p-2 rounded mt-1" required />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Joining Date</label>
                  <input name="joining_date" type="date" value={formData.joining_date} onChange={handleChange} className="w-full border p-2 rounded mt-1" />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">Full Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange} rows="2" className="w-full border p-2 rounded mt-1"></textarea>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-gray-700">Photo URL</label>
                  <input name="photo_url" value={formData.photo_url} onChange={handleChange} className="w-full border p-2 rounded mt-1" placeholder="https://..." />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full border p-2 rounded mt-1">
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>On Leave</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button type="submit" className="bg-teal-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-800">
                  {editingDriver ? '💾 Update Driver' : '✅ Add Driver'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingDriver(null); resetForm() }} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-400">
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
                  placeholder="🔍 Search by name, code, phone, license..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 min-w-[250px] border p-2 rounded"
                />
                <div className="flex gap-2">
                  {[
                    { id: 'all', label: `All (${drivers.length})` },
                    { id: 'Active', label: `Active (${activeDrivers})` },
                    { id: 'Inactive', label: `Inactive (${inactiveDrivers})` }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setStatusFilter(f.id)}
                      className={`px-3 py-2 rounded text-sm font-bold transition ${statusFilter === f.id ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-20 text-xl">Loading drivers...</div>
            ) : filteredDrivers.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-12 text-center">
                <div className="text-6xl mb-4"></div>
                <h2 className="text-2xl font-bold text-gray-700 mb-2">No Drivers Found</h2>
                <p className="text-gray-500 mb-4">अपना पहला driver add करें</p>
                <button onClick={() => setShowForm(true)} className="bg-teal-700 text-white px-6 py-2 rounded-lg font-bold">+ Add First Driver</button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDrivers.map(driver => {
                  const daysUntilExpiry = getDaysUntilExpiry(driver.license_expiry)
                  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0
                  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0
                  
                  return (
                    <div key={driver.id} className={`bg-white rounded-xl shadow-lg overflow-hidden border-l-4 ${driver.status === 'Active' ? 'border-teal-600' : 'border-gray-400 opacity-75'}`}>
                      <div className="bg-gradient-to-r from-teal-600 to-teal-800 text-white p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs text-teal-200 font-bold">DRIVER CODE</div>
                            <div className="text-2xl font-black">{driver.driver_code}</div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            driver.status === 'Active' ? 'bg-green-500' : 
                            driver.status === 'On Leave' ? 'bg-yellow-500' : 'bg-gray-500'
                          }`}>
                            {driver.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-lg text-gray-800 mb-1">{driver.driver_name}</h3>
                        {driver.father_name && <p className="text-sm text-gray-600">S/o: {driver.father_name}</p>}
                        {driver.phone && <p className="text-sm text-gray-500">📞 {driver.phone}</p>}
                        
                        <div className="mt-3 pt-3 border-t space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">License:</span>
                            <span className="font-bold">{driver.license_no || '-'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Expiry:</span>
                            <span className={`font-bold ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : 'text-green-600'}`}>
                              {driver.license_expiry ? formatDate(driver.license_expiry) : '-'}
                              {isExpired && ' ⚠️ EXPIRED'}
                              {isExpiringSoon && ` ⚠️ ${daysUntilExpiry} days`}
                            </span>
                          </div>
                          {driver.joining_date && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Joined:</span>
                              <span className="font-bold">{formatDate(driver.joining_date)}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mt-4">
                          <button onClick={() => handleEdit(driver)} className="flex-1 bg-blue-600 text-white py-2 rounded text-xs font-bold hover:bg-blue-700">✏️ Edit</button>
                          <button onClick={() => handleStatusToggle(driver)} className={`flex-1 py-2 rounded text-xs font-bold ${driver.status === 'Active' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                            {driver.status === 'Active' ? '⏸️ Deactivate' : '▶️ Activate'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
