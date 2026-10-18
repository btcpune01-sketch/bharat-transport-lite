import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { formatDateForInput } from '../utils/dateFormatter'

export default function MRCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [biltyList, setBiltyList] = useState([])
  const [billList, setBillList] = useState([])
  const [selectedBilty, setSelectedBilty] = useState(null)
  const [selectedBill, setSelectedBill] = useState(null)
  
  const [formData, setFormData] = useState({
    mr_no: 'Auto-generated',
    mr_date: formatDateForInput(new Date()),
    party_type: 'Consignor',
    party_name: '',
    bilty_id: '',
    bilty_lr_no: '',
    amount: '',
    payment_mode: 'Cash',
    is_advance: false,
    remarks: ''
  })

  useEffect(() => {
    fetchBilties()
    fetchBills()
  }, [])

  const fetchBills = async () => {
    try {
      const response = await api.get('/api/bills')
      setBillList((response.data?.data || []).filter(bill => bill.payment_status !== 'Paid'))
    } catch (err) {
      console.error('Error fetching bills:', err)
    }
  }

  const fetchBilties = async () => {
    try {
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const res = await fetch(`${apiUrl}/api/consignments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const receiptResponse = await api.get('/api/mr')
        const receipts = receiptResponse.data?.data || []
        // Sirf Unpaid bilties dikhayenge MR ke liye
        const unpaidBilties = (data.data || [])
          .filter(bilty => bilty.payment_status !== 'Paid')
          .map(bilty => {
            const received = receipts
              .filter(receipt => Number(receipt.bilty_id) === Number(bilty.id))
              .reduce((total, receipt) => total + (Number(receipt.amount) || 0), 0)
            return {
              ...bilty,
              outstanding_amount: Math.max((Number(bilty.grand_total) || 0) - received, 0)
            }
          })
        setBiltyList(unpaidBilties)
      }
    } catch (err) {
      console.error('Error fetching bilties:', err)
    }
  }

  const handleBiltyChange = (e) => {
    const biltyId = e.target.value
    if (!biltyId) {
      setSelectedBilty(null)
      setFormData(prev => ({
        ...prev,
        bilty_id: '',
        bilty_lr_no: '',
        ...(prev.bill_id ? {} : { party_name: '', amount: '' })
      }))
      return
    }
    
    const bilty = biltyList.find(b => b.id === parseInt(biltyId))
    if (bilty) {
      setSelectedBilty(bilty)
      setSelectedBill(null)
      setFormData(prev => ({
        ...prev,
        bill_id: '',
        bill_no: '',
        bilty_id: bilty.id,
        bilty_lr_no: bilty.lr_no,
        party_name: bilty.consignor_name || bilty.party_name || '',
        amount: bilty.outstanding_amount.toString()
      }))
    }
  }

  const handleBillChange = (e) => {
    const billId = e.target.value
    const bill = billList.find(item => String(item.id) === billId)
    setSelectedBill(bill || null)
    if (bill) setSelectedBilty(null)
    setFormData(prev => ({
      ...prev,
      ...(bill
        ? {
            bilty_id: '',
            bilty_lr_no: '',
            bill_id: bill.id,
            bill_no: bill.bill_no || '',
            party_name: bill.party_name || '',
            amount: Number(bill.balance_due ?? bill.net_balance ?? bill.grand_total ?? 0).toString()
          }
        : {
            bill_id: '',
            bill_no: '',
            ...(prev.bilty_id ? {} : { party_name: '', amount: '' })
          })
    }))
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount!')
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        is_advance: formData.is_advance || false
      }

      const res = await fetch(`${apiUrl}/api/mr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const result = await res.json()
        alert(`MR Created Successfully! MR No: ${result.mr_no}`)
        navigate('/mr')
      } else {
        const err = await res.json()
        alert('Error: ' + (err.error || 'Failed to create MR'))
      }
    } catch (err) {
      console.error('MR create error:', err)
      alert('Failed to create MR')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return '₹' + parseFloat(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <nav className="bg-gradient-to-r from-purple-700 to-purple-900 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/mr')} className="bg-white/20 p-2 rounded-lg hover:bg-white/30">← Back</button>
            <div>
              <h1 className="font-bold text-xl">🧾 Create Money Receipt</h1>
              <p className="text-xs text-purple-200">Record Payment against Bilty or Bill</p>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6">
          
          {/* Top Row: MR Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 border-b pb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MR Number</label>
              <input type="text" value={formData.mr_no} readOnly className="w-full border rounded-lg p-2.5 bg-gray-50 text-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MR Date *</label>
              <input required type="date" name="mr_date" value={formData.mr_date} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Party Type *</label>
              <select required name="party_type" value={formData.party_type} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500">
                <option value="Consignor">Consignor (Sender)</option>
                <option value="Consignee">Consignee (Receiver)</option>
                <option value="Vendor">Vendor / Broker</option>
              </select>
            </div>
          </div>

          {/* Bilty Selection & Details */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              🔗 Link to Bilty / Bill (Optional but Recommended)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Bilty</label>
                <select name="bilty_id" value={formData.bilty_id} onChange={handleBiltyChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 bg-white">
                  <option value="">-- Select Bilty --</option>
                  {biltyList.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.lr_no} - {b.consignor_name} ({formatCurrency(b.outstanding_amount)} due)
                    </option>
                  ))}
                </select>
                {selectedBilty && <p className="text-xs text-green-600 mt-1">✔️ Linked: {selectedBilty.lr_no}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Bill</label>
                <select name="bill_id" value={formData.bill_id || ''} onChange={handleBillChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 bg-white">
                  <option value="">-- Select Bill --</option>
                  {billList.map(bill => (
                    <option key={bill.id} value={bill.id}>
                      {bill.bill_no} - {bill.party_name} ({formatCurrency(bill.balance_due ?? bill.net_balance ?? bill.grand_total)})
                    </option>
                  ))}
                </select>
                {selectedBill && <p className="text-xs text-green-600 mt-1">✔️ Linked: {selectedBill.bill_no}</p>}
              </div>
            </div>

            {/* Auto-Filled Bilty Details Box */}
            {selectedBilty && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h4 className="font-bold text-purple-800 text-sm mb-3">📦 Bilty Details (Auto-Fetched)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs">Branch Code</div>
                    <div className="font-bold text-gray-800">{selectedBilty.branch_code || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Consignor (From)</div>
                    <div className="font-bold text-gray-800">{selectedBilty.consignor_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Consignee (To)</div>
                    <div className="font-bold text-gray-800">{selectedBilty.consignee_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Material</div>
                    <div className="font-bold text-gray-800">{selectedBilty.material_desc || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Packages</div>
                    <div className="font-bold text-gray-800">{selectedBilty.packages || '-'} Pcs</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Weight</div>
                    <div className="font-bold text-gray-800">{selectedBilty.actual_weight || selectedBilty.charged_weight || '-'} Kg</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Freight Charges</div>
                    <div className="font-bold text-gray-800">{formatCurrency(selectedBilty.freight)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Grand Total</div>
                    <div className="font-bold text-purple-700 text-lg">{formatCurrency(selectedBilty.grand_total)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 border-b pb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Party Name *</label>
              <input required type="text" name="party_name" value={formData.party_name} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500" placeholder="Enter party name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
              <input required type="number" step="0.01" name="amount" value={formData.amount} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 text-lg font-bold" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
              <select required name="payment_mode" value={formData.payment_mode} onChange={handleChange} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500">
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer / NEFT / RTGS</option>
                <option value="Cheque">Cheque</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 p-3 border rounded-lg w-full cursor-pointer hover:bg-purple-50 transition-colors">
                <input type="checkbox" name="is_advance" checked={formData.is_advance} onChange={handleChange} className="w-5 h-5 text-purple-600 rounded" />
                <span className="font-medium text-gray-800">This is Advance Payment</span>
              </label>
            </div>
          </div>

          {/* Remarks */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / Notes</label>
            <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="3" className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500" placeholder="Any additional notes..."></textarea>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => navigate('/mr')} className="px-6 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-8 py-2.5 bg-purple-700 text-white rounded-lg font-bold hover:bg-purple-800 shadow disabled:opacity-50 flex items-center gap-2">
              {loading ? 'Creating MR...' : '💾 Create Money Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
