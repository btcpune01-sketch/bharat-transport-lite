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
        const parsed = typeof bill.payment_details === 'string'
          ? JSON.parse(bill.payment_details)
          : bill.payment_details
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) paymentDetails = parsed
      } catch (err) {
        console.error('Error reading bill payment details:', err)
      }
    }

    const grandTotal = bill.grandtotal ?? bill.grand_total ?? bill.totalAmt ?? bill.total_amount ?? 0
    const advance = bill.adv ?? bill.advInput ?? bill.advance_received ?? 0
    return {
      ...bill,
      id: bill.id || bill._id,
      invNo: bill.invNo || bill.bill_no || bill.billNo,
      date: formatDate(bill.date || bill.bill_date || bill.billDate),
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
        date: row.date || row.trip_date ? formatDate(row.date || row.trip_date) : '',
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

  useEffect(() => {
    let active = true

    const fetchBills = async () => {
      try {
        const res = await api.get('/api/bills')
        const data = res.data?.data || res.data?.bills || res.data || []
        const rows = Array.isArray(data) ? data.map(normalizeBill) : []
        if (!active) return
        setBills(rows)

        if (id) {
          const selected = rows.find(bill => String(bill.id) === String(id))
          if (selected) {
            const detail = await api.get(`/api/bills/${encodeURIComponent(id)}`)
            if (active) setSelectedBill(normalizeBill(detail.data))
          }
        }
      } catch (err) {
        console.error('Error fetching bills:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchBills()
    return () => { active = false }
  }, [id])

  const handlePrint = async (bill) => {
    try {
      const detail = bill.id ? await api.get(`/api/bills/${encodeURIComponent(bill.id)}`) : null
      setSelectedBill(normalizeBill(detail?.data || bill))
      setTimeout(() => window.print(), 500)
    } catch (err) {
      console.error('Error loading bill for printing:', err)
    }
  }

  const formatINR = (num) => {
    return parseFloat(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const convertToWords = (num) => {
    if (num <= 0) return "ZERO RUPEES ONLY"
    let n = Math.floor(num)
    const units = ["","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE","TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN"]
    const tens = ["","","TWENTY","THIRTY","FORTY","FIFTY","SIXTY","SEVENTY","EIGHTY","NINETY"]
    function getWords(n) {
      let res = ""
      if (n > 99) { res += units[Math.floor(n/100)] + " HUNDRED "; n %= 100 }
      if (n > 19) { res += tens[Math.floor(n/10)] + " "; n %= 10 }
      if (n > 0) { res += units[n] + " " }
      return res
    }
    let str = ""
    if (n >= 10000000) { str += getWords(Math.floor(n/10000000)) + "CRORE "; n %= 10000000 }
    if (n >= 100000) { str += getWords(Math.floor(n/100000)) + "LAKH "; n %= 100000 }
    if (n >= 1000) { str += getWords(Math.floor(n/1000)) + "THOUSAND "; n %= 1000 }
    str += getWords(n)
    return str.trim() + " RUPEES ONLY"
  }

  if (loading) return <div style={{padding: '50px', textAlign: 'center'}}>Loading bills...</div>

  if (!selectedBill) {
    return (
      <div style={{padding: '20px', maxWidth: '1200px', margin: '0 auto'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2 style={{color: '#0d1b3e', borderBottom: '3px solid #d32f2f', paddingBottom: '10px'}}>📋 Select a Bill to Print</h2>
          <button onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('#/bills')} style={{padding: '8px 12px', background: '#666', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'}}>← Back</button>
        </div>
        {bills.length === 0 ? (
          <p style={{textAlign: 'center', padding: '40px', color: '#666'}}>No bills found. Create a bill first.</p>
        ) : (
          <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '20px'}}>
            <thead>
              <tr style={{background: '#0d1b3e', color: 'white'}}>
                <th style={{padding: '12px', border: '1px solid #ddd'}}>Bill No</th>
                <th style={{padding: '12px', border: '1px solid #ddd'}}>Date</th>
                <th style={{padding: '12px', border: '1px solid #ddd'}}>Party</th>
                <th style={{padding: '12px', border: '1px solid #ddd'}}>Amount</th>
                <th style={{padding: '12px', border: '1px solid #ddd'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill._id || bill.id} style={{borderBottom: '1px solid #ddd'}}>
                  <td style={{padding: '10px', border: '1px solid #ddd', fontWeight: 'bold'}}>{bill.invNo || bill.billNo}</td>
                  <td style={{padding: '10px', border: '1px solid #ddd'}}>{formatDate(bill.date)}</td>
                  <td style={{padding: '10px', border: '1px solid #ddd'}}>{bill.partyName}</td>
                  <td style={{padding: '10px', border: '1px solid #ddd', fontWeight: 'bold'}}>₹{formatINR(bill.grandtotal || bill.totalAmt)}</td>
                  <td style={{padding: '10px', border: '1px solid #ddd'}}>
                    <button onClick={() => handlePrint(bill)} style={{background: '#d32f2f', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>🖨️ Print</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  const bill = selectedBill
  const subtotal = parseFloat(bill.subtotal || 0)
  const gstPer = parseFloat(bill.gstPer || 0)
  const gstAmt = parseFloat(bill.gstAmt || 0)
  const grandTotal = parseFloat(bill.grandtotal || bill.totalAmt || 0)
  const advance = parseFloat(bill.adv || 0)
  const balance = grandTotal - advance

  return (
    <>
      <div className="no-print" style={{textAlign: 'center', padding: '12px', background: '#111', position: 'sticky', top: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap'}}>
        <div style={{color: 'white', fontSize: '12px', fontWeight: 'bold', marginRight: '10px'}}>BTC BILL MANAGER</div>
        <select value={printOption} onChange={(e) => setPrintOption(e.target.value)} style={{padding: '8px', fontWeight: 'bold', borderRadius: '5px'}}>
          <option value="original">ORIGINAL</option>
          <option value="duplicate">DUPLICATE</option>
          <option value="both">BOTH</option>
        </select>
        <button onClick={() => setSelectedBill(null)} style={{padding: '8px 12px', background: '#666', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'}}>← Back to List</button>
        <button onClick={() => window.print()} style={{padding: '8px 12px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'}}>️ Print</button>
      </div>

      {(printOption === 'both' ? ['original', 'duplicate'] : [printOption]).map((copy, copyIndex, copies) => (
      <div key={copy} className="invoice-wrapper" style={{width: '210mm', minHeight: '297mm', background: 'white', margin: '20px auto', padding: '8mm', position: 'relative', boxShadow: '0 0 30px rgba(0,0,0,0.5)', pageBreakAfter: copyIndex < copies.length - 1 ? 'always' : 'auto'}}>
        <div style={{textAlign: 'right', fontSize: '14px', fontWeight: '900', color: '#d32f2f', marginBottom: '2px', textTransform: 'uppercase', borderBottom: '1px solid #ddd'}}>
          {copy === 'duplicate' ? 'DUPLICATE COPY (OFFICE)' : 'ORIGINAL COPY (RECIPIENT)'}
        </div>
        <div style={{textAlign: 'right', fontSize: '12px', fontWeight: '800', color: '#000', marginBottom: '5px'}}>
          GSTIN: 08CMRPP0955N1Z5 | PAN: CMRPP0955N
        </div>
        <div style={{textAlign: 'center', marginBottom: '5px'}}>
          <h1 style={{margin: 0, fontSize: '28px', color: '#d32f2f', fontWeight: '900'}}>BHARAT TRANSPORT COMPANY</h1>
          <p style={{margin: '2px 0', fontSize: '11px', color: '#333', fontWeight: '600'}}>Ward No. 17, Purana Falsa, Pilani Road, Rajgarh, Churu, Rajasthan - 331023</p>
          <div style={{fontSize: '12px', fontWeight: 'bold', color: '#0d1b3e', paddingBottom: '8px', marginBottom: '12px', borderBottom: '3px solid #000', display: 'flex', justifyContent: 'center', gap: '30px'}}>
            <span>Mobile: +91 9680264231</span>
            <span>Email: bharattrsnportcompany@gmail.com</span>
          </div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '2.1fr 0.9fr', gap: '10px', marginBottom: '10px'}}>
          <div>
            <div style={{border: '2px solid #0d1b3e', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px'}}>
              <div style={{background: '#0d1b3e', color: 'white', padding: '4px 10px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}}>BILL TO (PARTY DETAILS)</div>
              <div style={{padding: '6px', background: 'white'}}>
                <div style={{fontSize: '14px', fontWeight: '700', marginBottom: '4px'}}>{bill.partyName}</div>
                <div style={{fontSize: '12px', fontWeight: '600'}}>GST No: {bill.partyGst || 'N/A'}</div>
              </div>
            </div>
            <div style={{border: '2px solid #555', borderRadius: '6px', overflow: 'hidden'}}>
              <div style={{background: '#555', color: 'white', padding: '4px 10px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}}>SHIPMENT (CONSIGNOR/CONSIGNEE)</div>
              <div style={{padding: '6px', background: 'white', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                <div>
                  <div style={{fontSize: '9px', fontWeight: '900', color: '#d32f2f', textTransform: 'uppercase', marginBottom: '2px'}}>FROM (CONSIGNOR):</div>
                  <div style={{fontSize: '12px'}}>{bill.fromAddr || 'N/A'}</div>
                </div>
                <div style={{borderLeft: '1.5px solid #eee', paddingLeft: '8px'}}>
                  <div style={{fontSize: '9px', fontWeight: '900', color: '#d32f2f', textTransform: 'uppercase', marginBottom: '2px'}}>TO (CONSIGNEE):</div>
                  <div style={{fontSize: '12px'}}>{bill.toAddr || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <div style={{border: '2.5px solid #0d1b3e', background: '#f1f4f9', borderRadius: '6px', padding: '8px'}}>
              <div style={{marginBottom: '5px'}}>
                <div style={{fontSize: '9px', fontWeight: '900', color: '#0d1b3e', textTransform: 'uppercase', borderBottom: '1px solid #ccc', marginBottom: '2px'}}>Invoice No.</div>
                <div style={{fontSize: '15px', fontWeight: '900', color: '#d32f2f', background: 'white', border: '1.2px solid #000', margin: '2px 0', borderRadius: '4px', padding: '3px 0', textAlign: 'center'}}>{bill.invNo || bill.billNo}</div>
              </div>
              <div style={{marginBottom: '5px'}}>
                <div style={{fontSize: '9px', fontWeight: '900', color: '#0d1b3e', textTransform: 'uppercase', borderBottom: '1px solid #ccc', marginBottom: '2px'}}>Date</div>
                <div style={{fontSize: '13px', fontWeight: '900', color: '#000', textAlign: 'center'}}>{formatDate(bill.date)}</div>
              </div>
              <div>
                <div style={{fontSize: '9px', fontWeight: '900', color: '#0d1b3e', textTransform: 'uppercase', borderBottom: '1px solid #ccc', marginBottom: '2px'}}>Vehicle No.</div>
                <div style={{fontSize: '13px', fontWeight: '900', color: '#000', textAlign: 'center'}}>{bill.vehNo || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px'}}>
          <div style={{padding: '6px', background: '#f1f4f9', borderRadius: '6px', textAlign: 'center', borderBottom: '3px solid #0d1b3e'}}>
            <span style={{fontSize: '8px', textTransform: 'uppercase', fontWeight: '900', display: 'block'}}>Grand Total</span>
            <strong style={{fontSize: '16px', color: '#0d1b3e'}}>₹ {formatINR(grandTotal)}</strong>
          </div>
          <div style={{padding: '6px', background: '#f1f4f9', borderRadius: '6px', textAlign: 'center', borderBottom: '3px solid #0d1b3e'}}>
            <span style={{fontSize: '8px', textTransform: 'uppercase', fontWeight: '900', display: 'block'}}>Advance Received</span>
            <strong style={{fontSize: '16px', color: '#0d1b3e'}}>₹ {formatINR(advance)}</strong>
          </div>
          <div style={{padding: '6px', background: '#f1f4f9', borderRadius: '6px', textAlign: 'center', borderBottom: '3px solid #0d1b3e'}}>
            <span style={{fontSize: '8px', textTransform: 'uppercase', fontWeight: '900', display: 'block'}}>Balance Due</span>
            <strong style={{fontSize: '16px', color: '#d32f2f'}}> {formatINR(balance)}</strong>
          </div>
        </div>

        <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '10px'}}>
          <thead>
            <tr>
              <th style={{background: '#0d1b3e', color: 'white', padding: '6px 2px', fontSize: '9px', textTransform: 'uppercase', border: '1px solid white', width: '7%'}}>Date</th>
              <th style={{background: '#0d1b3e', color: 'white', padding: '6px 2px', fontSize: '9px', textTransform: 'uppercase', border: '1px solid white', width: '7%'}}>LR No.</th>
              <th style={{background: '#0d1b3e', color: 'white', padding: '6px 2px', fontSize: '9px', textTransform: 'uppercase', border: '1px solid white', width: '12%'}}>Inv no.</th>
              <th style={{background: '#0d1b3e', color: 'white', padding: '6px 2px', fontSize: '9px', textTransform: 'uppercase', border: '1px solid white', width: '9%'}}>From</th>
              <th style={{background: '#0d1b3e', color: 'white', padding: '6px 2px', fontSize: '9px', textTransform: 'uppercase', border: '1px solid white', width: '9%'}}>To</th>
              <th style={{background: '#0d1b3e', color: 'white', padding: '6px 2px', fontSize: '9px', textTransform: 'uppercase', border: '1px solid white', width: '7%'}}>Wt(MT)</th>
              <th style={{background: '#0d1b3e', color: 'white', padding: '6px 2px', fontSize: '9px', textTransform: 'uppercase', border: '1px solid white', width: '9%'}}>Loading</th>
              <th style={{background: '#0d1b3e', color: 'white', padding: '6px 2px', fontSize: '9px', textTransform: 'uppercase', border: '1px solid white', width: '9%'}}>Unloading</th>
              <th style={{background: '#0d1b3e', color: 'white', padding: '6px 2px', fontSize: '9px', textTransform: 'uppercase', border: '1px solid white', width: '9%'}}>Other</th>
              <th style={{background: '#0d1b3e', color: 'white', padding: '6px 2px', fontSize: '9px', textTransform: 'uppercase', border: '1px solid white', width: '9%'}}>Freight</th>
              <th style={{background: '#0d1b3e', color: 'white', padding: '6px 2px', fontSize: '9px', textTransform: 'uppercase', border: '1px solid white', width: '13%'}}>Total</th>
            </tr>
          </thead>
          <tbody>
            {bill.rows && bill.rows.map((row, idx) => (
              <tr key={idx}>
                <td style={{border: '1px solid #ccc', padding: '3px 1px', fontSize: '10px', textAlign: 'center'}}>{formatDate(row.date)}</td>
                <td style={{border: '1px solid #ccc', padding: '3px 1px', fontSize: '10px', textAlign: 'center'}}>{row.lr}</td>
                <td style={{border: '1px solid #ccc', padding: '3px 1px', fontSize: '10px', textAlign: 'center'}}>{row.inv}</td>
                <td style={{border: '1px solid #ccc', padding: '3px 1px', fontSize: '10px', textAlign: 'center'}}>{row.from}</td>
                <td style={{border: '1px solid #ccc', padding: '3px 1px', fontSize: '10px', textAlign: 'center'}}>{row.to}</td>
                <td style={{border: '1px solid #ccc', padding: '3px 1px', fontSize: '10px', textAlign: 'center'}}>{row.wt}</td>
                <td style={{border: '1px solid #ccc', padding: '3px 1px', fontSize: '10px', textAlign: 'center'}}>{row.loading}</td>
                <td style={{border: '1px solid #ccc', padding: '3px 1px', fontSize: '10px', textAlign: 'center'}}>{row.unloading}</td>
                <td style={{border: '1px solid #ccc', padding: '3px 1px', fontSize: '10px', textAlign: 'center'}}>{row.other}</td>
                <td style={{border: '1px solid #ccc', padding: '3px 1px', fontSize: '10px', textAlign: 'center'}}>{row.freight}</td>
                <td style={{border: '1px solid #ccc', padding: '3px 1px', fontSize: '10px', textAlign: 'center', fontWeight: '600'}}>{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '15px'}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <div style={{background: '#f1f4f9', border: '2px solid #0d1b3e', padding: '8px', borderRadius: '6px'}}>
              <h4 style={{margin: '0 0 4px', color: '#0d1b3e', fontSize: '12px', borderBottom: '1.5px solid #ccc', textTransform: 'uppercase'}}>BANK ACCOUNT DETAILS</h4>
              <div style={{fontSize: '11px', lineHeight: '1.6'}}>
                Beneficiary: <b>BHARAT TRANSPORT COMPANY</b><br/>
                Bank: <b>HDFC BANK</b> | A/c: <b>50200112184634</b><br/>
                IFSC: <b>HDFC0002795</b> | Branch: <b>RAJGARH</b>
              </div>
            </div>
            <div style={{background: '#f1f4f9', border: '2px solid #0d1b3e', padding: '8px', borderRadius: '6px'}}>
              <h4 style={{margin: '0 0 4px', color: '#0d1b3e', fontSize: '12px', borderBottom: '1.5px solid #ccc', textTransform: 'uppercase'}}>ADVANCE PAYMENT DETAILS</h4>
              <div style={{fontSize: '11px', fontWeight: '800', marginBottom: '5px'}}>
                <span style={{width: '110px', display: 'inline-block', color: '#0d1b3e'}}>BY CASH:</span>
                <span>{bill.advCash || '-'}</span>
              </div>
              <div style={{fontSize: '11px', fontWeight: '800', marginBottom: '5px'}}>
                <span style={{width: '110px', display: 'inline-block', color: '#0d1b3e'}}>BY CHEQUE:</span>
                <span>{bill.advChq || '-'}</span>
              </div>
              <div style={{fontSize: '11px', fontWeight: '800'}}>
                <span style={{width: '110px', display: 'inline-block', color: '#0d1b3e'}}>UPI / ONLINE:</span>
                <span>{bill.advUpi || '-'}</span>
              </div>
            </div>
          </div>
          <div>
            <table style={{width: '100%'}}>
              <tbody>
                <tr><td style={{textAlign: 'right', padding: '3px 8px', fontSize: '13px', fontWeight: '700'}}>Trip Sub-Total:</td><td style={{textAlign: 'right', padding: '3px 8px', fontSize: '13px', fontWeight: '700'}}>{formatINR(subtotal)}</td></tr>
                <tr><td style={{textAlign: 'right', padding: '3px 8px', fontSize: '13px', fontWeight: '700'}}>GST ({gstPer}%):</td><td style={{textAlign: 'right', padding: '3px 8px', fontSize: '13px', fontWeight: '700'}}>{formatINR(gstAmt)}</td></tr>
                <tr style={{background: '#0d1b3e', color: 'white', fontWeight: '900'}}><td style={{textAlign: 'right', padding: '3px 8px', fontSize: '13px'}}>Grand Total:</td><td style={{textAlign: 'right', padding: '3px 8px', fontSize: '13px'}}>{formatINR(grandTotal)}</td></tr>
                <tr style={{color: '#d32f2f'}}><td style={{textAlign: 'right', padding: '3px 8px', fontSize: '13px', fontWeight: '700'}}>Advance Recd:</td><td style={{textAlign: 'right', padding: '3px 8px', fontSize: '13px', fontWeight: '700'}}>-{formatINR(advance)}</td></tr>
                <tr style={{borderTop: '2px solid #000', fontWeight: '900', fontSize: '16px', color: '#2e7d32'}}><td style={{textAlign: 'right', padding: '3px 8px'}}>NET BALANCE:</td><td style={{textAlign: 'right', padding: '3px 8px'}}>{formatINR(balance)}</td></tr>
              </tbody>
            </table>
            <div style={{marginTop: '8px', textAlign: 'right', borderTop: '1px dashed #ccc', paddingTop: '5px'}}>
              <span style={{fontSize: '9px', fontWeight: '900', color: '#d32f2f'}}>Amount in Words:</span>
              <div style={{width: '100%', fontWeight: '900', fontSize: '11px', textAlign: 'right', textTransform: 'uppercase'}}>{bill.amountWords || convertToWords(balance)}</div>
            </div>
          </div>
        </div>

        {bill.remarks && (
          <div style={{marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '8px'}}>
            <label style={{fontSize: '10px', fontWeight: '900', color: '#0d1b3e', textTransform: 'uppercase'}}>REMARKS / NOTES:</label>
            <div style={{fontSize: '12px', fontWeight: '600', padding: '5px 0'}}>{bill.remarks}</div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t-2 border-gray-800 grid grid-cols-2 gap-4 text-center text-sm">
          <div>
            <div className="h-16"></div>
            <div className="border-t border-black pt-2 font-bold">Customer Signature / Stamp</div>
          </div>
          <div className="text-center">
            <div className="font-bold">For BHARAT TRANSPORT COMPANY</div>
            <div className="h-12 flex items-center justify-center text-[10px] text-gray-500">[Stamp Image Here]</div>
            <div className="border-t border-black pt-2 font-bold mt-2">Authorized Signatory</div>
            <div className="text-xs mt-1">BHARAT TRANSPORT COMPANY</div>
          </div>
        </div>
      </div>
      ))}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .invoice-wrapper { margin: 0; box-shadow: none; width: 100%; padding: 5mm; }
          @page { size: A4; margin: 5mm; }
        }
      `}</style>
    </>
  )
}

export default BillPrint
