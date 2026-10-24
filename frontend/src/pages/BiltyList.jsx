import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { biltyAPI } from '../api'
import toast from 'react-hot-toast'
import { formatDate } from '../utils/dateFormatter'

export default function BiltyList() {
  const navigate = useNavigate()
  const [biltyList, setBiltyList] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
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
      if (!Array.isArray(data)) throw new Error('The server returned an invalid bilty list.')
      console.log('Processed Data:', data)
      
      setBiltyList(data)
      setLoadError('')
    } catch (err) {
      console.error('Error fetching bilties:', err)
      toast.error('Bilties load नहीं हो पाईं: ' + (err.message || 'Unknown error'))
      setLoadError(err.response?.data?.error || err.message || 'Unable to load bilties.')
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
    'Booked': 'bg-blue-100 text-blue-700',
    'In-Transit': 'bg-yellow-100 text-yellow-700',
    'Reached': 'bg-purple-100 text-purple-700',
    'Out for Delivery': 'bg-orange-100 text-orange-700',
    'Delivered': 'bg-green-100 text-green-700',
    'Cancelled': 'bg-red-100 text-red-700',
    'RTO': 'bg-gray-100 text-gray-700'
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading bilties...</div>

  return (
    <div className="min-h-screen p-6 w-full bg-[#eef2f7]">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-black">Bilty List (LR)</h1>
          <button onClick={() => navigate('/bilty/new')} className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition flex items-center gap-2 font-medium">
            <span>+</span> New Bilty
          </button>
        </div>

        {loadError && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-950/70 px-4 py-3 text-sm text-amber-100">
            <span>Bilty data could not be loaded: {loadError}</span>
            <button type="button" onClick={fetchBilties} className="shrink-0 font-semibold underline">Retry</button>
          </div>
        )}

        {/* Search & Filter */}
        <div className="bg-white border border-[#d1d9e6] shadow-sm rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="Search by LR No, Consignor, Consignee, or Mobile..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full px-4 py-2 bg-white border border-[#c2cddf] rounded-lg text-[#0f172a] placeholder:text-gray-400 focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20"
            />
          </div>
          <div className="flex gap-4">
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="px-4 py-2 bg-white border border-[#c2cddf] rounded-lg text-[#0f172a] focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20"
            >
              <option value="All">All Status</option>
              <option value="Booked">Booked</option>
              <option value="In-Transit">In-Transit</option>
              <option value="Reached">Reached</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
              <option value="RTO">RTO</option>
            </select>
            <select 
              value={filterBranch} 
              onChange={(e) => setFilterBranch(e.target.value)} 
              className="px-4 py-2 bg-white border border-[#c2cddf] rounded-lg text-[#0f172a] focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20"
            >
              <option value="All">All Branches</option>
              <option value="RAJ">Rajgarh</option>
              <option value="DEL">Delhi</option>
              <option value="MUM">Mumbai</option>
              <option value="JAI">Jaipur</option>
              <option value="AHM">Ahmedabad</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-[#d1d9e6] shadow-sm rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-700 uppercase">LR No</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Date</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-700 uppercase">From</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-700 uppercase">To</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Consignor</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Grand Total</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-700 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadError ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-amber-200">
                      Bilty data is unavailable. Retry after the database connection is restored.
                    </td>
                  </tr>
                ) : filteredBilties.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-slate-600">
                      {biltyList.length === 0 ? 'No bilties found. Create your first bilty!' : 'No bilties found matching your criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredBilties.map((bilty) => (
                    <tr key={bilty.lr_no} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => navigate(`/bilty/view/${bilty.lr_no}`)}>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{bilty.lr_no}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{formatDate(bilty.lr_date)}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{bilty.from_code}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{bilty.to_code}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{bilty.consignor_name}</td>
                      <td className="px-6 py-4 text-sm font-bold text-green-400">₹{bilty.grand_total || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[bilty.status] || 'bg-gray-100 text-gray-700'}`}>
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
        <div className="mt-4 text-sm text-slate-600 text-right">Total Bilties: {filteredBilties.length}</div>
      </div>
    </div>
  )
}
