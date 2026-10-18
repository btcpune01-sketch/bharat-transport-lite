import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { formatDate } from '../utils/dateFormatter'

export default function BillList() {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadBills()
  }, [])

  const loadBills = async () => {
    try {
      const res = await api.get('/api/bills')
      const billsData = res.data?.data || res.data || []
      setBills(billsData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const deleteBill = async (bill) => {
    if (!window.confirm(`Delete bill ${bill.bill_no || ''}? This cannot be undone.`)) return
    try {
      await api.delete(`/api/bills/${bill.id}`)
      setBills(current => current.filter(item => item.id !== bill.id))
    } catch (err) {
      window.alert(err.response?.data?.error || 'Unable to delete this bill.')
    }
  }

  const filtered = bills.filter(b => 
    b.bill_no?.toLowerCase().includes(search.toLowerCase()) ||
    b.party_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-red-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-bold text-lg">📋 Bill List ({bills.length})</h1>
          <div className="flex gap-2">
            <Link to="/bill-entry" className="bg-white text-red-700 px-4 py-2 rounded-lg text-sm font-medium">+ New Bill</Link>
            <button onClick={() => navigate('/dashboard')} className="bg-white/20 px-4 py-2 rounded-lg text-sm">← Back</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <input
          type="text"
          placeholder="Search by Bill No or Party Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 mb-4 border rounded-lg shadow-sm"
        />

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Bill No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Party</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Grand Total</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Balance</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">No bills found</td></tr>
              ) : filtered.map(bill => (
                <tr key={bill.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-red-700" style={{ wordBreak: 'break-word' }}>
                    {bill.bill_no || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm">{bill.bill_date ? formatDate(bill.bill_date) : '-'}</td>
                  <td className="px-4 py-3 text-sm" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                    {bill.party_name || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    ₹{Number(bill.grand_total || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">
                    ₹{Number(bill.net_balance || bill.balance_due || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      to={`/bill-edit/${bill.id}`}
                      className="ml-2 bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 text-sm font-medium inline-block"
                    >
                      Edit
                    </Link>
                    <Link
                      to={`/bill-print/${bill.id}`}
                      className="ml-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium inline-block"
                    >
                      Print
                    </Link>
                    <button
                      type="button"
                      onClick={() => deleteBill(bill)}
                      className="ml-2 bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
