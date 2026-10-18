import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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

export default function GadiChallanPrint() {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = routeId || searchParams.get('id')
  const [data, setData] = useState(null)
  const [challans, setChallans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setData(null)
    setError('')
    const loadChallan = async () => {
      try {
        if (id) {
          const res = await api.get(`/api/gadi-challan/${id}`)
          if (active) setData(res.data)
        } else {
          const res = await api.get('/api/gadi-challan')
          const rows = Array.isArray(res.data) ? res.data : res.data?.data || []
          if (active) setChallans(rows)
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Unable to load challans.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadChallan()
    return () => { active = false }
  }, [id])

  if (loading) return <div role="status" className="p-8 text-center">Loading challan...</div>
  if (!id) return (
    <div className="min-h-screen bg-gray-100 p-4">
      <main className="max-w-5xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Select a Challan to Print</h1>
          <button onClick={() => navigate('/gadi-challan')} className="px-4 py-2 bg-gray-600 text-white rounded-lg">← Back</button>
        </div>
        {error && <p role="alert" className="text-red-700 mb-4">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr><th className="p-3">Challan No.</th><th className="p-3">Date</th><th className="p-3">Vehicle</th><th className="p-3">Driver</th><th className="p-3">Action</th></tr>
            </thead>
            <tbody>
              {challans.length === 0 ? (
                <tr><td colSpan="5" className="p-6 text-center text-gray-500">No challans found.</td></tr>
              ) : challans.map((challan) => (
                <tr key={challan.id} onClick={() => navigate(`/gadi-challan-print/${challan.id}`)} className="border-t hover:bg-gray-50 cursor-pointer">
                  <td className="p-3 font-semibold">{challan.challan_no || 'N/A'}</td>
                  <td className="p-3">{formatDate(challan.issue_date)}</td>
                  <td className="p-3">{challan.vehicle_no || 'N/A'}</td>
                  <td className="p-3">{challan.driver_name || 'N/A'}</td>
                  <td className="p-3"><Link className="text-blue-700 underline" to={`/gadi-challan-print/${challan.id}`} onClick={(event) => event.stopPropagation()}>Print</Link></td>
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
        <p role="alert" className="text-red-700 mb-4">{error || 'Challan data is unavailable.'}</p>
        <button onClick={() => navigate('/gadi-challan')} className="px-4 py-2 bg-gray-600 text-white rounded-lg">← Back</button>
      </div>
    </div>
  )

  const formatCurrency = (amount) => '₹' + parseFloat(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

  return (
    <div className="min-h-screen bg-gray-100 p-4 print:p-0 print:bg-white">
      {/* PRINT BUTTON - NO PRINT SECTION */}
      <div className="no-print mb-4 flex justify-between items-center max-w-4xl mx-auto">
        <button onClick={() => navigate('/gadi-challan')} className="px-4 py-2 bg-gray-600 text-white rounded-lg">← Back</button>
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

        <div className="text-center mb-6">
          <h2 className="text-2xl font-black border-2 border-black inline-block px-8 py-2 rounded">GADI CHALLAN</h2>
          <p className="mt-2 font-bold">Challan No: <span className="text-red-700 text-xl">{data.challan_no}</span> | Date: {formatDate(data.issue_date)}</p>
        </div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="border-2 border-gray-400 p-3 rounded">
            <p className="font-bold text-gray-600 text-xs uppercase">Vehicle Details</p>
            <p><span className="font-bold">Vehicle No:</span> {data.vehicle_no}</p>
            <p><span className="font-bold">Driver:</span> {data.driver_name} ({data.driver_mobile})</p>
            <p><span className="font-bold">License:</span> {data.driver_license}</p>
          </div>
          <div className="border-2 border-gray-400 p-3 rounded">
            <p className="font-bold text-gray-600 text-xs uppercase">Owner / Broker Details</p>
            <p><span className="font-bold">Owner:</span> {data.owner_name} ({data.owner_mobile})</p>
            <p><span className="font-bold">Broker:</span> {data.broker_name} ({data.broker_mobile})</p>
          </div>
          <div className="border-2 border-gray-400 p-3 rounded col-span-2">
            <p className="font-bold text-gray-600 text-xs uppercase">Route & Material</p>
            <div className="grid grid-cols-2 gap-2">
              <p><span className="font-bold">From:</span> {data.from_place}</p>
              <p><span className="font-bold">To:</span> {data.to_place}</p>
              <p><span className="font-bold">Material:</span> {data.material_desc}</p>
              <p><span className="font-bold">Weight:</span> {data.weight} | <span className="font-bold">Packages:</span> {data.packages}</p>
            </div>
          </div>
        </div>

        {/* FINANCIALS */}
        <table className="w-full border-collapse border-2 border-black text-sm mb-6">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black p-2 text-left">Description</th>
              <th className="border border-black p-2 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border border-black p-2">Freight Amount</td><td className="border border-black p-2 text-right">{formatCurrency(data.freight_amount)}</td></tr>
            <tr><td className="border border-black p-2">Broker Commission</td><td className="border border-black p-2 text-right">{formatCurrency(data.broker_commission)}</td></tr>
            <tr><td className="border border-black p-2">Toll Expense</td><td className="border border-black p-2 text-right">{formatCurrency(data.toll_expense)}</td></tr>
            <tr><td className="border border-black p-2">Diesel Expense</td><td className="border border-black p-2 text-right">{formatCurrency(data.diesel_expense)}</td></tr>
            <tr><td className="border border-black p-2">Other Expenses</td><td className="border border-black p-2 text-right">{formatCurrency(data.other_expense)}</td></tr>
            <tr><td className="border border-black p-2 font-bold">TDS Deduction</td><td className="border border-black p-2 text-right font-bold text-red-600">- {formatCurrency(data.tds_deduction)}</td></tr>
            <tr className="bg-gray-100">
              <td className="border border-black p-2 font-black text-lg">NET PAYABLE</td>
              <td className="border border-black p-2 text-right font-black text-lg text-green-700">{formatCurrency(data.net_payable)}</td>
            </tr>
          </tbody>
        </table>

        {/* SIGNATURE */}
        <div className="grid grid-cols-2 gap-8 mt-8 pt-4 border-t-2 border-black">
          <div className="col-start-2 text-right">
            <p className="text-sm font-bold mb-8">FOR {COMPANY.name}</p>
            <div className="border-t-2 border-black inline-block pt-1">
              <p className="text-xs font-bold">Authorized Signatory</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500 border-t border-gray-300 pt-2">
          <p className="mt-1">This is a computer generated challan. Subject to Rajgarh (Rajasthan) jurisdiction.</p>
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
