import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { biltyAPI } from '../api'
import toast from 'react-hot-toast'
import { formatDate } from '../utils/dateFormatter'

export default function BiltyList() {
  const navigate = useNavigate()
  const [biltyList, setBiltyList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterBranch, setFilterBranch] = useState('All')

  useEffect(() => { fetchBilties() }, [])

  const fetchBilties = async () => {
    setLoading(true)
    try {
      const res = await biltyAPI.getAll()
      console.log('API Response:', res)
      console.log('API Data:', res.data)
      
      // Check if data is array or object
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.consignments || res.data?.bilty || [])
      console.log('Processed Data:', data)
      
      setBiltyList(data)
    } catch (err) {
      console.error('Error fetching bilties:', err)
      toast.error('Bilties load नहीं हो पाईं: ' + (err.message || 'Unknown error'))
      setBiltyList([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (lrNo) => {
    if (!window.confirm(`क्या आप सच में LR No "${lrNo}" को delete करना चाहते हैं?`)) return
    try {
      await biltyAPI.deleteByLR(lrNo)
      toast.success('Bilty delete हो गई')
      fetchBilties()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed')
    }
  }

  const filteredBilties = biltyList.filter(b => {
    const matchesSearch = 
      b.lr_no?.toLowerCase().includes(search.toLowerCase()) ||
      b.consignor_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.consignee_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.consignor_mobile?.includes(search) ||
      b.consignee_mobile?.includes(search)
    const matchesStatus = filterStatus === 'All' || b.status === filterStatus
    const matchesBranch = filterBranch === 'All' || b.branch_code === filterBranch
    return matchesSearch && matchesStatus && matchesBranch
  })

  const statusColors = {
    'Booked': 'bg-blue-500/20 text-blue-400',
    'In-Transit': 'bg-yellow-500/20 text-yellow-400',
    'Reached': 'bg-purple-500/20 text-purple-400',
    'Out for Delivery': 'bg-orange-500/20 text-orange-400',
    'Delivered': 'bg-green-500/20 text-green-400',
    'Cancelled': 'bg-red-500/20 text-red-400',
    'RTO': 'bg-gray-500/20 text-gray-400'
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading bilties...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Bilty List (LR)</h1>
          <button onClick={() => navigate('/bilty/new')} className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition flex items-center gap-2 font-medium">
            <span>+</span> New Bilty
          </button>
        </div>

        {/* Search & Filter */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4 mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="Search by LR No, Consignor, Consignee, or Mobile..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500" 
            />
          </div>
          <div className="flex gap-4">
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="All" className="bg-slate-800">All Status</option>
              <option value="Booked" className="bg-slate-800">Booked</option>
              <option value="In-Transit" className="bg-slate-800">In-Transit</option>
              <option value="Reached" className="bg-slate-800">Reached</option>
              <option value="Out for Delivery" className="bg-slate-800">Out for Delivery</option>
              <option value="Delivered" className="bg-slate-800">Delivered</option>
              <option value="Cancelled" className="bg-slate-800">Cancelled</option>
              <option value="RTO" className="bg-slate-800">RTO</option>
            </select>
            <select 
              value={filterBranch} 
              onChange={(e) => setFilterBranch(e.target.value)} 
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="All" className="bg-slate-800">All Branches</option>
              <option value="RAJ" className="bg-slate-800">Rajgarh</option>
              <option value="DEL" className="bg-slate-800">Delhi</option>
              <option value="MUM" className="bg-slate-800">Mumbai</option>
              <option value="JAI" className="bg-slate-800">Jaipur</option>
              <option value="AHM" className="bg-slate-800">Ahmedabad</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-300 uppercase">LR No</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-300 uppercase">Date</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-300 uppercase">From</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-300 uppercase">To</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-300 uppercase">Consignor</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-300 uppercase">Grand Total</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-300 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredBilties.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-400">
                      {biltyList.length === 0 ? 'No bilties found. Create your first bilty!' : 'No bilties found matching your criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredBilties.map((bilty) => (
                    <tr key={bilty.lr_no} className="hover:bg-white/5 transition cursor-pointer" onClick={() => navigate(`/bilty/view/${bilty.lr_no}`)}>
                      <td className="px-6 py-4 text-sm font-bold text-white">{bilty.lr_no}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{formatDate(bilty.lr_date)}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{bilty.from_code}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{bilty.to_code}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{bilty.consignor_name}</td>
                      <td className="px-6 py-4 text-sm font-bold text-green-400">₹{bilty.grand_total || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[bilty.status] || 'bg-gray-500/20 text-gray-400'}`}>
                          {bilty.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => navigate(`/bilty/print?lr_no=${encodeURIComponent(bilty.lr_no)}`)} 
                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition" 
                            title="Print"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                            </svg>
                          </button>
                          <button 
                            onClick={() => navigate(`/bilty/edit/${bilty.lr_no}`)} 
                            className="p-2 text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition" 
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDelete(bilty.lr_no)} 
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition" 
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-400 text-right">Total Bilties: {filteredBilties.length}</div>
      </div>
    </div>
  )
}
