import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '../utils/dateFormatter'

export default function Ledger() {
  const navigate = useNavigate()
  const [parties, setParties] = useState([])
  const [selectedParty, setSelectedParty] = useState('')
  const [ledger, setLedger] = useState([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { fetchParties() }, [])

  const fetchParties = async () => {
    try {
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const res = await fetch(`${apiUrl}/api/parties`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setParties(d.data || []) }
    } catch (e) { console.error(e) }
  }

  const fetchLedger = async (code) => {
    if (!code) return
    try {
      setLoading(true); setError(null)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const res = await fetch(`${apiUrl}/api/ledger/${code}`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (!res.ok) throw new Error('Ledger fetch failed')
      const d = await res.json()
      setLedger(d.data || [])
      setBalance(d.balance || 0)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handlePartyChange = (e) => {
    const code = e.target.value
    setSelectedParty(code)
    fetchLedger(code)
  }

  const fmt = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  const fmtDate = (d) => d ? formatDate(d) : '-'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">📒 Party Ledger</h1>
            <p className="text-blue-200 text-sm">Complete transaction history & balance</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30">← Dashboard</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">Select Party</label>
          <select value={selectedParty} onChange={handlePartyChange} className="w-full md:w-96 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none">
            <option value="">-- Select a party --</option>
            {parties.map(p => <option key={p.id} value={p.party_code}>{p.party_name} ({p.party_code})</option>)}
          </select>
        </div>

        {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6 text-red-700">{error}</div>}

        {selectedParty && (
          <>
            <div className={`rounded-2xl shadow-lg p-6 mb-6 ${balance > 0 ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-gradient-to-r from-green-500 to-green-700'} text-white`}>
              <div className="text-sm opacity-90">Current Balance</div>
              <div className="text-4xl font-bold mt-1">{fmt(Math.abs(balance))}</div>
              <div className="text-sm mt-1">{balance > 0 ? '⬆️ To Receive (Party owes you)' : '⬇️ To Pay (You owe party)'}</div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-gray-700 to-gray-900 text-white p-4">
                <h3 className="font-bold">Transaction History ({ledger.length} entries)</h3>
              </div>
              {loading ? (
                <div className="p-12 text-center text-gray-500">Loading...</div>
              ) : ledger.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No transactions found for this party</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">DATE</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">TYPE</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">REF NO</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-600">DEBIT</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-600">CREDIT</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">REMARKS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map((row, i) => (
                        <tr key={i} className="border-t hover:bg-blue-50">
                          <td className="px-4 py-3 text-sm">{fmtDate(row.transaction_date)}</td>
                          <td className="px-4 py-3 text-sm font-medium">{row.transaction_type}</td>
                          <td className="px-4 py-3 text-sm text-blue-700">{row.reference_no || '-'}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-red-600">{row.debit > 0 ? fmt(row.debit) : '-'}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-green-600">{row.credit > 0 ? fmt(row.credit) : '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{row.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {!selectedParty && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📒</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Select a Party</h3>
            <p className="text-gray-500">Choose a party above to view their complete transaction history and balance</p>
          </div>
        )}
      </div>
    </div>
  )
}
