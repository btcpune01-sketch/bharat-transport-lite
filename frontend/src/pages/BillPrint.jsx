import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api'
import { formatDate } from '../utils/dateFormatter'

const BillPrint = () => {
  const { id } = useParams()
  const [bills, setBills] = useState([])
  const [selectedBill, setSelectedBill] = useState(null)
  const [loading, setLoading] = useState(true)
  const [printOption, setPrintOption] = useState('original')

  const normalizeBill = (bill) => {
    let paymentDetails = {}
    if (bill.payment_details) {
      try {
        const parsed = typeof bill.payment_details === 'string' ? JSON.parse(bill.payment_details) : bill.payment_details
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) paymentDetails = parsed
      } catch (err) {}
    }
    const grandTotal = bill.grandtotal ?? bill.grand_total ?? bill.totalAmt ?? bill.total_amount ?? 0
    const advance = bill.adv ?? bill.advInput ?? bill.advance_received ?? 0
    return {
      ...bill,
      id: bill.id || bill._id,
      invNo: bill.invNo || bill.bill_no || bill.billNo,
      date: bill.date || bill.bill_date || bill.billDate,
      partyName: bill.partyName || bill.party_name,
      partyGst: bill.partyGst || bill.party_gst,
      fromAddr: bill.fromAddr || bill.from_name,
      toAddr: bill.toAddr || bill.to_name,
      vehNo: bill.vehNo || bill.vehicle_no,
      subtotal: bill.subtotal ?? bill.trip_subtotal ?? 0,
      gstPer: bill.gstPer ?? bill.gst_percent ?? 0,
      gstAmt: bill.gstAmt ?? bill.gst_amount ?? 0,
      grandtotal: grandTotal,
      adv: advance,
      amountWords: bill.amountWords || bill.amount_in_words,
      advCash: bill.advCash || paymentDetails.cash || '',
      advChq: bill.advChq || paymentDetails.cheque || '',
      advUpi: bill.advUpi || paymentDetails.online || '',
      rows: (bill.rows || bill.items || []).map(row => ({
        date: row.date || row.trip_date || '',
        lr: row.lr || row.lr_no || '',
        inv: row.inv || row.invoice_no || '',
        from: row.from || row.from_name || '',
        to: row.to || row.to_name || '',
        wt: row.wt ?? row.weight_mt ?? '',
        loading: row.loading ?? row.load ?? '',
        unloading: row.unloading ?? row.unload ?? '',
        other: row.other ?? row.other_charges ?? row.oth ?? '',
        freight: row.freight ?? '',
        total: row.total ?? 0
      }))
    }
  }

  const getLocalBills = () => {
    try {
      const keys = ['btc_bills', 'bills', 'localBills', 'offline_bills']
      for (const k of keys) {
        const val = localStorage.getItem(k)
        if (val) {
          const parsed = JSON.parse(val)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        }
      }
      if (id) {
        const direct = localStorage.getItem(id) || localStorage.getItem(`bill_${id}`)
        if (direct) return [JSON.parse(direct)]
      }
    } catch (e) {}
    return []
  }

  useEffect(() => {
    let active = true
    const fetchBills = async () => {
      try {
        if (id && String(id).startsWith('local_')) {
          const localData = getLocalBills()
          let found = localData.find(b => String(b.id || b._id) === String(id))
          if (!found && localData.length > 0) found = localData[0]
          if (found) {
            if (active) {
              setSelectedBill(normalizeBill(found))
              setBills(localData.map(normalizeBill))
              setLoading(false)
            }
            return
          }
        }
        const res = await api.get('/bills')
        const data = res.data?.data || res.data?.bills || res.data || []
        const rows = Array.isArray(data) ? data.map(normalizeBill) : []
        const localRows = getLocalBills().map(normalizeBill)
        const allRows = [...rows, ...localRows]
        if (!active) return
        setBills(allRows)
        if (id) {
          const selected = allRows.find(bill => String(bill.id) === String(id))
          if (selected) setSelectedBill(selected)
        }
      } catch (err) {
        const localRows = getLocalBills().map(normalizeBill)
        if (active) {
          setBills(localRows)
          const selected = localRows.find(b => String(b.id) === String(id))
          if (selected) setSelectedBill(selected)
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchBills()
    return () => { active = false }
  }, [id])

  const handlePrint = async (bill) => {
    setSelectedBill(normalizeBill(bill))
    setTimeout(() => window.print(), 500)
  }

  const formatINR = (num) => parseFloat(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const convertToWords = (num) => {
    if (num <= 0) return "ZERO RUPEES ONLY"
    let n = Math.floor(num)
    const units = ["","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE","TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN"]
    const tens = ["","","TWENTY","THIRTY","FORTY","FIFTY","SIXTY","SEVENTY","EIGHTY","NINETY"]
    function getWords(n) { let res = ""; if (n > 99) { res += units[Math.floor(n/100)] + " HUNDRED "; n %= 100 } if (n > 19) { res += tens[Math.floor(n/10)] + " "; n %= 10 } if (n > 0) { res += units[n] + " " } return res }
    let str = ""; if (n >= 10000000) { str += getWords(Math.floor(n/10000000)) + "CRORE "; n %= 10000000 } if (n >= 100000) { str += getWords(Math.floor(n/100000)) + "LAKH "; n %= 100000 } if (n >= 1000) { str += getWords(Math.floor(n/1000)) + "THOUSAND "; n %= 1000 } str += getWords(n)
    return str.trim() + " RUPEES ONLY"
  }

  if (loading) return <div style={{padding: '50px', textAlign: 'center'}}>Loading bills...</div>
  if (!selectedBill) {
    return (
      <div style={{padding: '20px', maxWidth: '1200px', margin: '0 auto'}}>
        <h2>📋 Select a Bill to Print</h2>
        {bills.map((bill) => (
          <div key={bill.id} style={{border: '1px solid #ddd', padding: '10px', margin: '5px 0', display: 'flex', justifyContent: 'space-between'}}>
            <span>{bill.invNo} - {bill.partyName} - ₹{formatINR(bill.grandtotal)}</span>
            <button onClick={() => handlePrint(bill)} style={{background: '#d32f2f', color: 'white', padding: '5px 10px'}}>Print</button>
          </div>
        ))}
      </div>
    )
  }

  const bill = selectedBill
  const subtotal = parseFloat(bill.subtotal || 0)
  const gstPer = parseFloat(bill.gstPer || 0)
  const gstAmt = parseFloat(bill.gstAmt || 0)
  const grandTotal = parseFloat(bill.grandtotal || 0)
  const advance = parseFloat(bill.adv || 0)
  const balance = grandTotal - advance

  return (
    <>
      <div className="no-print" style={{textAlign: 'center', padding: '12px', background: '#111', position: 'sticky', top: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', gap: '10px'}}>
        <select value={printOption} onChange={(e) => setPrintOption(e.target.value)} style={{padding: '8px', fontWeight: 'bold'}}>
          <option value="original">ORIGINAL</option>
          <option value="duplicate">DUPLICATE</option>
          <option value="both">BOTH</option>
        </select>
        <button onClick={() => window.print()} style={{padding: '8px 12px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'}}>Print</button>
      </div>
      {(printOption === 'both' ? ['original', 'duplicate'] : [printOption]).map((copy, copyIndex, copies) => (
      <div key={copy} className="invoice-wrapper" style={{width: '210mm', minHeight: '297mm', background: 'white', margin: '20px auto', padding: '8mm', boxShadow: '0 0 30px rgba(0,0,0,0.5)', pageBreakAfter: copyIndex < copies.length - 1 ? 'always' : 'auto'}}>
        <div style={{textAlign: 'right', fontSize: '14px', fontWeight: '900', color: '#d32f2f'}}>{copy === 'duplicate' ? 'DUPLICATE COPY (OFFICE)' : 'ORIGINAL COPY (RECIPIENT)'}</div>
        <div style={{textAlign: 'center', marginBottom: '10px'}}>
          <h1 style={{margin: 0, fontSize: '28px', color: '#d32f2f', fontWeight: '900'}}>BHARAT TRANSPORT COMPANY</h1>
          <p>Ward No. 17, Purana Falsa, Pilani Road, Rajgarh, Churu, Rajasthan - 331023</p>
          <div style={{fontSize: '12px', fontWeight: 'bold', borderBottom: '3px solid #000', paddingBottom: '8px'}}>Mobile: +91 9680264231, 6375717265 | Email: btcpune01@gmail.com</div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '2.1fr 0.9fr', gap: '10px', marginBottom: '10px'}}>
          <div>
            <div style={{border: '2px solid #0d1b3e', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px'}}>
              <div style={{background: '#0d1b3e', color: 'white', padding: '4px 10px', fontSize: '10px', fontWeight: 'bold'}}>BILL TO (PARTY DETAILS)</div>
              <div style={{padding: '6px'}}><div style={{fontSize: '14px', fontWeight: '700'}}>{bill.partyName}</div><div style={{fontSize: '12px'}}>GST No: {bill.partyGst || 'N/A'}</div></div>
            </div>
            <div style={{border: '2px solid #555', borderRadius: '6px', overflow: 'hidden'}}>
              <div style={{background: '#555', color: 'white', padding: '4px 10px', fontSize: '10px', fontWeight: 'bold'}}>SHIPMENT</div>
              <div style={{padding: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                <div><div style={{fontSize: '9px', fontWeight: '900', color: '#d32f2f'}}>FROM:</div><div style={{fontSize: '12px'}}>{bill.fromAddr || 'N/A'}</div></div>
                <div><div style={{fontSize: '9px', fontWeight: '900', color: '#d32f2f'}}>TO:</div><div style={{fontSize: '12px'}}>{bill.toAddr || 'N/A'}</div></div>
              </div>
            </div>
          </div>
          <div style={{border: '2.5px solid #0d1b3e', background: '#f1f4f9', borderRadius: '6px', padding: '8px'}}>
            <div>Invoice No: <b style={{color: '#d32f2f'}}>{bill.invNo}</b></div>
            <div>Date: <b>{formatDate(bill.date)}</b></div>
            <div>Vehicle: <b>{bill.vehNo || 'N/A'}</b></div>
          </div>
        </div>
        <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '10px'}}>
          <thead><tr>{['Date','LR','Inv','From','To','Wt','Loading','Unloading','Other','Freight','Total'].map(h => <th key={h} style={{background: '#0d1b3e', color: 'white', padding: '6px 2px', fontSize: '9px', border: '1px solid white'}}>{h}</th>)}</tr></thead>
          <tbody>{bill.rows && bill.rows.map((row, idx) => (
            <tr key={idx}><td style={{border: '1px solid #ccc', padding: '3px', fontSize: '10px', textAlign: 'center'}}>{formatDate(row.date)}</td><td style={{border: '1px solid #ccc', padding: '3px', fontSize: '10px', textAlign: 'center'}}>{row.lr}</td><td style={{border: '1px solid #ccc', padding: '3px', fontSize: '10px', textAlign: 'center'}}>{row.inv}</td><td style={{border: '1px solid #ccc', padding: '3px', fontSize: '10px', textAlign: 'center'}}>{row.from}</td><td style={{border: '1px solid #ccc', padding: '3px', fontSize: '10px', textAlign: 'center'}}>{row.to}</td><td style={{border: '1px solid #ccc', padding: '3px', fontSize: '10px', textAlign: 'center'}}>{row.wt}</td><td style={{border: '1px solid #ccc', padding: '3px', fontSize: '10px', textAlign: 'center'}}>{row.loading}</td><td style={{border: '1px solid #ccc', padding: '3px', fontSize: '10px', textAlign: 'center'}}>{row.unloading}</td><td style={{border: '1px solid #ccc', padding: '3px', fontSize: '10px', textAlign: 'center'}}>{row.other}</td><td style={{border: '1px solid #ccc', padding: '3px', fontSize: '10px', textAlign: 'center'}}>{row.freight}</td><td style={{border: '1px solid #ccc', padding: '3px', fontSize: '10px', textAlign: 'center'}}>{row.total}</td></tr>
          ))}</tbody>
        </table>
        <div>Grand Total: ₹{formatINR(grandTotal)} | Advance: ₹{formatINR(advance)} | Balance: ₹{formatINR(balance)}</div>
        <div>Amount in Words: {bill.amountWords || convertToWords(balance)}</div>
      </div>
      ))}
    </>
  )
}
export default BillPrint
