import { useState, useEffect } from 'react'
import { branchAPI } from '../api'
import { formatDate, formatDateForInput } from '../utils/dateFormatter'

export default function BranchPayments() {
  const [branches, setBranches] = useState([])
  
  // ✅ FIX 1: Safe LocalStorage parsing (App crash nahi hogi agar data corrupt ho)
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem('branchTransactions')
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('Error parsing transactions from localStorage:', error)
      return []
    }
  })
  
  const [activeTab, setActiveTab] = useState('send')
  
  const [sendForm, setSendForm] = useState({
    branch_name: '', amount: '', vehicle_no: '', destination: '', date: formatDateForInput(new Date())
  })
  
  const [receiveForm, setReceiveForm] = useState({
    branch_name: '', incharge_name: '', amount: '', date: formatDateForInput(new Date())
  })

  useEffect(() => {
    fetchBranches()
  }, [])

  // ✅ FIX 2: Safe LocalStorage save
  useEffect(() => {
    try {
      localStorage.setItem('branchTransactions', JSON.stringify(transactions))
    } catch (error) {
      console.error('Error saving transactions to localStorage:', error)
    }
  }, [transactions])

  const fetchBranches = async () => {
    try {
      const res = await branchAPI.getAll()
      // ✅ FIX 3: Ensure branches is ALWAYS an array
      const branchData = res?.data || res?.branches || []
      setBranches(Array.isArray(branchData) ? branchData : [])
    } catch (err) {
      console.error('Failed to fetch branches', err)
      setBranches([]) // Fallback to empty array
    }
  }

  const handleSendSubmit = (e) => {
    e.preventDefault()
    if (!sendForm.branch_name || !sendForm.amount) {
      alert('Branch and Amount are required!')
      return
    }
    
    const newTransaction = {
      id: Date.now().toString(),
      type: 'SENT',
      ...sendForm,
      timestamp: new Date().toLocaleString('en-IN')
    }
    
    setTransactions(prev => [newTransaction, ...prev])
    setSendForm({ branch_name: '', amount: '', vehicle_no: '', destination: '', date: formatDateForInput(new Date()) })
    alert('✅ Payment record saved successfully!')
  }

  const handleReceiveSubmit = (e) => {
    e.preventDefault()
    if (!receiveForm.branch_name || !receiveForm.incharge_name || !receiveForm.amount) {
      alert('Branch, Incharge Name, and Amount are required!')
      return
    }
    
    const newTransaction = {
      id: Date.now().toString(),
      type: 'RECEIVED',
      ...receiveForm,
      timestamp: new Date().toLocaleString('en-IN')
    }
    
    setTransactions(prev => [newTransaction, ...prev])
    setReceiveForm({ branch_name: '', incharge_name: '', amount: '', date: formatDateForInput(new Date()) })
    alert('✅ Branch payment receipt recorded successfully!')
  }

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear all transaction history? This cannot be undone.')) {
      setTransactions([])
    }
  }

  // ✅ FIX 4: Ensure arrays are ALWAYS safe before .map()
  const safeTransactions = Array.isArray(transactions) ? transactions : []
  const safeBranches = Array.isArray(branches) ? branches : []

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">💸 Branch Payment & Remittance Tracking</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button 
          onClick={() => setActiveTab('send')}
          className={`px-6 py-3 font-medium transition ${activeTab === 'send' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          📤 Send Payment to Branch
        </button>
        <button 
          onClick={() => setActiveTab('receive')}
          className={`px-6 py-3 font-medium transition ${activeTab === 'receive' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          📥 Receive Payment from Branch
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Forms Section */}
        <div className="lg:col-span-1">
          {activeTab === 'send' ? (
            <div className="bg-white p-6 rounded-lg shadow-md border">
              <h2 className="text-xl font-semibold mb-4 text-blue-700">Send Payment Details</h2>
              <form onSubmit={handleSendSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select Branch *</label>
                  <select required value={sendForm.branch_name} onChange={(e) => setSendForm({...sendForm, branch_name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Select Branch --</option>
                    {safeBranches.map(b => <option key={b.id || b._id || b.name} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount (₹) *</label>
                  <input type="number" required value={sendForm.amount} onChange={(e) => setSendForm({...sendForm, amount: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vehicle No / Transport Details</label>
                  <input type="text" value={sendForm.vehicle_no} onChange={(e) => setSendForm({...sendForm, vehicle_no: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g., MH12 AB 1234" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Destination / Purpose</label>
                  <input type="text" value={sendForm.destination} onChange={(e) => setSendForm({...sendForm, destination: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input type="date" value={sendForm.date} onChange={(e) => setSendForm({...sendForm, date: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-md hover:bg-blue-700 font-medium transition">Record Payment Sent</button>
              </form>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md border">
              <h2 className="text-xl font-semibold mb-4 text-green-700">Receive Payment Details</h2>
              <form onSubmit={handleReceiveSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select Branch *</label>
                  <select required value={receiveForm.branch_name} onChange={(e) => setReceiveForm({...receiveForm, branch_name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-2 focus:ring-green-500">
                    <option value="">-- Select Branch --</option>
                    {safeBranches.map(b => <option key={b.id || b._id || b.name} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Branch Incharge Name *</label>
                  <input type="text" required value={receiveForm.incharge_name} onChange={(e) => setReceiveForm({...receiveForm, incharge_name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-2 focus:ring-green-500" placeholder="Name of the person returning payment" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount Received (₹) *</label>
                  <input type="number" required value={receiveForm.amount} onChange={(e) => setReceiveForm({...receiveForm, amount: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input type="date" value={receiveForm.date} onChange={(e) => setReceiveForm({...receiveForm, date: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <button type="submit" className="w-full bg-green-600 text-white py-2.5 rounded-md hover:bg-green-700 font-medium transition">Record Payment Received</button>
              </form>
            </div>
          )}
        </div>

        {/* Transactions History Table */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md border overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-700">Transaction History</h2>
            <div className="flex gap-2">
              <span className="text-sm text-gray-500 bg-gray-200 px-3 py-1 rounded-full">{safeTransactions.length} Records</span>
              {safeTransactions.length > 0 && (
                <button onClick={clearHistory} className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 border border-red-200 rounded hover:bg-red-50 transition">
                  🗑️ Clear All
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Branch</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Details</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Date/Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {safeTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No transactions recorded yet.</td>
                  </tr>
                ) : (
                  safeTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${t.type === 'SENT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {t.type === 'SENT' ? '📤 SENT' : '📥 RECEIVED'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{t.branch_name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {t.type === 'SENT' ? (
                          <>
                            <div>Vehicle: {t.vehicle_no || 'N/A'}</div>
                            <div className="text-xs text-gray-500">Dest: {t.destination || 'N/A'}</div>
                          </>
                        ) : (
                          <>
                            <div>Incharge: {t.incharge_name || 'N/A'}</div>
                            <div className="text-xs text-gray-500">Payment returned</div>
                          </>
                        )}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold text-right ${t.type === 'SENT' ? 'text-red-600' : 'text-green-600'}`}>
                        {t.type === 'SENT' ? '-' : '+'}₹{parseFloat(t.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{formatDate(t.timestamp)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
