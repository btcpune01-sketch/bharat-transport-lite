import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Customers() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const token = localStorage.getItem('token')
        const apiUrl = 'https://bharat-transport-api.onrender.com'
        const res = await fetch(`${apiUrl}/api/customers`, { headers: { 'Authorization': `Bearer ${token}` } })
        const data = await res.json()
        setCustomers(Array.isArray(data) ? data : [])
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }
    fetchCustomers()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-red-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="font-bold text-lg">👥 Customers ({customers.length})</h1>
          <button onClick={() => navigate('/')} className="bg-white text-red-700 px-4 py-1 rounded font-bold text-sm">← Dashboard</button>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto p-6">
        {loading ? <div className="text-center py-20">Loading...</div> : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {customers.length === 0 ? <div className="p-10 text-center text-gray-500">No customers yet</div> : (
              <table className="w-full">
                <thead className="bg-gray-100"><tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Email</th><th className="p-3 text-left">Phone</th></tr></thead>
                <tbody>{customers.map(c => (<tr key={c.id} className="border-t"><td className="p-3 font-bold">{c.customer_name || c.name}</td><td className="p-3">{c.email || '-'}</td><td className="p-3">{c.phone || c.mobile || '-'}</td></tr>))}</tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
