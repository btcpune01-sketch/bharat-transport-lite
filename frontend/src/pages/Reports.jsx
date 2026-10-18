import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate, formatDateForInput } from '../utils/dateFormatter'

export default function Reports() {
  const navigate = useNavigate()
  const [bilties, setBilties] = useState([])
  const [activeReport, setActiveReport] = useState('monthly')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchReports() }, [])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const res = await fetch(`${apiUrl}/api/consignments`, { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      setBilties(data.data || [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const today = formatDateForInput(new Date())
  const thisMonth = today.substring(0, 7)

  const monthlyBilties = bilties.filter(b => b.lr_date && b.lr_date.startsWith(thisMonth))
  const monthlyRevenue = monthlyBilties.reduce((s, b) => s + parseFloat(b.grand_total || 0), 0)
  const monthlyDelivered = monthlyBilties.filter(b => b.status === 'Delivered').length
  const monthlyPending = monthlyBilties.filter(b => b.status !== 'Delivered').length

  const pendingBilties = bilties.filter(b => b.status !== 'Delivered' && b.status !== 'Cancelled')
  const pendingAmount = pendingBilties.reduce((s, b) => s + parseFloat(b.grand_total || 0), 0)

  const podPending = bilties.filter(b => b.status === 'In-Transit')

  const brokerMap = {}
  bilties.forEach(b => {
    const broker = b.broker_name || b.driver_name || 'Direct'
    if (!brokerMap[broker]) brokerMap[broker] = { count: 0, total: 0, pending: 0, delivered: 0 }
    brokerMap[broker].count++
    brokerMap[broker].total += parseFloat(b.grand_total || 0)
    if (b.status !== 'Delivered') brokerMap[broker].pending += parseFloat(b.grand_total || 0)
    else brokerMap[broker].delivered++
  })
  const brokerList = Object.entries(brokerMap).map(([name, d]) => ({ name, ...d }))

  const partyMap = {}
  bilties.forEach(b => {
    const party = b.consignor_name || 'Unknown'
    if (!partyMap[party]) partyMap[party] = { count: 0, total: 0, pending: 0 }
    partyMap[party].count++
    partyMap[party].total += parseFloat(b.grand_total || 0)
    if (b.status !== 'Delivered') partyMap[party].pending += parseFloat(b.grand_total || 0)
  })
  const partyList = Object.entries(partyMap).map(([name, d]) => ({ name, ...d }))

  const reports = [
    { id: 'monthly', label: '📅 Monthly Report', color: 'blue' },
    { id: 'pending', label: '💸 Pending Payments', color: 'red' },
    { id: 'pod', label: '📦 POD Pending', color: 'orange' },
    { id: 'broker', label: '🤝 Broker-wise', color: 'purple' },
    { id: 'party', label: '👥 Party-wise', color: 'green' }
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-red-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="font-bold text-lg">📊 Advanced Reports</h1>
          <button onClick={() => navigate('/')} className="bg-white text-red-700 px-4 py-1 rounded font-bold text-sm">← Dashboard</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow p-4 mb-6 flex gap-2 overflow-x-auto">
          {reports.map(r => (
            <button key={r.id} onClick={() => setActiveReport(r.id)} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap ${activeReport === r.id ? 'bg-red-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{r.label}</button>
          ))}
        </div>

        {loading ? <div className="text-center py-20">Loading...</div> : (
          <>
            {activeReport === 'monthly' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-blue-600 text-white p-6 rounded-xl"><p className="text-sm opacity-80">Total Bilties</p><p className="text-3xl font-bold">{monthlyBilties.length}</p></div>
                  <div className="bg-green-600 text-white p-6 rounded-xl"><p className="text-sm opacity-80">Revenue</p><p className="text-3xl font-bold">₹{monthlyRevenue.toLocaleString('en-IN')}</p></div>
                  <div className="bg-purple-600 text-white p-6 rounded-xl"><p className="text-sm opacity-80">Delivered</p><p className="text-3xl font-bold">{monthlyDelivered}</p></div>
                  <div className="bg-orange-600 text-white p-6 rounded-xl"><p className="text-sm opacity-80">Pending</p><p className="text-3xl font-bold">{monthlyPending}</p></div>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="font-bold text-lg mb-4">This Month's Bilties ({thisMonth})</h3>
                  <table className="w-full">
                    <thead className="bg-gray-100"><tr><th className="p-2 text-left">LR No</th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Route</th><th className="p-2 text-left">Amount</th><th className="p-2 text-left">Status</th></tr></thead>
                    <tbody>{monthlyBilties.map(b => (<tr key={b.id} className="border-t"><td className="p-2 font-bold text-red-700">{b.lr_no}</td><td className="p-2">{formatDate(b.lr_date)}</td><td className="p-2">{b.from_name} → {b.to_name}</td><td className="p-2 font-bold">₹{parseFloat(b.grand_total||0).toLocaleString('en-IN')}</td><td className="p-2"><span className={`px-2 py-1 rounded text-xs ${b.status==='Delivered'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{b.status}</span></td></tr>))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {activeReport === 'pending' && (
              <div className="space-y-6">
                <div className="bg-red-600 text-white p-6 rounded-xl"><p className="text-sm opacity-80">Total Pending Amount</p><p className="text-4xl font-bold">₹{pendingAmount.toLocaleString('en-IN')}</p><p className="text-sm mt-2">{pendingBilties.length} bilties pending</p></div>
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="font-bold text-lg mb-4">Pending Payment Details</h3>
                  <table className="w-full">
                    <thead className="bg-gray-100"><tr><th className="p-2 text-left">LR No</th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Consignor</th><th className="p-2 text-left">Amount</th><th className="p-2 text-left">Status</th></tr></thead>
                    <tbody>{pendingBilties.map(b => (<tr key={b.id} className="border-t"><td className="p-2 font-bold text-red-700">{b.lr_no}</td><td className="p-2">{formatDate(b.lr_date)}</td><td className="p-2">{b.consignor_name}</td><td className="p-2 font-bold">₹{parseFloat(b.grand_total||0).toLocaleString('en-IN')}</td><td className="p-2"><span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-700">{b.status}</span></td></tr>))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {activeReport === 'pod' && (
              <div className="space-y-6">
                <div className="bg-orange-600 text-white p-6 rounded-xl"><p className="text-sm opacity-80">POD Pending (In-Transit)</p><p className="text-4xl font-bold">{podPending.length}</p><p className="text-sm mt-2">Need delivery proof</p></div>
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="font-bold text-lg mb-4">POD Pending Bilties</h3>
                  <table className="w-full">
                    <thead className="bg-gray-100"><tr><th className="p-2 text-left">LR No</th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Route</th><th className="p-2 text-left">Driver</th><th className="p-2 text-left">Vehicle</th></tr></thead>
                    <tbody>{podPending.map(b => (<tr key={b.id} className="border-t"><td className="p-2 font-bold text-red-700">{b.lr_no}</td><td className="p-2">{formatDate(b.lr_date)}</td><td className="p-2">{b.from_name} → {b.to_name}</td><td className="p-2">{b.driver_name||'-'}</td><td className="p-2">{b.lorry_no||'-'}</td></tr>))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {activeReport === 'broker' && (
              <div className="space-y-6">
                <div className="bg-purple-600 text-white p-6 rounded-xl"><p className="text-sm opacity-80">Total Brokers</p><p className="text-4xl font-bold">{brokerList.length}</p></div>
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="font-bold text-lg mb-4">Broker-wise Report</h3>
                  <table className="w-full">
                    <thead className="bg-gray-100"><tr><th className="p-2 text-left">Broker</th><th className="p-2 text-left">Total LR</th><th className="p-2 text-left">Total Amount</th><th className="p-2 text-left">Delivered</th><th className="p-2 text-left">Pending</th></tr></thead>
                    <tbody>{brokerList.map((b,i) => (<tr key={i} className="border-t"><td className="p-2 font-bold">{b.name}</td><td className="p-2">{b.count}</td><td className="p-2 font-bold">₹{b.total.toLocaleString('en-IN')}</td><td className="p-2 text-green-700">{b.delivered}</td><td className="p-2 text-red-700 font-bold">₹{b.pending.toLocaleString('en-IN')}</td></tr>))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {activeReport === 'party' && (
              <div className="space-y-6">
                <div className="bg-green-600 text-white p-6 rounded-xl"><p className="text-sm opacity-80">Total Parties</p><p className="text-4xl font-bold">{partyList.length}</p></div>
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="font-bold text-lg mb-4">Party-wise (Consignor) Report</h3>
                  <table className="w-full">
                    <thead className="bg-gray-100"><tr><th className="p-2 text-left">Party Name</th><th className="p-2 text-left">Total LR</th><th className="p-2 text-left">Total Amount</th><th className="p-2 text-left">Pending</th></tr></thead>
                    <tbody>{partyList.map((p,i) => (<tr key={i} className="border-t"><td className="p-2 font-bold">{p.name}</td><td className="p-2">{p.count}</td><td className="p-2 font-bold">₹{p.total.toLocaleString('en-IN')}</td><td className="p-2 text-red-700 font-bold">₹{p.pending.toLocaleString('en-IN')}</td></tr>))}</tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
