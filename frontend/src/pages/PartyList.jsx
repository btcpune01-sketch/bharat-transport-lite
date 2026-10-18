import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { customerAPI } from '../api'
import toast from 'react-hot-toast'

export default function PartyList() {
  const navigate = useNavigate()
  const [parties, setParties] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('All')

  useEffect(() => { fetchParties() }, [])

  const fetchParties = async () => {
    setLoading(true)
    try {
      const res = await customerAPI.getAll()
      setParties(res.data)
    } catch (err) {
      toast.error('Parties load नहीं हो पाईं')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`क्या आप सच में "${name}" को delete करना चाहते हैं?`)) return
    try {
      await customerAPI.delete(id)
      toast.success('Party delete हो गई')
      fetchParties()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed')
    }
  }

  const filteredParties = parties.filter(p => {
    const matchesSearch = 
      (p.customer_name || p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      p.customer_code?.toLowerCase().includes(search.toLowerCase()) ||
      p.mobile?.includes(search) ||
      p.gst_no?.toLowerCase().includes(search.toLowerCase())
    const matchesType = filterType === 'All' || p.customer_type === filterType
    return matchesSearch && matchesType
  })

  const openWhatsApp = (mobile) => {
    if (!mobile) return
    const cleanMobile = mobile.replace(/\D/g, '')
    const number = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`
    window.open(`https://wa.me/${number}`, '_blank')
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading parties...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Party Master (Customers)</h1>
          <button onClick={() => navigate('/party/new')} className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition flex items-center gap-2 font-medium">
            <span>+</span> Add New Party
          </button>
        </div>

        {/* Search & Filter */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4 mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="Search by Name, Code, Mobile, or GST..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500" 
            />
          </div>
          <div>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)} 
              className="w-full md:w-48 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="All" className="bg-slate-800">All Types</option>
              <option value="Cash" className="bg-slate-800">Cash</option>
              <option value="Credit" className="bg-slate-800">Credit</option>
              <option value="To-Pay" className="bg-slate-800">To-Pay</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-300 uppercase">Code</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-300 uppercase">Party Name</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-300 uppercase">Mobile</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-300 uppercase">City</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-300 uppercase">GST No</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-300 uppercase">Type</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-300 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredParties.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-400">No parties found matching your criteria.</td>
                  </tr>
                ) : (
                  filteredParties.map((party) => (
                    <tr key={party.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4 text-sm font-medium text-white">{party.customer_code}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        <div className="font-medium">{party.customer_name || party.name}</div>
                        {!party.is_active && <span className="text-xs text-red-400 font-semibold">Inactive</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">{party.mobile || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{party.city || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-300 font-mono">{party.gst_no || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          party.customer_type === 'Cash' ? 'bg-green-500/20 text-green-400' : 
                          party.customer_type === 'Credit' ? 'bg-blue-500/20 text-blue-400' : 
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {party.customer_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openWhatsApp(party.mobile || party.whatsapp)} 
                            className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition" 
                            title="WhatsApp"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                          </button>
                          <button 
                            onClick={() => navigate(`/party/edit/${party.id}`)} 
                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition" 
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDelete(party.id, party.customer_name || party.name)}
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
        <div className="mt-4 text-sm text-gray-400 text-right">Total Parties: {filteredParties.length}</div>
      </div>
    </div>
  )
}
