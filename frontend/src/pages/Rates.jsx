import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate, formatDateForInput } from '../utils/dateFormatter'

export default function Rates() {
  const navigate = useNavigate()
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [calculator, setCalculator] = useState({ from_city: '', to_city: '', weight_kg: '', packages: '', party_code: '' })
  const [calcResult, setCalcResult] = useState(null)

  const [formData, setFormData] = useState({
    party_code: '',
    from_city: '',
    to_city: '',
    rate_type: 'per_kg',
    rate_per_kg: '',
    rate_per_pkg: '',
    fixed_rate: '',
    min_charge: '',
    weight_from: '',
    weight_to: '',
    effective_from: formatDateForInput(new Date()),
    effective_to: '',
    is_active: true,
    remarks: ''
  })

  useEffect(() => {
    fetchRates()
  }, [])

  const fetchRates = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const headers = { 'Authorization': `Bearer ${token}` }

      const res = await fetch(`${apiUrl}/api/rates`, { headers })
      if (res.ok) {
        const data = await res.json()
        setRates(data.data || [])
      }
    } catch (err) {
      console.error('Rates fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'

      const url = editId ? `${apiUrl}/api/rates/${editId}` : `${apiUrl}/api/rates`
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
        alert(editId ? 'Rate updated successfully!' : 'Rate contract created successfully!')
        setShowForm(false)
        setEditId(null)
        setFormData({
          party_code: '',
          from_city: '',
          to_city: '',
          rate_type: 'per_kg',
          rate_per_kg: '',
          rate_per_pkg: '',
          fixed_rate: '',
          min_charge: '',
          weight_from: '',
          weight_to: '',
          effective_from: formatDateForInput(new Date()),
          effective_to: '',
          is_active: true,
          remarks: ''
        })
        fetchRates()
      } else {
        const err = await res.json()
        alert('Error: ' + err.error)
      }
    } catch (err) {
      console.error('Rate save error:', err)
      alert('Failed to save rate')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (rate) => {
    setFormData({
      ...rate,
      effective_from: formatDateForInput(rate.effective_from),
      effective_to: formatDateForInput(rate.effective_to)
    })
    setEditId(rate.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this rate contract?')) return
    
    try {
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      
      const res = await fetch(`${apiUrl}/api/rates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        fetchRates()
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleCalculate = async () => {
    if (!calculator.from_city || !calculator.to_city) {
      alert('Please enter From and To cities')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      
      const res = await fetch(`${apiUrl}/api/rates/calculate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(calculator)
      })

      if (res.ok) {
        const data = await res.json()
        setCalcResult(data)
      }
    } catch (err) {
      console.error('Calculation error:', err)
    }
  }

  const formatCurrency = (amount) => {
    return '₹' + parseFloat(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  if (loading && rates.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700"></div>
          <p className="mt-4 text-gray-500">Loading Rates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-teal-700 to-teal-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="bg-white/20 p-2 rounded-lg hover:bg-white/30">← Back</button>
            <div>
              <h1 className="font-bold text-xl">⚙️ Smart Rate Engine</h1>
              <p className="text-xs text-teal-200">Auto Freight Calculation & Rate Contracts (TCI Style)</p>
            </div>
          </div>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setEditId(null); }}
              className="bg-white text-teal-700 px-5 py-2 rounded-lg font-bold text-sm hover:bg-teal-50 shadow flex items-center gap-2"
            >
              <span>+</span> Add Rate Contract
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Freight Calculator */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">🧮 Quick Freight Calculator</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="From City"
              value={calculator.from_city}
              onChange={(e) => setCalculator({ ...calculator, from_city: e.target.value })}
              className="border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500"
            />
            <input
              type="text"
              placeholder="To City"
              value={calculator.to_city}
              onChange={(e) => setCalculator({ ...calculator, to_city: e.target.value })}
              className="border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500"
            />
            <input
              type="number"
              placeholder="Weight (Kg)"
              value={calculator.weight_kg}
              onChange={(e) => setCalculator({ ...calculator, weight_kg: e.target.value })}
              className="border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500"
            />
            <input
              type="number"
              placeholder="Packages"
              value={calculator.packages}
              onChange={(e) => setCalculator({ ...calculator, packages: e.target.value })}
              className="border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500"
            />
            <button
              onClick={handleCalculate}
              className="bg-teal-700 text-white rounded-lg font-bold hover:bg-teal-800 shadow"
            >
              Calculate
            </button>
          </div>

          {calcResult && (
            <div className={`mt-4 p-4 rounded-lg ${calcResult.found ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
              {calcResult.found ? (
                <div>
                  <p className="font-bold text-green-800 text-lg">✅ Freight: {formatCurrency(calcResult.freight)}</p>
                  <p className="text-sm text-green-700 mt-1">Rate Applied: {calcResult.calculation.rate_applied} per {calcResult.rate_contract.rate_type === 'per_kg' ? 'Kg' : 'Package'}</p>
                  {calcResult.calculation.min_charge && <p className="text-xs text-green-600">Minimum Charge: {formatCurrency(calcResult.calculation.min_charge)}</p>}
                </div>
              ) : (
                <p className="font-bold text-yellow-800">⚠️ {calcResult.message}</p>
              )}
            </div>
          )}
        </div>

        {showForm ? (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">
              {editId ? '✏️ Edit Rate Contract' : '➕ Add New Rate Contract'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Party Code (Optional)</label>
                  <input type="text" name="party_code" value={formData.party_code} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500" placeholder="Leave blank for all parties" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From City *</label>
                  <input required type="text" name="from_city" value={formData.from_city} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500" placeholder="e.g., Delhi" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To City *</label>
                  <input required type="text" name="to_city" value={formData.to_city} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500" placeholder="e.g., Mumbai" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate Type *</label>
                  <select required name="rate_type" value={formData.rate_type} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500">
                    <option value="per_kg">Per Kg</option>
                    <option value="per_pkg">Per Package</option>
                    <option value="fixed">Fixed Rate</option>
                  </select>
                </div>
                {formData.rate_type === 'per_kg' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate Per Kg (₹) *</label>
                    <input required type="number" step="0.01" name="rate_per_kg" value={formData.rate_per_kg} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500" />
                  </div>
                )}
                {formData.rate_type === 'per_pkg' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate Per Package (₹) *</label>
                    <input required type="number" step="0.01" name="rate_per_pkg" value={formData.rate_per_pkg} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500" />
                  </div>
                )}
                {formData.rate_type === 'fixed' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Rate (₹) *</label>
                    <input required type="number" step="0.01" name="fixed_rate" value={formData.fixed_rate} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Charge (₹)</label>
                  <input type="number" step="0.01" name="min_charge" value={formData.min_charge} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight From (Kg)</label>
                  <input type="number" name="weight_from" value={formData.weight_from} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight To (Kg)</label>
                  <input type="number" name="weight_to" value={formData.weight_to} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500" placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective From *</label>
                  <input required type="date" name="effective_from" value={formData.effective_from} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective To</label>
                  <input type="date" name="effective_to" value={formData.effective_to} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="w-5 h-5 text-teal-600 rounded" />
                    <span className="font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="2" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500"></textarea>
              </div>

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="px-6 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-8 py-2.5 bg-teal-700 text-white rounded-lg font-bold hover:bg-teal-800 shadow disabled:opacity-50">
                  {loading ? 'Saving...' : editId ? '🔄 Update Rate' : '✅ Save Rate Contract'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800"> Rate Contracts</h2>
              <div className="text-sm text-gray-500">Total: {rates.length}</div>
            </div>

            {rates.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <div className="text-4xl mb-3">⚙️</div>
                <p className="font-medium">No rate contracts created yet.</p>
                <p className="text-sm mt-1">Click "Add Rate Contract" to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 text-left font-bold text-gray-600">Route</th>
                      <th className="p-4 text-left font-bold text-gray-600">Party</th>
                      <th className="p-4 text-left font-bold text-gray-600">Rate Type</th>
                      <th className="p-4 text-right font-bold text-gray-600">Rate</th>
                      <th className="p-4 text-right font-bold text-gray-600">Min Charge</th>
                      <th className="p-4 text-left font-bold text-gray-600">Valid From</th>
                      <th className="p-4 text-center font-bold text-gray-600">Status</th>
                      <th className="p-4 text-center font-bold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map(r => (
                      <tr key={r.id} className="border-t hover:bg-teal-50/30 transition-colors">
                        <td className="p-4 font-bold text-teal-700">{r.from_city} → {r.to_city}</td>
                        <td className="p-4">{r.party_code || 'All Parties'}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded text-xs font-bold bg-teal-100 text-teal-700">
                            {r.rate_type === 'per_kg' ? 'Per Kg' : r.rate_type === 'per_pkg' ? 'Per Pkg' : 'Fixed'}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold">
                          {r.rate_type === 'per_kg' ? `${formatCurrency(r.rate_per_kg)}/kg` :
                           r.rate_type === 'per_pkg' ? `${formatCurrency(r.rate_per_pkg)}/pkg` :
                           formatCurrency(r.fixed_rate)}
                        </td>
                        <td className="p-4 text-right">{formatCurrency(r.min_charge)}</td>
                        <td className="p-4 text-xs">{r.effective_from ? formatDate(r.effective_from) : '-'}</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {r.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-center space-x-2">
                          <button onClick={() => handleEdit(r)} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold hover:bg-yellow-200">
                            ✏️
                          </button>
                          <button onClick={() => handleDelete(r.id)} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200">
                            🗑️
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
