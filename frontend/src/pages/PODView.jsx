import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '../utils/dateFormatter'

export default function PODView() {
  const navigate = useNavigate()
  const [lrNo, setLrNo] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!lrNo) {
      alert('Please enter LR Number!')
      return
    }

    try {
      setLoading(true)
      setError('')
      setResult(null)
      
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const res = await fetch(`${apiUrl}/api/public/pod-view?lr_no=${encodeURIComponent(lrNo)}`)
      
      if (res.ok) {
        const data = await res.json()
        setResult(data)
      } else {
        const err = await res.json()
        setError(err.error || 'POD not found')
      }
    } catch (err) {
      setError('Failed to fetch POD details')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return '' + parseFloat(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <nav className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="bg-white/20 p-2 rounded-lg hover:bg-white/30">← Back</button>
            <div>
              <h1 className="font-bold text-xl">👁️ POD View Portal</h1>
              <p className="text-xs text-blue-200">Check Proof of Delivery (No Login Required)</p>
            </div>
          </div>
          <button onClick={() => navigate('/pod-upload')} className="bg-white text-blue-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-50">
             Upload POD
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4"> Find POD by LR Number</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={lrNo}
              onChange={(e) => setLrNo(e.target.value)}
              className="flex-1 border-2 border-blue-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 uppercase"
              placeholder="Enter LR Number (e.g., BTC/26/0001)"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-blue-700 text-white rounded-lg font-bold hover:bg-blue-800 shadow disabled:opacity-50"
            >
              {loading ? 'Searching...' : '🔍 Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-6 rounded-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-3"></span>
              <p className="font-bold text-red-800">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {result.bilty && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2"> Bilty Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-gray-500 text-xs">LR Number</div>
                    <div className="font-bold text-blue-700">{result.bilty.lr_no}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">LR Date</div>
                    <div className="font-bold">{result.bilty.lr_date ? formatDate(result.bilty.lr_date) : '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Status</div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      result.bilty.pod_status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {result.bilty.pod_status || 'Pending'}
                    </span>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Consignor (From)</div>
                    <div className="font-bold">{result.bilty.consignor_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Consignee (To)</div>
                    <div className="font-bold">{result.bilty.consignee_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Route</div>
                    <div className="font-bold">{result.bilty.from_name || '-'} → {result.bilty.to_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Packages</div>
                    <div className="font-bold">{result.bilty.packages || '-'} Pcs</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Weight</div>
                    <div className="font-bold">{result.bilty.actual_weight || '-'} Kg</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Freight</div>
                    <div className="font-bold text-green-700">{formatCurrency(result.bilty.grand_total)}</div>
                  </div>
                </div>
              </div>
            )}

            {result.pod ? (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <h3 className="text-lg font-bold text-gray-800">✅ Proof of Delivery</h3>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                    DELIVERED
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <div className="text-gray-500 text-xs">Delivery Date</div>
                    <div className="font-bold">{result.pod.delivery_date ? formatDate(result.pod.delivery_date) : '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Delivered By</div>
                    <div className="font-bold">{result.pod.delivered_by || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Received By</div>
                    <div className="font-bold">{result.pod.receiver_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Receiver Phone</div>
                    <div className="font-bold">{result.pod.receiver_phone || '-'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-500 text-xs">Remarks</div>
                    <div className="font-bold">{result.pod.delivery_remarks || '-'}</div>
                  </div>
                </div>

                {result.pod.photo_url && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-bold text-gray-700 mb-3">📸 POD Photo / Signature</h4>
                    <img 
                      src={result.pod.photo_url} 
                      alt="POD Proof" 
                      className="max-w-full h-auto max-h-96 mx-auto border-2 border-gray-300 rounded-lg shadow"
                    />
                    <div className="mt-3 text-center">
                      <a 
                        href={result.pod.photo_url} 
                        download={`POD_${result.bilty?.lr_no || 'document'}.jpg`}
                        className="inline-block px-4 py-2 bg-blue-700 text-white rounded-lg font-bold hover:bg-blue-800 text-sm"
                      >
                        ⬇️ Download Photo
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-lg">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">⏳</span>
                  <div>
                    <p className="font-bold text-yellow-800">POD Not Yet Uploaded</p>
                    <p className="text-sm text-yellow-700">This bilty is still in transit or POD has not been uploaded yet.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 bg-purple-50 border-l-4 border-purple-500 p-4 rounded-lg">
          <h4 className="font-bold text-purple-800 mb-2">️ About POD View:</h4>
          <ul className="text-sm text-purple-700 space-y-1">
            <li>• Enter your LR/Bilty number to check delivery status</li>
            <li>• View POD photo and delivery details</li>
            <li>• No login required - share this link with your customers</li>
            <li>• Download POD photo for your records</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
