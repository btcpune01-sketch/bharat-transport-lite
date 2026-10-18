import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '../utils/dateFormatter'

export default function Bills() {
  const navigate = useNavigate()
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const token = localStorage.getItem('token')
        const apiUrl = 'https://bharat-transport-api.onrender.com'
        const res = await fetch(`${apiUrl}/api/bills`, { headers: { 'Authorization': `Bearer ${token}` } })
        const data = await res.json()
        setBills(data.data || [])
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }
    fetchBills()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-red-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="font-bold text-lg"> Bills ({bills.length})</h1>
          <button onClick={() => navigate('/')} className="bg-white text-red-700 px-4 py-1 rounded font-bold text-sm">← Dashboard</button>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto p-6">
        {loading ? <div className="text-center py-20">Loading...</div> : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {bills.length === 0 ? <div className="p-10 text-center text-gray-500">No bills yet</div> : (
              <table className="w-full">
                <thead className="bg-gray-100"><tr><th className="p-3 text-left">Bill No</th><th className="p-3 text-left">Date</th><th className="p-3 text-left">Amount</th></tr></thead>
                <tbody>{bills.map(b => (<tr key={b.id} className="border-t"><td className="p-3 font-bold">{b.bill_no || b.id}</td><td className="p-3">{b.bill_date ? formatDate(b.bill_date) : '-'}</td><td className="p-3 font-bold">₹{parseFloat(b.total_amount || b.grand_total || 0).toLocaleString('en-IN')}</td></tr>))}</tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
