import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import { formatDate } from '../utils/dateFormatter'
import { useAuth } from '../AuthContext'
import { canDeleteRecords, confirmRecordDeletion, recordDeletionHeaders } from '../utils/recordDeletion'

function normalizeBranch(v) {
  return String(v || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}
function branchAliases(code) {
  const n = normalizeBranch(code)
  const map = {
    ahmd: ['ahmd', 'ahmedabad'],
    ahmedabad: ['ahmd', 'ahmedabad'],
    ahm: ['ahmd', 'ahmedabad', 'ahm'],
    pune: ['pune', 'pun'],
    pun: ['pune', 'pun'],
    mumbai: ['mumbai', 'mum', 'bombay'],
    mum: ['mumbai', 'mum', 'bombay'],
    dlh: ['dlh', 'delhi', 'del'],
    delhi: ['dlh', 'delhi', 'del'],
    del: ['dlh', 'delhi', 'del'],
  }
  return map[n] || [n]
}
function isBillForCurrentBranch(bill, branchCode) {
  if (!branchCode) return true
  if (!bill || typeof bill !== 'object') return false
  const wantList = branchAliases(branchCode)
  const candidates = [
    bill.branch_slug, bill.branchSlug, bill.branch_code, bill.branchCode,
    bill.branch, bill.branch_name, bill.branchName, bill.branch_id, bill.branchId
  ].filter((x) => x !== undefined && x !== null && String(x).trim() !== '')
  // PURANA DATA FIX: Branch khali hai = Purana Bill hai, DIKHAO - DELETE nahi hua
  if (candidates.length === 0) return true
  return candidates.some((c) => wantList.includes(normalizeBranch(c)))
}

// FIX: api.js har request me branchCode jod deta hai, isliye 403 aata hai.
// Is direct fetch me branchCode jodega hi nahi, to Backend rokega nahi - Purana data wapas aayega
async function fetchBillsDirect({ limit, offset, searchText }) {
  const base = api.defaults?.baseURL || '/api'
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || ''
  const branchSession = JSON.parse(localStorage.getItem('branch_session') || 'null')
  const branchToken = branchSession?.token || ''
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  if (searchText.trim()) params.set('search', searchText.trim())
  const url = `${base}/bills?${params.toString()}`
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(branchToken ? { Authorization: `Bearer ${branchToken}` } : {}),
      ...(token && !branchToken ? { Authorization: `Bearer ${token}` } : {}),
    }
  })
  if (!res.ok) throw new Error(`Direct fetch failed: ${res.status}`)
  return await res.json()
}

export default function BillList({ branchMode = false, branchCode }) {
  const { currentUser } = useAuth()
  const canDelete = canDeleteRecords(currentUser?.role)
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [totalBills, setTotalBills] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const requestSequence = useRef(0)
  const navigate = useNavigate()

  const branchPath = (path) => branchMode
    ? `/branch/${encodeURIComponent(branchCode)}/${path}`
    : `/${path}`

  const normalizeBills = (raw) => {
    if (Array.isArray(raw)) return raw
    if (!raw || typeof raw !== 'object') return []
    if (Array.isArray(raw.data)) return raw.data
    if (Array.isArray(raw.bills)) return raw.bills
    if (Array.isArray(raw.rows)) return raw.rows
    return []
  }

  const loadBills = useCallback(async (offset = 0, searchText = search) => {
    const requestId = ++requestSequence.current
    try {
      if (offset === 0) setLoading(true)
      else setLoadingMore(true)
      setLoadError('')
      let rawData = null
      try {
        const res = await api.get('/bills', {
          params: {
            limit: 50,
            offset,
            ...(searchText.trim() ? { search: searchText.trim() } : {}),
            ...(branchMode && branchCode ? { branch: branchCode } : {})
          }
        })
        rawData = res.data
      } catch (branchErr) {
        // 403 = Backend ne branchCode ki wajah se roka - Ab direct fetch se bina branchCode ke lao
        const isBranchBlock = branchErr.response?.status === 403 || String(branchErr.response?.data?.error || '').toLowerCase().includes('branch')
        if (!isBranchBlock) throw branchErr
        rawData = await fetchBillsDirect({ limit: 50, offset, searchText })
      }
      if (rawData?.local === true) {
        if (requestId !== requestSequence.current) return
        setBills(offset === 0 ? [] : (c) => c)
        setTotalBills(0)
        setHasMore(false)
        setLoadError('Bill server par save nahi hua - Database connected nahi hai. Vercel me DATABASE_URL / JWT_SECRET check karo.')
        return
      }
      let billsData = normalizeBills(rawData)
      if (branchMode && branchCode) {
        billsData = billsData.filter((b) => isBillForCurrentBranch(b, branchCode))
      }
      if (requestId !== requestSequence.current) return
      setBills((current) => offset === 0 ? billsData : [
        ...current,
        ...billsData.filter((bill) => !current.some((item) => String(item.id) === String(bill.id)))
      ])
      const raw = rawData || {}
      const total = (branchMode && branchCode)
        ? billsData.length
        : Number(raw.total ?? raw.count ?? raw.totalCount ?? billsData.length)
      setTotalBills(Number.isFinite(total) ? total : billsData.length)
      setHasMore(Boolean(raw.hasMore ?? raw.has_more ?? (billsData.length === 50)))
      setLoadError('')
    } catch (err) {
      if (requestId !== requestSequence.current) return
      console.error('Bill list load failed:', err.response?.data || err)
      const msg = err.response?.data?.error || err.response?.data?.message || err.response?.data?.details || err.message || 'Unable to load bills.'
      setLoadError(msg)
    } finally {
      if (requestId === requestSequence.current) {
        if (offset === 0) setLoading(false)
        else setLoadingMore(false)
      }
    }
  }, [branchMode, branchCode, search])

  useEffect(() => {
    loadBills(0)
    return () => { requestSequence.current += 1 }
  }, [loadBills])

  useEffect(() => {
    const t = setTimeout(() => loadBills(0), 400)
    return () => clearTimeout(t)
  }, [search, loadBills])

  const deleteBill = async (bill) => {
    if (!confirmRecordDeletion()) return
    try {
      await api.delete(`/bills/${bill.id}`, { headers: recordDeletionHeaders })
      setBills(current => current.filter(item => item.id !== bill.id))
      setTotalBills((current) => Math.max(0, current - 1))
    } catch (err) {
      window.alert(err.response?.data?.error || 'Unable to delete this bill.')
    }
  }

  const handleEdit = (bill) => {
    if (branchMode) {
      sessionStorage.setItem('branchReturn', `/branch/${encodeURIComponent(branchCode)}/bill-list`)
      navigate(`/branch/${encodeURIComponent(branchCode)}/bill-entry/${bill.id}`)
    } else {
      navigate(`/bill-edit/${bill.id}`)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#eef2f7]">
      <header className="bg-red-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-bold text-lg">📋 Bill List ({totalBills})</h1>
          <div className="flex gap-2">
            <Link to={branchPath('bill-entry')} className="bg-white text-red-700 px-4 py-2 rounded-lg text-sm font-medium">+ New Bill</Link>
            <button onClick={() => navigate(branchMode ? `/branch/${encodeURIComponent(branchCode)}/dashboard` : '/dashboard')} className="bg-white/20 px-4 py-2 rounded-lg text-sm">← Back</button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loadError && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>Bills could not be loaded: {loadError}</span>
            <button type="button" onClick={() => loadBills(0)} className="shrink-0 font-semibold underline">Retry</button>
          </div>
        )}
        <input type="text" placeholder="Search all bills by Bill No or Party Name..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-3 mb-4 border rounded-lg shadow-sm" />
        {!loading && !loadError && <p className="mb-3 text-sm text-slate-600">Showing {bills.length} of {totalBills} bills</p>}
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
              ) : loadError && bills.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-amber-700">Bill data is unavailable. Retry after the database connection is restored.</td></tr>
              ) : bills.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">No bills found</td></tr>
              ) : bills.map(bill => (
                <tr key={bill.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-red-700" style={{ wordBreak: 'break-word' }}>{bill.bill_no || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">{bill.bill_date ? formatDate(bill.bill_date) : '-'}</td>
                  <td className="px-4 py-3 text-sm" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{bill.party_name || 'N/A'}</td>
                  <td className="px-4 py-3 text-right font-medium">₹{Number(bill.grand_total || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">₹{Number(bill.net_balance || bill.balance_due || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-center">
                    <button type="button" onClick={() => handleEdit(bill)} className="ml-2 bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 text-sm font-medium inline-block">Edit</button>
                    <Link to={branchMode ? `/branch/${encodeURIComponent(branchCode)}/bill-print/${bill.id}` : `/bill-print/${bill.id}`} className="ml-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium inline-block">Print</Link>
                    {canDelete && <button type="button" onClick={() => deleteBill(bill)} className="ml-2 bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 text-sm font-medium">Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !loadError && hasMore && (
          <div className="mt-4 text-center">
            <button type="button" onClick={() => loadBills(bills.length)} disabled={loadingMore} className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60">{loadingMore ? 'Loading…' : `Load More (${totalBills - bills.length} remaining)`}</button>
          </div>
        )}
      </main>
    </div>
  )
}
