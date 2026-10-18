import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate, formatDateForInput } from '../utils/dateFormatter'

export default function Trips() {
  const navigate = useNavigate()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)

  const [formData, setFormData] = useState({
    trip_no: '',
    trip_date: formatDateForInput(new Date()),
    vehicle_no: '',
    driver_name: '',
    driver_mobile: '',
    from_branch: '',
    to_branch: '',
    via_hub: '',
    expected_departure: '',
    expected_arrival: '',
    distance_km: '',
    estimated_days: '',
    status: 'Planning',
    remarks: ''
  })

  useEffect(() => {
    fetchTrips()
  }, [])

  const fetchTrips = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const headers = { 'Authorization': `Bearer ${token}` }

      const res = await fetch(`${apiUrl}/api/trips`, { headers })
      if (res.ok) {
        const data = await res.json()
        setTrips(data.data || [])
      }
    } catch (err) {
      console.error('Trips fetch error:', err)
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

      const url = editId ? `${apiUrl}/api/trips/${editId}` : `${apiUrl}/api/trips`
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
        alert(editId ? 'Trip updated successfully!' : 'Trip created successfully!')
        setShowForm(false)
        setEditId(null)
        setFormData({
          trip_no: '',
          trip_date: formatDateForInput(new Date()),
          vehicle_no: '',
          driver_name: '',
          driver_mobile: '',
          from_branch: '',
          to_branch: '',
          via_hub: '',
          expected_departure: '',
          expected_arrival: '',
          distance_km: '',
          estimated_days: '',
          status: 'Planning',
          remarks: ''
        })
        fetchTrips()
      } else {
        const err = await res.json()
        alert('Error: ' + err.error)
      }
    } catch (err) {
      console.error('Trip save error:', err)
      alert('Failed to save trip')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (trip) => {
    setFormData({
      ...trip,
      trip_date: formatDateForInput(trip.trip_date),
      expected_departure: formatDateForInput(trip.expected_departure),
      expected_arrival: formatDateForInput(trip.expected_arrival)
    })
    setEditId(trip.id)
    setShowForm(true)
  }

  const handleStatusChange = async (tripId, newStatus) => {
    try {
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      
      const res = await fetch(`${apiUrl}/api/trips/${tripId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        fetchTrips()
      }
    } catch (err) {
      console.error('Status update error:', err)
    }
  }

  if (loading && trips.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-700"></div>
          <p className="mt-4 text-gray-500">Loading Trips...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-cyan-700 to-cyan-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="bg-white/20 p-2 rounded-lg hover:bg-white/30">← Back</button>
            <div>
              <h1 className="font-bold text-xl">🚛 Trip Management</h1>
              <p className="text-xs text-cyan-200">Vehicle Assignment & Trip Tracking (TCI Style)</p>
            </div>
          </div>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setEditId(null); }}
              className="bg-white text-cyan-700 px-5 py-2 rounded-lg font-bold text-sm hover:bg-cyan-50 shadow flex items-center gap-2"
            >
              <span>+</span> Create New Trip
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {showForm ? (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">
              {editId ? '✏️ Edit Trip' : '📝 Create New Trip'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trip Date *</label>
                  <input required type="date" name="trip_date" value={formData.trip_date} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number *</label>
                  <input required type="text" name="vehicle_no" value={formData.vehicle_no} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-cyan-500 uppercase" placeholder="e.g., DL-1C-AB-1234" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name *</label>
                  <input required type="text" name="driver_name" value={formData.driver_name} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-cyan-500" placeholder="Driver name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver Mobile *</label>
                  <input required type="text" name="driver_mobile" value={formData.driver_mobile} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-cyan-500" placeholder="9876543210" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Branch *</label>
                  <input required type="text" name="from_branch" value={formData.from_branch} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-cyan-500" placeholder="e.g., DEL-01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Branch *</label>
                  <input required type="text" name="to_branch" value={formData.to_branch} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-cyan-500" placeholder="e.g., MUM-02" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Via Hub (Optional)</label>
                  <input type="text" name="via_hub" value={formData.via_hub} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-cyan-500" placeholder="e.g., JAI-01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Departure</label>
                  <input type="date" name="expected_departure" value={formData.expected_departure} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Arrival</label>
                  <input type="date" name="expected_arrival" value={formData.expected_arrival} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Distance (Km)</label>
                  <input type="number" name="distance_km" value={formData.distance_km} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-cyan-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Days</label>
                  <input type="number" name="estimated_days" value={formData.estimated_days} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-cyan-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select required name="status" value={formData.status} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-cyan-500">
                    <option value="Planning">Planning</option>
                    <option value="Started">Started</option>
                    <option value="In-Transit">In-Transit</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="3" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-cyan-500" placeholder="Any special instructions..."></textarea>
              </div>

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="px-6 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-8 py-2.5 bg-cyan-700 text-white rounded-lg font-bold hover:bg-cyan-800 shadow disabled:opacity-50">
                  {loading ? 'Saving...' : editId ? '🔄 Update Trip' : '✅ Create Trip'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">📋 Recent Trips</h2>
              <div className="text-sm text-gray-500">Total: {trips.length}</div>
            </div>

            {trips.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <div className="text-4xl mb-3">🚛</div>
                <p className="font-medium">No trips created yet.</p>
                <p className="text-sm mt-1">Click "Create New Trip" to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 text-left font-bold text-gray-600">Trip No</th>
                      <th className="p-4 text-left font-bold text-gray-600">Date</th>
                      <th className="p-4 text-left font-bold text-gray-600">Vehicle</th>
                      <th className="p-4 text-left font-bold text-gray-600">Driver</th>
                      <th className="p-4 text-left font-bold text-gray-600">Route</th>
                      <th className="p-4 text-center font-bold text-gray-600">Status</th>
                      <th className="p-4 text-center font-bold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map(t => (
                      <tr key={t.id} className="border-t hover:bg-cyan-50/30 transition-colors">
                        <td className="p-4 font-bold text-cyan-700">{t.trip_no}</td>
                        <td className="p-4">{t.trip_date ? formatDate(t.trip_date) : '-'}</td>
                        <td className="p-4 font-medium">{t.vehicle_no}</td>
                        <td className="p-4">
                          <div className="font-medium">{t.driver_name}</div>
                          <div className="text-xs text-gray-500">{t.driver_mobile}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{t.from_branch} → {t.to_branch}</div>
                          {t.via_hub && <div className="text-xs text-gray-500">via {t.via_hub}</div>}
                        </td>
                        <td className="p-4 text-center">
                          <select 
                            value={t.status} 
                            onChange={(e) => handleStatusChange(t.id, e.target.value)}
                            className={`px-3 py-1 rounded-full text-xs font-bold border-0 cursor-pointer ${
                              t.status === 'Completed' ? 'bg-green-100 text-green-700' :
                              t.status === 'In-Transit' ? 'bg-blue-100 text-blue-700' :
                              t.status === 'Started' ? 'bg-yellow-100 text-yellow-700' :
                              t.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}
                          >
                            <option value="Planning">Planning</option>
                            <option value="Started">Started</option>
                            <option value="In-Transit">In-Transit</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleEdit(t)} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold hover:bg-yellow-200">
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
