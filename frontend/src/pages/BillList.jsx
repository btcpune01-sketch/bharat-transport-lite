import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { formatDate } from '../utils/dateFormatter'

export default function BillList() {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadBills()
  }, [])

  const loadBills = async () => {
    try {
      setLoading(true)
      let serverBills = []
      let localBills = []

      // 1. Server से data लाओ
      try {
        const res = await api.get('/bills')
        serverBills = res.data?.data || res.data || []
        if (!Array.isArray(serverBills)) serverBills = []
      } catch (err) {
        console.warn('Server से bills नहीं मिले, local data check कर रहे हैं:', err)
      }

      // 2. Local Storage से data लाओ
      try {
        const stored = localStorage.getItem('btc_history')
        if (stored) {
          localBills = JSON.parse(stored)
          if (!Array.isArray(localBills)) localBills = []
        }
      } catch (err) {
        console.error('Local data पढ़ने में error:', err)
      }

      // 3. दोनों data को merge करो (Duplicates हटाओ)
      const combinedMap = new Map()
      
      // पहले local bills डालो
      localBills.forEach(bill => {
        const key = bill.bill_no || bill.id
        if (key) combinedMap.set(key, bill)
      })

      // फिर server bills डालो (ये local को override करेंगे)
      serverBills.forEach(bill => {
        const key = bill.bill_no || bill.id
        if (key) combinedMap.set(key, bill)
      })

      const finalBills = Array.from(combinedMap.values())

      setBills(finalBills)
      setLoadError(serverBills.length === 0 && finalBills.length > 0 ? 'Showing locally saved bills' : '')
      
    } catch (err) {
      console.error('Bill list load failed:', err)
      setLoadError('Unable to load bills.')
    } finally {
      setLoading(false)
    }
  }

  const deleteBill = async (bill) => {
    if (!window.confirm(`Delete bill ${bill.bill_no || ''}?`)) return
    try {
      // Server से delete करो (अगर server bill है)
      if (!String(bill.id).startsWith('local_')) {
        await api.delete(`/bills/${bill.id}`)
      }
      
      // Local से भी हटाओ
      const current = JSON.parse(localStorage.getItem('btc_history') || '[]')
      const updated = current.filter(item => item.id !== bill.id && item.bill_no !== bill.bill_no)
      localStorage.setItem('btc_history', JSON.stringify(updated))
      
      setBills(currentBills => currentBills.filter(item => item.id !== bill.id && item.bill_no !== bill.bill_no))
    } catch (err) {
      window.alert(err.response?.data?.error || 'Unable to delete this bill.')
    }
  }

  const filtered = bills.filter(b =>
    (b.bill_no || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.party_name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen w-full bg-[#eef2f7]">
      <header className="bg-red-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-bold text-lg">📋 Bill List ({filtered.length})</h1>
          <div className="flex gap-2">
            <Link to="/bill-entry" className="bg-white text-red-700 px-4 py-2 rounded-lg text-sm font-medium">+ New Bill</Link>
            <button onClick={() => navigate('/dashboard')} className="bg-white/20 px-4 py-2 rounded-lg text-sm">← Back</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loadError && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>{loadError}</span>
            <button type="button" onClick={loadBills} className="shrink-0 font-semibold underline">Retry</button>
          </div>
        )}

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
              ) : (
                filtered.map(bill => (
                  <tr key={bill.id || bill.bill_no} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-red-700">{bill.bill_no || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{bill.bill_date ? formatDate(bill.bill_date) : '-'}</td>
                    <td className="px-4 py-3 text-sm">{bill.party_name || 'N/A'}</td>
                    <td className="px-4 py-3 text-right font-medium">₹{Number(bill.grand_total || bill.grandtotal || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">₹{Number(bill.net_balance || bill.balance_due || bill.balance || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-center">
                      <Link to={`/bill-entry?id=${bill.id}`} className="ml-2 bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 text-sm font-medium inline-block">Edit</Link>
                      <Link to={`/bill-print/${bill.id}`} className="ml-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium inline-block">Print</Link>
                      <button type="button" onClick={() => deleteBill(bill)} className="ml-2 bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 text-sm font-medium">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
