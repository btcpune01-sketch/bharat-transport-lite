import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api from '../api'
import { formatDate } from '../utils/dateFormatter'

const COMPANY = {
  name: "BHARAT TRANSPORT COMPANY",
  gst: "08CMRPP0955N1Z5",
  pan: "CMRPP0955N",
  address: "Ward No. 17, Purana Falsa, Pilani Road, Rajgarh, Churu, Rajasthan - 331023",
  phone: "+91 9680264231",
  email: "bharattrsnportcompany@gmail.com",
}

export default function MRPrint() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const mrNo = searchParams.get('mr_no')

  useEffect(() => {
    let active = true
    setLoading(true)
    setData(null)
    setError('')
    const loadReceipt = async () => {
      try {
        if (id) {
          const res = await api.get(`/api/mr/${id}`)
          if (active) setData(res.data)
        } else {
          const res = await api.get('/api/mr')
          const rows = Array.isArray(res.data) ? res.data : res.data?.data || []
          if (active) setReceipts(rows)
          if (mrNo) {
            const receipt = rows.find((item) => item.mr_no === mrNo)
            if (!receipt) throw new Error('Money receipt not found.')
            if (active) setData(receipt)
          }
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || err.message || 'Unable to load money receipts.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadReceipt()
    return () => { active = false }
  }, [id, mrNo])

  if (loading) return <div role="status" className="p-8 text-center">Loading money receipt...</div>
  if (!id && !mrNo) return (
    <div className="min-h-screen bg-gray-100 p-4">
      <main className="max-w-5xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Select a MR to Print</h1>
          <button onClick={() => navigate('/mr')} className="px-4 py-2 bg-gray-600 text-white rounded-lg">← Back</button>
        </div>
        {error && <p role="alert" className="text-red-700 mb-4">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr><th className="p-3">MR No.</th><th className="p-3">Date</th><th className="p-3">Party</th><th className="p-3 text-right">Amount</th><th className="p-3">Action</th></tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr><td colSpan="5" className="p-6 text-center text-gray-500">No money receipts found.</td></tr>
              ) : receipts.map((receipt) => (
                <tr key={receipt.id} onClick={() => navigate(`/mr/print?mr_no=${encodeURIComponent(receipt.mr_no)}`)} className="border-t hover:bg-gray-50 cursor-pointer">
                  <td className="p-3 font-semibold">{receipt.mr_no || 'N/A'}</td>
                  <td className="p-3">{formatDate(receipt.mr_date)}</td>
                  <td className="p-3">{receipt.party_name || 'N/A'}</td>
                  <td className="p-3 text-right">₹{Number(receipt.amount || 0).toLocaleString('en-IN')}</td>
                  <td className="p-3"><button className="text-blue-700 underline" onClick={(event) => { event.stopPropagation(); navigate(`/mr/print?mr_no=${encodeURIComponent(receipt.mr_no)}`) }}>Print</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center bg-white p-6 rounded-lg shadow">
        <p role="alert" className="text-red-700 mb-4">{error || 'Money receipt data is unavailable.'}</p>
        <button onClick={() => navigate('/mr')} className="px-4 py-2 bg-gray-600 text-white rounded-lg">← Back</button>
      </div>
    </div>
  )

  const formatCurrency = (amount) => '₹' + parseFloat(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

  return (
    <div className="min-h-screen bg-gray-100 p-4 print:p-0 print:bg-white">
      {/* PRINT BUTTON - NO PRINT SECTION */}
      <div className="no-print mb-4 flex justify-between items-center max-w-4xl mx-auto">
        <button onClick={() => navigate('/mr')} className="px-4 py-2 bg-gray-600 text-white rounded-lg">← Back</button>
        <button onClick={() => window.print()} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">🖨️ Print</button>
      </div>

      <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg print:shadow-none print:p-4 border-2 border-gray-800">
        {/* HEADER */}
        <div className="text-center border-b-4 border-black pb-4 mb-4">
          <h1 className="text-3xl font-black text-red-700 uppercase tracking-wide">{COMPANY.name}</h1>
          <p className="text-xs font-bold mt-2">{COMPANY.address}</p>
          <div className="flex justify-center gap-6 text-xs font-bold mt-2">
            <span>📞 {COMPANY.phone}</span>
            <span>✉️ {COMPANY.email}</span>
          </div>
          <div className="flex justify-center gap-6 text-xs font-bold mt-2 text-blue-900">
            <span>GSTIN: {COMPANY.gst}</span>
            <span>PAN: {COMPANY.pan}</span>
          </div>
        </div>

        <div className="flex justify-between items-end mb-6 border-b-2 border-gray-300 pb-4">
          <div>
            <h2 className="text-2xl font-black text-gray-800">MONEY RECEIPT</h2>
            <p className="text-sm font-bold mt-1">MR No: <span className="text-red-700 text-xl">{data.mr_no}</span></p>
            <p className="text-sm">Date: {formatDate(data.mr_date)}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold">Original Copy (For Party)</p>
          </div>
        </div>

        {/* DETAILS */}
        <div className="mb-6 text-sm">
          <p className="mb-2"><span className="font-bold">Received with thanks from:</span> <span className="text-lg font-black">{data.party_name}</span></p>
          <p className="mb-2"><span className="font-bold">Party Type:</span> {data.party_type}</p>
          <p className="mb-4"><span className="font-bold">Against Bilty/LR No:</span> {data.bilty_lr_no || 'N/A'} | <span className="font-bold">Bill No:</span> {data.bill_no || 'N/A'}</p>
          
          <div className="bg-gray-100 border-2 border-gray-800 p-4 rounded text-center my-4">
            <p className="text-sm font-bold text-gray-600 uppercase">Amount Received</p>
            <p className="text-4xl font-black text-green-700 my-2">{formatCurrency(data.amount)}</p>
            <p className="text-sm font-bold">Payment Mode: {data.payment_mode} {data.is_advance ? '(Advance)' : ''}</p>
          </div>

          {data.remarks && (
            <div className="mb-4">
              <p className="font-bold">Remarks:</p>
              <p className="border-b border-gray-400 pb-1">{data.remarks}</p>
            </div>
          )}
        </div>

        {/* SIGNATURE */}
        <div className="mt-12 pt-4 border-t-2 border-black flex justify-end items-end">
          <div className="text-right">
            <p className="text-sm font-bold mb-8">FOR {COMPANY.name}</p>
            <div className="border-t-2 border-black inline-block pt-1">
              <p className="text-xs font-bold">Authorized Signatory</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500 border-t border-gray-300 pt-2">
          <p className="mt-1">This is a computer generated receipt. Subject to Rajgarh (Rajasthan) jurisdiction.</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  )
}
