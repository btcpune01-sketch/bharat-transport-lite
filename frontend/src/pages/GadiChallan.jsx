import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDateForInput } from '../utils/dateFormatter'

export default function GadiChallan() {
  const navigate = useNavigate()
  const [challans, setChallans] = useState([])
  const [biltyList, setBiltyList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)

  const [formData, setFormData] = useState({
    lr_no: '',
    vehicle_no: '',
    driver_name: '',
    driver_mobile: '',
    driver_license: '',
    owner_name: '',
    owner_mobile: '',
    broker_name: '',
    broker_mobile: '',
    broker_commission: '',
    from_place: '',
    to_place: '',
    material_desc: '',
    weight: '',
    packages: '',
    bilty_date: '',
    consignor_name: '',
    consignee_name: '',
    freight_amount: '',
    advance_paid: '',
    balance_due: '',
    toll_expense: '',
    diesel_expense: '',
    other_expense: '',
    tds_deduction: '',
    net_payable: '',
    issue_date: formatDateForInput(new Date())
  })

  useEffect(() => {
    fetchData()
    fetchBilties()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const headers = { 'Authorization': `Bearer ${token}` }

      const res = await fetch(`${apiUrl}/api/gadi-challan`, { headers })
      if (res.ok) {
        const data = await res.json()
        setChallans(data.data || [])
      }
    } catch (err) {
      console.error('Challan fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchBilties = async () => {
    try {
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const headers = { 'Authorization': `Bearer ${token}` }

      const res = await fetch(`${apiUrl}/api/consignments`, { headers })
      if (res.ok) {
        const data = await res.json()
        const activeBilties = (data.data || []).filter(b => 
          b.status === 'Booked' || b.status === 'In-Transit'
        )
        setBiltyList(activeBilties)
      }
    } catch (err) {
      console.error('Bilty fetch error:', err)
    }
  }

  const handleBiltyChange = (e) => {
    const lrNumbers = Array.from(e.target.selectedOptions, option => option.value)
    const selectedBilties = biltyList.filter(bilty => lrNumbers.includes(bilty.lr_no))
    const uniqueValues = values => [...new Set(values.filter(Boolean))].join(', ')
    const sum = values => values.reduce((total, value) => total + (Number(value) || 0), 0)
    const packageValues = selectedBilties.map(bilty =>
      bilty.packages || bilty.no_of_packages || bilty.qty || ''
    )
    const numericPackages = packageValues.every(value => value === '' || Number.isFinite(Number(value)))

    setFormData(prev => ({
      ...prev,
      lr_no: lrNumbers.join(', '),
      consignor_name: uniqueValues(selectedBilties.map(bilty => bilty.consignor_name)),
      consignee_name: uniqueValues(selectedBilties.map(bilty => bilty.consignee_name)),
      from_place: uniqueValues(selectedBilties.map(bilty => bilty.branch_code || bilty.from_name)),
      to_place: uniqueValues(selectedBilties.map(bilty => bilty.to_name)),
      material_desc: uniqueValues(selectedBilties.map(bilty =>
        bilty.material_desc || bilty.description || bilty.goods
      )),
      packages: numericPackages ? sum(packageValues) || '' : uniqueValues(packageValues),
      weight: sum(selectedBilties.map(bilty =>
        Number(bilty.actual_weight) > 0 ? bilty.actual_weight : bilty.charged_weight
      )) || '',
      freight_amount: sum(selectedBilties.map(bilty =>
        Number(bilty.grand_total) > 0 ? bilty.grand_total : bilty.freight
      )) || '',
      bilty_date: selectedBilties[0] ? formatDateForInput(selectedBilties[0].lr_date) : ''
    }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    const updatedData = { ...formData, [name]: value }

    if (name === 'freight_amount' || name === 'advance_paid' || name === 'tds_deduction') {
      const freight = parseFloat(updatedData.freight_amount || 0)
      const advance = parseFloat(updatedData.advance_paid || 0)
      const tds = parseFloat(updatedData.tds_deduction || 0)
      updatedData.balance_due = (freight - advance).toFixed(2)
      updatedData.net_payable = (freight - advance - tds).toFixed(2)
    }

    setFormData(updatedData)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'

      const url = editId ? `${apiUrl}/api/gadi-challan/${editId}` : `${apiUrl}/api/gadi-challan`
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
        alert(editId ? 'Challan updated successfully!' : 'Gadi Challan created successfully!')
        setShowForm(false)
        setEditId(null)
        setFormData({
          lr_no: '', vehicle_no: '', driver_name: '', driver_mobile: '', driver_license: '',
          owner_name: '', owner_mobile: '', broker_name: '', broker_mobile: '', broker_commission: '',
          from_place: '', to_place: '', material_desc: '', weight: '', packages: '', bilty_date: '',
          consignor_name: '', consignee_name: '', freight_amount: '', advance_paid: '', balance_due: '',
          toll_expense: '', diesel_expense: '', other_expense: '', tds_deduction: '', net_payable: '',
          issue_date: formatDateForInput(new Date())
        })
        fetchData()
      } else {
        const err = await res.json()
        alert('Error: ' + err.error)
      }
    } catch (err) {
      console.error('Challan save error:', err)
      alert('Failed to save challan')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (challan) => {
    setFormData({
      ...challan,
      bilty_date: formatDateForInput(challan.bilty_date),
      issue_date: formatDateForInput(challan.issue_date) || formatDateForInput(new Date())
    })
    setEditId(challan.id)
    setShowForm(true)
  }

  const formatCurrency = (amount) => {
    return '' + parseFloat(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  if (loading && challans.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-lime-700"></div>
          <p className="mt-4 text-gray-500">Loading Challans...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-lime-700 to-lime-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="bg-white/20 p-2 rounded-lg hover:bg-white/30">← Back</button>
            <div>
              <h1 className="font-bold text-xl">📋 Gadi Challan Management</h1>
              <p className="text-xs text-lime-200">Broker Settlement & Trip Expenses</p>
            </div>
          </div>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setEditId(null); }}
              className="bg-white text-lime-700 px-5 py-2 rounded-lg font-bold text-sm hover:bg-lime-50 shadow flex items-center gap-2"
            >
              <span>+</span> Create New Challan
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {showForm ? (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">
              {editId ? '✏️ Edit Gadi Challan' : '📝 Create New Gadi Challan'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="bg-lime-50 border-2 border-lime-300 rounded-xl p-4 mb-6">
                <h3 className="font-bold text-lime-800 mb-3 flex items-center gap-2">
                  🔗 Select Bilty / LR (Auto-Fill Details)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LR Number(s) *</label>
                    <select
                      name="lr_no"
                      value={formData.lr_no ? formData.lr_no.split(', ') : []}
                      onChange={handleBiltyChange}
                      className="w-full border-2 border-lime-300 rounded-lg p-2.5 focus:ring-2 focus:ring-lime-500 bg-white"
                      multiple
                      size="5"
                      required
                    >
                      {biltyList.map(b => (
                        <option key={b.id} value={b.lr_no}>
                          {b.lr_no} - {b.consignor_name} → {b.consignee_name} ({formatCurrency(b.grand_total)})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Select one or more bilties (Ctrl/Cmd-click to select multiple).</p>
                  </div>
                </div>

                {formData.lr_no && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500 text-xs">Consignor</div>
                      <div className="font-bold text-gray-800">{formData.consignor_name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Consignee</div>
                      <div className="font-bold text-gray-800">{formData.consignee_name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">From</div>
                      <div className="font-bold text-gray-800">{formData.from_place || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">To</div>
                      <div className="font-bold text-gray-800">{formData.to_place || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Material</div>
                      <div className="font-bold text-gray-800">{formData.material_desc || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Packages</div>
                      <div className="font-bold text-gray-800">{formData.packages || '-'} Pcs</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Weight</div>
                      <div className="font-bold text-gray-800">{formData.weight || '-'} Kg</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Freight Amount</div>
                      <div className="font-bold text-lime-700 text-lg">{formatCurrency(formData.freight_amount)}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number *</label>
                  <input required type="text" name="vehicle_no" value={formData.vehicle_no} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-lime-500 uppercase" placeholder="e.g., DL-1C-AB-1234" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name *</label>
                  <input required type="text" name="driver_name" value={formData.driver_name} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-lime-500" placeholder="Driver name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver Mobile *</label>
                  <input required type="text" name="driver_mobile" value={formData.driver_mobile} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-lime-500" placeholder="9876543210" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver License</label>
                  <input type="text" name="driver_license" value={formData.driver_license} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-lime-500" placeholder="License number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                  <input type="text" name="owner_name" value={formData.owner_name} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-lime-500" placeholder="Vehicle owner" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner Mobile</label>
                  <input type="text" name="owner_mobile" value={formData.owner_mobile} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-lime-500" placeholder="9876543210" />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="font-bold text-gray-800 mb-3">🤝 Broker / Agent Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Broker Name</label>
                    <input type="text" name="broker_name" value={formData.broker_name} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-lime-500" placeholder="Broker name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Broker Mobile</label>
                    <input type="text" name="broker_mobile" value={formData.broker_mobile} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-lime-500" placeholder="9876543210" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Broker Commission (₹)</label>
                    <input type="number" step="0.01" name="broker_commission" value={formData.broker_commission} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-lime-500" placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Freight Amount (₹) *</label>
                  <input required type="number" step="0.01" name="freight_amount" value={formData.freight_amount} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-lime-500 font-bold" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Advance Paid (₹)</label>
                  <input type="number" step="0.01" name="advance_paid" value={formData.advance_paid} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-lime-500" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Balance Due (₹)</label>
                  <input type="number" step="0.01" name="balance_due" value={formData.balance_due} readOnly className="w-full border rounded-lg p-2.5 bg-gray-100 font-bold" placeholder="Auto-calculated" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TDS Deduction (₹)</label>
                  <input type="number" step="0.01" name="tds_deduction" value={formData.tds_deduction} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-lime-500" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Net Payable ()</label>
                  <input type="number" step="0.01" name="net_payable" value={formData.net_payable} readOnly className="w-full border rounded-lg p-2.5 bg-gray-100 font-bold text-lime-700" placeholder="Auto-calculated" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date *</label>
                  <input required type="date" name="issue_date" value={formData.issue_date} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-lime-500" />
                </div>
              </div>

              <div className="bg-yellow-50 rounded-xl p-4 mb-6">
                <h3 className="font-bold text-gray-800 mb-3">💰 Trip Expenses</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Diesel Expense (₹)</label>
                    <input type="number" step="0.01" name="diesel_expense" value={formData.diesel_expense} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-lime-500" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Toll Expense (₹)</label>
                    <input type="number" step="0.01" name="toll_expense" value={formData.toll_expense} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-lime-500" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Expense (₹)</label>
                    <input type="number" step="0.01" name="other_expense" value={formData.other_expense} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-lime-500" placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="px-6 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-8 py-2.5 bg-lime-700 text-white rounded-lg font-bold hover:bg-lime-800 shadow disabled:opacity-50">
                  {loading ? 'Saving...' : editId ? '🔄 Update Challan' : '✅ Create Challan'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">📋 Recent Gadi Challans</h2>
              <div className="text-sm text-gray-500">Total: {challans.length}</div>
            </div>

            {challans.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <div className="text-4xl mb-3">📭</div>
                <p className="font-medium">No challans created yet.</p>
                <p className="text-sm mt-1">Click "Create New Challan" to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 text-left font-bold text-gray-600">Challan No</th>
                      <th className="p-4 text-left font-bold text-gray-600">LR No(s)</th>
                      <th className="p-4 text-left font-bold text-gray-600">Vehicle</th>
                      <th className="p-4 text-left font-bold text-gray-600">Driver</th>
                      <th className="p-4 text-right font-bold text-gray-600">Freight</th>
                      <th className="p-4 text-right font-bold text-gray-600">Advance</th>
                      <th className="p-4 text-right font-bold text-gray-600">Balance</th>
                      <th className="p-4 text-center font-bold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challans.map(c => (
                      <tr key={c.id} className="border-t hover:bg-lime-50/30 transition-colors">
                        <td className="p-4 font-bold text-lime-700">{c.challan_no}</td>
                        <td className="p-4 font-medium">{c.lr_no || '-'}</td>
                        <td className="p-4 font-medium">{c.vehicle_no}</td>
                        <td className="p-4">
                          <div className="font-medium">{c.driver_name}</div>
                          <div className="text-xs text-gray-500">{c.driver_mobile}</div>
                        </td>
                        <td className="p-4 text-right font-bold">{formatCurrency(c.freight_amount)}</td>
                        <td className="p-4 text-right">{formatCurrency(c.advance_paid)}</td>
                        <td className="p-4 text-right font-bold text-lime-700">{formatCurrency(c.balance_due)}</td>
                        {/* ✅ FIXED: Added View, Print, and Edit buttons */}
                        <td className="p-4 text-center space-y-1">
                          <button onClick={() => navigate(`/gadi-challan-print/${c.id}`)} className="block w-full text-center px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold hover:bg-blue-200 mb-1">
                            👁️ View
                          </button>
                          <button onClick={() => navigate(`/gadi-challan-print/${c.id}`)} className="block w-full text-center px-2 py-1 bg-lime-100 text-lime-700 rounded text-xs font-bold hover:bg-lime-200 mb-1">
                            🖨️ Print
                          </button>
                          <button onClick={() => handleEdit(c)} className="block w-full text-center px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold hover:bg-yellow-200">
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
