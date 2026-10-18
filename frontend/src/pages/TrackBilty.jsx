import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '../utils/dateFormatter'

export default function TrackBilty() {
  const [lrNo, setLrNo] = useState('')
  const [bilty, setBilty] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!lrNo.trim()) return
    
    setLoading(true)
    setError('')
    setBilty(null)

    try {
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const response = await fetch(`${apiUrl}/api/consignments/track?lr_no=${encodeURIComponent(lrNo.trim())}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Bilty not found')
      }
      setBilty(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'booked': return 'bg-blue-100 text-blue-800'
      case 'in-transit': return 'bg-yellow-100 text-yellow-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-red-700 text-white p-4 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold">BHARAT TRANSPORT COMPANY</h1>
          <button onClick={() => navigate('/')} className="text-sm bg-white text-red-700 px-4 py-2 rounded font-bold hover:bg-gray-100 transition">
            ← Back to Home
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Track Your Consignment</h2>
          
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 max-w-lg mx-auto">
            <input
              type="text"
              placeholder="Enter LR Number (e.g., BTC/26/0008)"
              value={lrNo}
              onChange={(e) => setLrNo(e.target.value.toUpperCase())}
              className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-red-600 uppercase"
              required
            />
            <button 
              type="submit" 
              disabled={loading}
              className="bg-red-700 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-red-800 disabled:bg-gray-400 transition"
            >
              {loading ? 'Searching...' : 'Track'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow">
            <p className="font-bold">Not Found</p>
            <p>{error}. Please check the LR Number and try again.</p>
          </div>
        )}

        {bilty && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-gray-100 p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <div>
                <p className="text-sm text-gray-600">LR Number</p>
                <p className="text-2xl font-bold text-red-700">{bilty.lr_no}</p>
              </div>
              <div className={`px-4 py-2 rounded-full font-bold text-sm uppercase ${getStatusColor(bilty.status)}`}>
                {bilty.status || 'Booked'}
              </div>
            </div>

            <div className="p-6 grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-gray-700 mb-2 border-b pb-1">Route Details</h3>
                <div className="space-y-2 text-sm md:text-base">
                  <p><span className="text-gray-600">From:</span> <span className="font-semibold">{bilty.from_name}</span></p>
                  <p><span className="text-gray-600">To:</span> <span className="font-semibold">{bilty.to_name}</span></p>
                  <p><span className="text-gray-600">Date:</span> <span className="font-semibold">{formatDate(bilty.lr_date)}</span></p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-700 mb-2 border-b pb-1">Parties</h3>
                <div className="space-y-2 text-sm md:text-base">
                  <p><span className="text-gray-600">Consignor:</span> <span className="font-semibold">{bilty.consignor_name}</span></p>
                  <p><span className="text-gray-600">Consignee:</span> <span className="font-semibold">{bilty.consignee_name}</span></p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-700 mb-2 border-b pb-1">Transport Details</h3>
                <div className="space-y-2 text-sm md:text-base">
                  <p><span className="text-gray-600">Vehicle No:</span> <span className="font-semibold">{bilty.lorry_no || 'N/A'}</span></p>
                  <p><span className="text-gray-600">Driver:</span> <span className="font-semibold">{bilty.driver_name || 'N/A'}</span></p>
                  <p><span className="text-gray-600">Driver Mobile:</span> <span className="font-semibold">{bilty.driver_mobile || 'N/A'}</span></p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-700 mb-2 border-b pb-1">Financials</h3>
                <div className="space-y-2 text-sm md:text-base">
                  <p><span className="text-gray-600">Grand Total:</span> <span className="font-bold text-lg text-green-700">₹ {parseFloat(bilty.grand_total || 0).toFixed(2)}</span></p>
                  <p><span className="text-gray-600">E-Way Bill:</span> <span className="font-semibold">{bilty.eway_bill_no || 'N/A'}</span></p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 text-center border-t">
              <p className="text-sm text-gray-600">For any queries, please contact our support with your LR Number.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
