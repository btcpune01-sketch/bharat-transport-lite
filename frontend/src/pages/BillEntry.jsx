import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { getNextSerialNumber } from '../utils/billSerial'
import { formatDate, formatDateForInput } from '../utils/dateFormatter'

export default function BillEntry({ branchMode = false }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyList, setHistoryList] = useState([])
  const [selectedInvoices, setSelectedInvoices] = useState([])
  const [historyDate, setHistoryDate] = useState('')
  const [printOption, setPrintOption] = useState('original')
  const backupInputRef = useRef(null)
  
  const [lrSearch, setLrSearch] = useState('')
  const [biltyLoading, setBiltyLoading] = useState(false)
  const [addedBilts, setAddedBilts] = useState([])

  const [billData, setBillData] = useState({
    invNo: '',
    billDate: formatDateForInput(new Date()),
    partyName: '',
    partyGst: '',
    fromAddr: '',
    toAddr: '',
    vehNo: '',
    advInput: 0,
    advCash: '',
    advChq: '',
    advUpi: '',
    gstPer: 0,
    remarks: '',
    rows: [{ date: '', lr: '', inv: '', from: '', to: '', wt: '', load: '', unload: '', oth: '', freight: '', total: '0.00' }]
  })

  const COMPANY = {
    name: "BHARAT TRANSPORT COMPANY",
    gst: "08CMRPP0955N1Z5",
    pan: "CMRPP0955N",
    address: "Ward No. 17, Purana Falsa, Pilani Road, Rajgarh, Churu, Rajasthan - 331023",
    phone: "+91 9680264231",
    email: "bharattrsnportcompany@gmail.com",
    bankName: "HDFC BANK",
    accountNo: "50200112184634",
    ifsc: "HDFC0002795",
    branch: "RAJGARH"
  }

  useEffect(() => {
    if (id) loadBill(id)
    else fetchNextBillNo()
    fetchHistory()
  }, [id])

  const fetchNextBillNo = async () => {
    try {
      const nextSerial = await getNextSerialNumber()
      setBillData(prev => prev.invNo ? prev : ({ ...prev, invNo: nextSerial }))
    } catch (error) {
      alert(`Unable to generate the next bill number: ${error.response?.data?.error || error.message}`)
    }
  }

  const mapBillToForm = (bill) => {
    let paymentDetails = {}
    if (bill.payment_details) {
      try {
        const parsedDetails = typeof bill.payment_details === 'string'
          ? JSON.parse(bill.payment_details)
          : bill.payment_details
        if (parsedDetails && typeof parsedDetails === 'object' && !Array.isArray(parsedDetails)) {
          paymentDetails = parsedDetails
        } else {
          throw new Error('Saved payment details are not a valid object.')
        }
      } catch (error) {
        console.error('Unable to read saved bill payment details.', error)
      }
    }
    const rows = (bill.items || bill.rows || []).map(row => ({
      date: row.trip_date ? formatDate(row.trip_date) : row.date || '',
      lr: row.lr_no || row.lr || '',
      inv: row.invoice_no || row.inv || '',
      from: row.from_name || row.from || '',
      to: row.to_name || row.to || '',
      packages: row.packages ?? '',
      wt: row.weight_mt ?? row.wt ?? '',
      load: row.loading ?? row.load ?? '',
      unload: row.unloading ?? row.unload ?? '',
      oth: row.other_charges ?? row.oth ?? '',
      freight: row.freight ?? '',
      total: row.total || '0.00'
    }))
    return {
      invNo: bill.bill_no || bill.invNo || '',
      billDate: formatDateForInput(bill.bill_date || bill.billDate || new Date()),
      partyName: bill.party_name || bill.partyName || '',
      partyGst: bill.party_gst || bill.partyGst || '',
      fromAddr: bill.from_name || bill.fromAddr || '',
      toAddr: bill.to_name || bill.toAddr || '',
      vehNo: bill.vehicle_no || bill.vehNo || '',
      advInput: bill.advance_received ?? bill.advInput ?? 0,
      advCash: paymentDetails.cash || bill.advCash || '',
      advChq: paymentDetails.cheque || bill.advChq || '',
      advUpi: paymentDetails.online || bill.advUpi || '',
      gstPer: bill.gst_percent ?? bill.gstPer ?? 0,
      subtotal: Number(bill.trip_subtotal ?? bill.subtotal) || 0,
      gstAmt: Number(bill.gst_amount ?? bill.gstAmt) || 0,
      grandtotal: Number(bill.grand_total ?? bill.grandtotal ?? bill.totalAmt) || 0,
      balance: Number(bill.net_balance ?? bill.balance_due ?? bill.balance) || 0,
      amountWords: bill.amount_in_words || bill.amountWords || '',
      remarks: bill.remarks || '',
      rows: rows.length ? rows : [{ date: '', lr: '', inv: '', from: '', to: '', wt: '', load: '', unload: '', oth: '', freight: '', total: '0.00' }]
    }
  }

  const loadBill = async (billId) => {
    setLoading(true)
    try {
      const res = await api.get(`/api/bills/${billId}`)
      setBillData(prev => ({ ...prev, ...mapBillToForm(res.data) }))
    } catch (err) {
      alert(err.response?.data?.error || 'Unable to load bill for editing.')
      navigate('/bills')
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await api.get('/api/bills')
      setHistoryList((res.data.data || []).map(bill => ({ id: bill.id, ...mapBillToForm(bill), date: bill.bill_date })))
    } catch (e) {
      try { setHistoryList(JSON.parse(localStorage.getItem('btc_history') || '[]').map(mapBillToForm)) }
      catch (parseError) { setHistoryList([]) }
    }
  }

  const handleAddBilty = async (event) => {
    event.preventDefault()
    const lrNo = lrSearch.trim()
    if (!lrNo) {
      alert('Enter a Bilty / LR Number first.')
      return
    }

    setBiltyLoading(true)
    try {
      const response = await api.get('/api/consignments', { params: { search: lrNo } })
      const matches = response.data?.data || []
      const bilty = matches.find(item => item.lr_no?.toLowerCase() === lrNo.toLowerCase())
        || (matches.length === 1 ? matches[0] : null)
      if (!bilty) {
        alert(matches.length ? 'Multiple Bilty records match. Enter the complete LR Number.' : 'Bilty not found.')
        return
      }
      if (billData.rows.some(row => row.lr?.toLowerCase() === bilty.lr_no?.toLowerCase())) {
        alert('This Bilty is already added to the bill.')
        return
      }

      const actualWeight = Number(bilty.actual_weight)
      const weight = actualWeight > 0 ? bilty.actual_weight : (bilty.charged_weight || bilty.actual_weight || '')
      const vehicleNo = bilty.lorry_no || '-'
      const row = {
        date: bilty.lr_date || '',
        lr: bilty.lr_no || '',
        inv: bilty.invoice_no || '',
        from: bilty.from_name || '',
        to: bilty.to_name || '',
        packages: bilty.packages || bilty.no_of_packages || '',
        wt: weight,
        load: '',
        unload: '',
        oth: '',
        freight: bilty.freight || '',
        total: '0.00'
      }
      const billVehicleNumbers = [...new Set([
        ...addedBilts.map(item => item.lorry_no).filter(Boolean),
        bilty.lorry_no
      ].filter(Boolean))]
      setBillData(prev => {
        const rows = prev.rows.length === 1 && !prev.rows[0].lr && !prev.rows[0].from && !prev.rows[0].to
          ? [row]
          : [...prev.rows, row]
        const next = {
          ...prev,
          partyName: prev.partyName || bilty.consignor_name || '',
          partyGst: prev.partyGst || bilty.consignor_gst || '',
          fromAddr: prev.fromAddr || [bilty.consignor_name, bilty.consignor_address].filter(Boolean).join('\n'),
          toAddr: prev.toAddr || [
            bilty.consignee_name,
            bilty.consignee_gst ? `GST: ${bilty.consignee_gst}` : '',
            bilty.consignee_address
          ].filter(Boolean).join('\n'),
          vehNo: addedBilts.length ? billVehicleNumbers.join(', ') || '-' : vehicleNo,
          rows
        }
        return { ...next, ...calculate(next) }
      })
      setAddedBilts(prev => [...prev, bilty])
      setLrSearch('')
    } catch (error) {
      alert(`Unable to find Bilty: ${error.response?.data?.error || error.message}`)
    } finally {
      setBiltyLoading(false)
    }
  }

  const updateRow = (index, field, value) => {
    setBillData(prev => {
      const rows = prev.rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row)
      const next = { ...prev, rows }
      return { ...next, ...calculate(next) }
    })
  }

  const addRow = () => {
    setBillData(prev => ({
      ...prev,
      rows: [...prev.rows, { date: '', lr: '', inv: '', from: '', to: '', packages: '', wt: '', load: '', unload: '', oth: '', freight: '', total: '0.00' }]
    }))
  }

  const removeRow = (index) => {
    setBillData(prev => {
      const rows = prev.rows.length > 1
        ? prev.rows.filter((row, rowIndex) => rowIndex !== index)
        : [{ date: '', lr: '', inv: '', from: '', to: '', packages: '', wt: '', load: '', unload: '', oth: '', freight: '', total: '0.00' }]
      const next = { ...prev, rows }
      return { ...next, ...calculate(next) }
    })
    const lrNo = billData.rows[index]?.lr
    if (lrNo) setAddedBilts(prev => prev.filter(bilty => bilty.lr_no !== lrNo))
  }

  const calculate = (source = billData) => {
    let sub = 0
    const rows = source.rows.map(row => {
      const load = parseFloat(row.load) || 0
      const unload = parseFloat(row.unload) || 0
      const oth = parseFloat(row.oth) || 0
      const freight = parseFloat(row.freight) || 0
      const rowTotal = load + unload + oth + freight
      sub += rowTotal
      return { ...row, total: rowTotal.toFixed(2) }
    })

    const gstA = (sub * parseFloat(source.gstPer || 0)) / 100
    const grand = sub + gstA
    const adv = parseFloat(source.advInput) || 0
    const bal = grand - adv

    return {
      rows,
      subtotal: sub,
      gstAmt: gstA,
      grandtotal: grand,
      balance: bal,
      amountWords: convertToWords(bal)
    }
  }

  const updateBillField = (field, value) => {
    setBillData(prev => {
      const next = { ...prev, [field]: value }
      return { ...next, ...calculate(next) }
    })
  }

  const convertToWords = (num) => {
    if (num <= 0) return "ZERO RUPEES ONLY"
    let n = Math.floor(num)
    const units = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"]
    const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"]
    
    function getWords(n) {
      let res = ""
      if (n > 99) { res += units[Math.floor(n / 100)] + " HUNDRED "; n %= 100 }
      if (n > 19) { res += tens[Math.floor(n / 10)] + " "; n %= 10 }
      if (n > 0) { res += units[n] + " " }
      return res
    }
    let str = ""
    if (n >= 10000000) { str += getWords(Math.floor(n / 10000000)) + "CRORE "; n %= 10000000 }
    if (n >= 100000) { str += getWords(Math.floor(n / 100000)) + "LAKH "; n %= 100000 }
    if (n >= 1000) { str += getWords(Math.floor(n / 1000)) + "THOUSAND "; n %= 1000 }
    str += getWords(n)
    return str.trim() + " RUPEES ONLY"
  }

  const saveInvoice = async () => {
    if (!billData.partyName) { alert("Party Name zaroori hai!"); return }
    setLoading(true)
    try {
      const calculated = calculate(billData)
      const payload = {
        ...(branchMode ? {
          branch_code: JSON.parse(localStorage.getItem('branch_session') || 'null')?.branch?.branch_code
        } : {}),
        bill_no: billData.invNo,
        bill_date: billData.billDate,
        party_name: billData.partyName,
        party_gst: billData.partyGst,
        party_address: [billData.fromAddr, billData.toAddr].filter(Boolean).join(' | '),
        from_name: billData.fromAddr,
        to_name: billData.toAddr,
        vehicle_no: billData.vehNo,
        advance_received: Number(billData.advInput) || 0,
        trip_subtotal: calculated.subtotal,
        gst_percent: Number(billData.gstPer) || 0,
        gst_amount: calculated.gstAmt,
        grand_total: calculated.grandtotal,
        balance_due: calculated.balance,
        net_balance: calculated.balance,
        amount_in_words: calculated.amountWords,
        payment_details: JSON.stringify({ cash: billData.advCash, cheque: billData.advChq, online: billData.advUpi }),
        remarks: billData.remarks,
        items: calculated.rows.map(row => ({
          lr_no: row.lr,
          invoice_no: row.inv,
          from_name: row.from,
          to_name: row.to,
          packages: row.packages,
          weight_mt: row.wt,
          freight: row.freight,
          loading: row.load,
          unloading: row.unload,
          other_charges: row.oth,
          trip_date: row.date || null,
          total: row.total
        }))
      }
      const response = id
        ? await api.put(`/api/bills/${id}`, payload)
        : await api.post('/api/bills', payload)
      const savedBill = response.data
      const localHistory = JSON.parse(localStorage.getItem('btc_history') || '[]')
      const nextHistory = [savedBill, ...localHistory.filter(bill => bill.id !== savedBill.id)]
      localStorage.setItem('btc_history', JSON.stringify(nextHistory))
      await fetchHistory()
      alert(id ? 'Bill updated successfully.' : 'Bill saved successfully.')
      navigate(`/bills/${savedBill.id}/print`)
    } catch (err) {
      alert("Save failed: " + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  const newBill = () => {
    if (window.confirm("Generate New Bill?")) {
      if (id) {
        navigate('/bill/new')
        return
      }
      setBillData({
        invNo: '',
        billDate: formatDateForInput(new Date()),
        partyName: '', partyGst: '', fromAddr: '', toAddr: '', vehNo: '', subtotal: 0,
        gstAmt: 0, grandtotal: 0, balance: 0, amountWords: '',
        advInput: 0, advCash: '', advChq: '', advUpi: '', gstPer: 0, remarks: '',
        rows: [{ date: '', lr: '', inv: '', from: '', to: '', wt: '', load: '', unload: '', oth: '', freight: '', total: '0.00' }]
      })
      setLrSearch('')
      fetchNextBillNo()
      setAddedBilts([])
    }
  }

  const validateAndPrint = () => {
    if (!billData.partyName) { alert("Party Name zaroori hai!"); return }
    window.print()
  }

  // 📊 EXCEL EXPORT
  const exportExcel = () => {
    const selectedData = historyList.filter(inv => selectedInvoices.includes(inv.id))
    if (selectedData.length === 0) { alert("Pehle select karo!"); return }
    
    let csv = "Invoice No,Date,Party Name,GST Number,Gadi Number,From,To,Total Trips,SubTotal,GST %,GST Amount,Grand Total,Advance,Balance,Remarks\n"
    selectedData.forEach(inv => {
      csv += `"${inv.invNo}","${formatDate(inv.billDate || inv.date)}","${inv.partyName}","${inv.partyGst || 'N/A'}","${inv.vehNo || 'N/A'}","${(inv.fromAddr || '').replace(/"/g, '""')}","${(inv.toAddr || '').replace(/"/g, '""')}","${(inv.rows || []).length}","${inv.subtotal || ''}","${inv.gstPer || 0}","${inv.gstAmt || ''}","${inv.grandtotal || inv.totalAmt}","${inv.advInput || 0}","${inv.balance || ''}","${(inv.remarks || '').replace(/"/g, '""')}"\n`
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `BTC_CA_Excel_GST_Gadi_${formatDateForInput(new Date())}.csv`
    a.click()
  }

  // 📱 WHATSAPP SHARE
  const shareToCA = () => {
    const selectedData = historyList.filter(inv => selectedInvoices.includes(inv.id))
    if (selectedData.length === 0) { alert("Pehle select karo!"); return }
    
    let text = `*BHARAT TRANSPORT COMPANY - BILLS FOR CA*\n*Date: ${formatDate(new Date())}*\n*Total Bills: ${selectedData.length}*\n\n`
    let total = 0
    selectedData.forEach((inv, i) => {
      let amt = parseFloat((inv.grandtotal || inv.totalAmt || '0').toString().replace(/[^0-9.]/g, '')) || 0
      total += amt
      text += `${i + 1}. *Party:* ${inv.partyName}\n *GST No:* ${inv.partyGst || 'N/A'}\n *Gadi No:* ${inv.vehNo || 'N/A'}\n *Inv:* ${inv.invNo} | *Date:* ${formatDate(inv.billDate || inv.date)}\n *Amount:* ₹${amt.toLocaleString('en-IN')}\n\n`
    })
    text += `*GRAND TOTAL: Rs. ${total.toLocaleString('en-IN')}*`
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const emailToCA = () => {
    const selectedData = historyList.filter(inv => selectedInvoices.includes(inv.id))
    if (selectedData.length === 0) { alert("Pehle select karo!"); return }
    const subject = `Bharat Transport Company bills for CA - ${formatDate(new Date())}`
    const body = selectedData.map((inv, index) =>
      `${index + 1}. ${inv.invNo} | ${inv.partyName} | GST: ${inv.partyGst || 'N/A'} | Date: ${formatDate(inv.billDate || inv.date)} | Total: ₹${inv.grandtotal || 0} | Balance: ₹${inv.balance || 0}`
    ).join('\n')
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  // 📄 PDF GENERATE
  const generateCAPDF = () => {
    const selectedData = historyList.filter(inv => selectedInvoices.includes(inv.id))
    if (selectedData.length === 0) { alert("Pehle select karo!"); return }
    
    const doc = new jsPDF('p', 'mm', 'a4')
    selectedData.forEach((inv, idx) => {
      if (idx > 0) doc.addPage()
      doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(211, 47, 47)
      doc.text(COMPANY.name, 105, 12, { align: "center" })
      doc.setFontSize(8); doc.setTextColor(0); doc.setFont("helvetica", "normal")
      doc.text(COMPANY.address, 105, 16, { align: "center" })
      doc.setFontSize(9); doc.setFont("helvetica", "bold")
      doc.text(`Mobile: ${COMPANY.phone} | Email: ${COMPANY.email}`, 105, 20, { align: "center" })
      doc.setDrawColor(0); doc.line(10, 22, 200, 22)
      
      doc.setFontSize(10); doc.text(`Invoice No: ${inv.invNo}`, 10, 28); doc.text(`Date: ${formatDate(inv.billDate || inv.date)}`, 150, 28)
      doc.text(`Vehicle No: ${inv.vehNo || 'N/A'}`, 10, 33); doc.text(`GSTIN: ${COMPANY.gst}`, 150, 33)
      doc.setFontSize(11); doc.text(`BILL TO: ${inv.partyName}`, 10, 40)
      doc.setFontSize(9); doc.text(`GST No: ${inv.partyGst || 'N/A'}`, 10, 44)
      
      const tripBody = (inv.rows || []).map(r => [r.date || '', r.lr || '', r.inv || '', r.from || '', r.to || '', r.wt || '', r.load || '0', r.unload || '0', r.oth || '0', r.freight || '0', r.total || '0'])
      doc.autoTable({ 
        startY: 55, 
        head: [['Date', 'LR No.', 'Inv no.', 'From', 'To', 'Wt(MT)', 'Loading', 'Unloading', 'Other', 'Freight', 'Total']], 
        body: tripBody, 
        theme: 'grid', 
        headStyles: { fillColor: [13, 27, 62], fontSize: 7 }, 
        styles: { fontSize: 7, halign: 'center' } 
      })
      
      let finalY = doc.lastAutoTable.finalY + 5
      doc.setFontSize(9); doc.text(`Sub-Total: ${inv.subtotal}`, 130, finalY); finalY += 5
      doc.text(`GST (${inv.gstPer || 0}%): ${inv.gstAmt}`, 130, finalY); finalY += 5
      doc.setFont("helvetica", "bold"); doc.text(`Grand Total: ${inv.grandtotal}`, 130, finalY); finalY += 5
      doc.setFont("helvetica", "normal"); doc.setTextColor(211, 47, 47); doc.text(`Advance: -${inv.advInput || 0}`, 130, finalY); finalY += 5
      doc.setTextColor(46, 125, 50); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(`NET BALANCE: ${inv.balance}`, 130, finalY)
    })
    doc.save(`BTC_Original_Bills_${formatDateForInput(new Date())}.pdf`)
  }

  const formatINR = (num) => parseFloat(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="min-h-screen bg-gray-200">
      {/* CSS STYLES (Exact match to your HTML) */}
      <style>{`
        :root { --primary: #0d1b3e; --accent: #d32f2f; --bg-light: #f1f4f9; --success: #2e7d32; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #555; margin: 0; padding: 0; }
        .invoice-wrapper { width: 210mm; min-height: 297mm; background: #fff; margin: 20px auto; padding: 8mm; position: relative; box-shadow: 0 0 30px rgba(0,0,0,0.5); page-break-after: always; }
        .copy-tag { text-align: right; font-size: 14px; font-weight: 900; color: var(--accent); margin-bottom: 2px; text-transform: uppercase; border-bottom: 1px solid #ddd; }
        .top-id-header { text-align: right; font-size: 12px; font-weight: 800; color: #000; margin-bottom: 5px; }
        .header { text-align: center; margin-bottom: 5px; }
        .header h1 { margin: 0; font-size: 28px; color: var(--accent); font-weight: 900; }
        .header p { margin: 2px 0; font-size: 11px; color: #333; font-weight: 600; }
        .contact-row { font-size: 12px; font-weight: bold; color: var(--primary); padding-bottom: 8px; margin-bottom: 12px; border-bottom: 3px solid #000; display: flex; justify-content: center; gap: 30px; }
        .info-grid { display: grid; grid-template-columns: 2.1fr 0.9fr; gap: 10px; margin-bottom: 10px; }
        .party-main-box { border: 2px solid var(--primary); border-radius: 6px; overflow: hidden; margin-bottom: 8px;}
        .box-title { background: var(--primary); color: white; padding: 4px 10px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .box-content { padding: 6px; background: #fff; }
        .info-grid textarea, .info-grid input.party-input { width: 100%; border: none; background: transparent; font-size: 12px; font-weight: 700; resize: none; outline: none; }
        .required-field { border-bottom: 1px dashed #ccc!important; margin-bottom: 5px; }
        .meta-side { display: flex; flex-direction: column; }
        .bill-box { border: 2.5px solid var(--primary); background: var(--bg-light); border-radius: 6px; padding: 8px; }
        .meta-field label { font-size: 9px; font-weight: 900; color: var(--primary); text-transform: uppercase; display: block; border-bottom: 1px solid #ccc; margin-bottom: 2px; }
        .inv-no-big { font-size: 15px!important; font-weight: 900!important; color: var(--accent)!important; background: #fff!important; border: 1.2px solid #000!important; margin: 2px 0; border-radius: 4px; padding: 3px 0!important; width: 100%; text-align: center; }
        .meta-field input { width: 100%; border: none; background: transparent; text-align: center; font-size: 13px; font-weight: 900; color: #000; outline: none; }
        .ship-label { font-size: 9px; font-weight: 900; color: var(--accent); text-transform: uppercase; margin-bottom: 2px; display: block; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 10px; }
        table th { background: var(--primary)!important; color: #fff; padding: 6px 2px; font-size: 9px; text-transform: uppercase; border: 1px solid #fff; }
        table td { border: 1px solid #ccc; padding: 3px 1px; font-size: 10px; text-align: center; }
        table input { width: 100%; border: none; text-align: center; background: transparent; outline: none; font-weight: 600; font-size: 10px; }
        .col-date { width: 7%; }.col-lr { width: 7%; }.col-inv { width: 10%; }.col-from { width: 9%; }.col-to { width: 9%; }.col-packages { width: 6%; }.col-wt { width: 7%; }.col-load { width: 8%; }.col-unload { width: 8%; }.col-oth { width: 8%; }.col-freight { width: 8%; }.col-total { width: 11%; }
        .row-total { background: #fffde7!important; color: var(--primary); font-weight: 900!important; }
        .dashboard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px; }
        .card { padding: 6px; background: var(--bg-light); border-radius: 6px; text-align: center; border-bottom: 3px solid var(--primary); }
        .card span { font-size: 8px; text-transform: uppercase; font-weight: 900; display: block; }
        .card strong { font-size: 16px; color: var(--primary); }
        .card input { border: none; background: transparent; text-align: center; font-size: 16px; font-weight: 900; color: var(--accent); width: 80%; outline: none; }
        .bottom-layout { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 15px; }
        .left-info-column { display: flex; flex-direction: column; gap: 10px; }
        .bank-details-box, .payment-modes-box { background: var(--bg-light); border: 2px solid var(--primary); padding: 8px; border-radius: 6px; }
        .bank-details-box h4, .payment-modes-box h4 { margin: 0 0 4px; color: var(--primary); font-size: 12px; border-bottom: 1.5px solid #ccc; text-transform: uppercase; }
        .payment-row { display: flex; align-items: center; margin-bottom: 5px; font-size: 11px; font-weight: 800; }
        .payment-row label { width: 110px; color: var(--primary); }
        .payment-row input { flex: 1; border: none; border-bottom: 1px dashed #999; background: transparent; outline: none; font-weight: 900; font-size: 11px; padding: 2px; }
        .calc-table td { text-align: right; padding: 3px 8px; font-size: 13px; border: none; font-weight: 700; }
        .net-payable-row { background: var(--primary)!important; color: #fff; font-weight: 900; }
        .words-right-container { margin-top: 8px; text-align: right; border-top: 1px dashed #ccc; padding-top: 5px; }
        .words-label { font-size: 9px; font-weight: 900; color: var(--accent); }
        .words-input-field { width: 100%; border: none; font-weight: 900; font-size: 11px; text-align: right; text-transform: uppercase; outline: none; background: transparent; }
        .remarks-section { margin-top: 15px; border-top: 1px solid #eee; padding-top: 8px; }
        .remarks-section label { font-size: 10px; font-weight: 900; color: var(--primary); text-transform: uppercase; }
        .remarks-input { width: 100%; border: none; border-bottom: 1px dashed #bbb; font-size: 12px; font-weight: 600; padding: 5px 0; outline: none; background: transparent; }
        .no-print { text-align: center; padding: 12px; background: #111; position: sticky; top: 0; z-index: 1000; display: flex; justify-content: center; align-items: center; gap: 8px; flex-wrap: wrap; }
        .bilty-import-section { max-width: 1200px; margin: 18px auto; padding: 16px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
        .bilty-table-wrap { width: 100%; overflow-x: auto; }
        .bilty-table { width: 100%; border-collapse: collapse; table-layout: auto; }
        .bilty-table th, .bilty-table td { height: auto; min-height: 36px; padding: 8px; border: 1px solid #d1d5db; text-align: left; white-space: normal; word-break: break-word; overflow-wrap: anywhere; vertical-align: top; }
        #tripTable td { height: auto; min-height: 32px; white-space: normal; word-break: break-word; overflow-wrap: anywhere; }
        #tripTable textarea { width: 100%; min-height: 2em; height: auto; resize: vertical; white-space: normal; word-break: break-word; overflow-wrap: anywhere; }
        .btn { padding: 8px 12px; border: none; border-radius: 5px; cursor: pointer; font-weight: 900; color: #fff; font-size: 11px; text-transform: uppercase; }
        #historyModal { display: none; position: fixed; z-index: 2000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); overflow: auto; }
        .modal-content { background: #fefefe; margin: 3% auto; padding: 20px; border: 1px solid #888; width: 95%; max-width: 950px; border-radius: 10px; color: #333; }
        .history-controls { display:flex; flex-wrap:wrap; gap:10px; background:#f1f4f9; padding:12px; border-radius:8px; margin-bottom:15px; align-items:center; }
        .history-controls input { padding:6px; border-radius:4px; border:1px solid #ccc; font-weight:bold; }
        .history-item { display: grid; grid-template-columns: 40px 1.2fr 1.8fr 1fr 1fr 1fr 70px; gap: 8px; padding: 10px; border-bottom: 1px solid #ddd; align-items: center; font-size:12px; }
        .history-item:hover { background: #f9f9f9; }
        .history-header { font-weight: 900; background: var(--primary); color: white; padding: 10px; border-radius: 5px; }
        .row-remove { border: none; background: #b91c1c; color: #fff; border-radius: 3px; font-size: 8px; margin-top: 2px; padding: 2px 4px; cursor: pointer; }
        @media print {
          .no-print, #historyModal, .bilty-import-section { display: none!important; }
          .row-remove { display: none!important; }
          body { background: white; } 
          .invoice-wrapper { margin: 0; box-shadow: none; width: 100%; padding: 5mm; } 
          @page { size: A4; margin: 5mm; } 
        }
      `}</style>

      <section className="bilty-import-section">
        <h2 style={{margin: '0 0 12px', color: '#0d1b3e'}}>Step 1: Bilty Se Data Lao</h2>
        <form onSubmit={handleAddBilty} style={{display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center'}}>
          <label htmlFor="bilty-search" style={{fontWeight: 'bold'}}>Add Bilty / LR Number</label>
          <input
            id="bilty-search"
            type="text"
            value={lrSearch}
            onChange={event => setLrSearch(event.target.value)}
            placeholder="Enter complete Bilty / LR Number"
            style={{padding: '9px', minWidth: '240px', border: '1px solid #9ca3af', borderRadius: '4px'}}
          />
          <button className="btn" type="submit" disabled={biltyLoading} style={{background: '#1976d2'}}>
            {biltyLoading ? 'Searching...' : 'Search / Add Bilty'}
          </button>
        </form>
        {addedBilts.length > 0 && (
          <div className="bilty-table-wrap" style={{marginTop: '14px'}}>
            <table className="bilty-table">
              <thead>
                <tr style={{background: '#0d1b3e', color: 'white'}}>
                  <th>Bilty / LR</th><th>Date</th><th>Consignor / GST</th><th>Consignee / GST</th>
                  <th>From</th><th>To</th><th>Vehicle</th><th>Packages</th><th>Weight MT</th><th>Invoice</th><th>Freight</th>
                </tr>
              </thead>
              <tbody>
                {addedBilts.map(bilty => (
                  <tr key={bilty.lr_no}>
                    <td>{bilty.lr_no}</td>
                    <td>{bilty.lr_date ? formatDate(bilty.lr_date) : '-'}</td>
                    <td>{bilty.consignor_name || '-'}{bilty.consignor_gst ? ` / ${bilty.consignor_gst}` : ''}</td>
                    <td>{bilty.consignee_name || '-'}{bilty.consignee_gst ? ` / ${bilty.consignee_gst}` : ''}</td>
                    <td>{bilty.from_name || '-'}</td><td>{bilty.to_name || '-'}</td>
                    <td>{bilty.lorry_no || '-'}</td>
                    <td>{bilty.packages || bilty.no_of_packages || '-'}</td>
                    <td>{Number(bilty.actual_weight) > 0 ? bilty.actual_weight : bilty.charged_weight || bilty.actual_weight || '-'}</td>
                    <td>{bilty.invoice_no || '-'}</td><td>{bilty.freight || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* NO PRINT CONTROLS */}
      <div className="no-print">
        <div style={{color:'white', fontSize:'12px', fontWeight:'bold', marginRight:'10px'}}>BTC MANAGER</div>
        {loading && <span style={{color:'yellow', fontWeight:'bold'}}>Loading...</span>}
        <button className="btn" style={{background:'#2e7d32'}} onClick={addRow}>+ Row</button>
        <button className="btn" style={{background:'#4caf50'}} onClick={newBill}>New Bill</button>
        <button className="btn" style={{background:'#1976d2'}} onClick={saveInvoice}>Save to List</button>
        <button className="btn" style={{background:'#f57c00'}} onClick={() => setShowHistory(true)}>History + CA</button>
        <button className="btn" style={{background:'var(--accent)'}} onClick={validateAndPrint}>Print</button>
        <button className="btn" style={{background:'#666'}} onClick={() => navigate('/bills')}>Back to List</button>
      </div>

      {/* HISTORY MODAL */}
      {showHistory && (
        <div id="historyModal" style={{display:'block'}}>
          <div className="modal-content">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
              <h2 style={{margin:0}}>HISTORY - CA REPORT</h2>
              <button className="btn" style={{background:'red'}} onClick={() => setShowHistory(false)}>Close X</button>
            </div>
            <div className="history-controls">
              <span id="selectedCount" style={{fontWeight:'900', color:'var(--accent)'}}>{selectedInvoices.length} Selected</span>
              <button className="btn" style={{background:'#2e7d32'}} onClick={generateCAPDF}>ORIGINAL BILL PDF</button>
              <button className="btn" style={{background:'#25D366'}} onClick={shareToCA}>WhatsApp to CA</button>
              <button className="btn" style={{background:'#1976d2'}} onClick={emailToCA}>Email to CA</button>
              <button className="btn" style={{background:'#ff6f00'}} onClick={exportExcel}>Excel (GST+Gadi)</button>
            </div>
            <div className="history-item history-header">
              <div><input type="checkbox" onChange={(e) => {
                if(e.target.checked) setSelectedInvoices(historyList.map(h => h.id))
                else setSelectedInvoices([])
              }} /></div>
              <div>Inv No.</div><div>Party Name</div><div>GST Number</div><div>Date</div><div>Amount</div><div>Action</div>
            </div>
            <div style={{maxHeight:'400px', overflowY:'auto'}}>
              {historyList.map(inv => (
                <div key={inv.id} className="history-item">
                  <div><input type="checkbox" checked={selectedInvoices.includes(inv.id)} onChange={(e) => {
                    if(e.target.checked) setSelectedInvoices([...selectedInvoices, inv.id])
                    else setSelectedInvoices(selectedInvoices.filter(id => id !== inv.id))
                  }} /></div>
                  <div>{inv.invNo}</div>
                  <div>{inv.partyName}</div>
                  <div>{inv.partyGst || 'N/A'}</div>
                  <div>{formatDate(inv.billDate || inv.date)}</div>
                  <div>₹{inv.grandtotal || inv.totalAmt}</div>
                  <div><button className="btn" style={{background:'#0d1b3e', padding:'4px 8px'}} onClick={() => {
                    setBillData(inv)
                    setShowHistory(false)
                  }}>Open</button></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MAIN INVOICE WRAPPER */}
      <div id="main-container">
        <div className="invoice-wrapper" id="original-page">
          <h2 className="no-print" style={{margin: '0 0 10px', color: '#0d1b3e', background: 'transparent', position: 'static', padding: 0}}>Step 2: Bill Banao — Manual Bill Create</h2>
          <div className="copy-tag">ORIGINAL COPY (RECIPIENT)</div>
          <div className="top-id-header">GSTIN: {COMPANY.gst} | PAN: {COMPANY.pan}</div>
          
          <div className="header">
            <h1>{COMPANY.name}</h1>
            <p>{COMPANY.address}</p>
            <div className="contact-row">
              <span>Mobile: {COMPANY.phone}</span>
              <span>Email: {COMPANY.email}</span>
            </div>
          </div>

          <div className="info-grid">
            <div className="meta-side">
              <div className="party-main-box">
                <div className="box-title">BILL TO (PARTY DETAILS)</div>
                <div className="box-content">
                  <input type="text" value={billData.partyName} onChange={(e) => setBillData({...billData, partyName: e.target.value})} className="party-input required-field" placeholder="M/s PARTY NAME" />
                  <input type="text" value={billData.partyGst} onChange={(e) => setBillData({...billData, partyGst: e.target.value})} className="party-input" placeholder="GST NO:" />
                </div>
              </div>
              <div className="party-main-box" style={{borderColor: '#555'}}>
                <div className="box-title" style={{background:'#555'}}>SHIPMENT (CONSIGNOR/CONSIGNEE)</div>
                <div className="box-content" style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap:'10px'}}>
                  <div>
                    <span className="ship-label">FROM (CONSIGNOR):</span>
                    <textarea value={billData.fromAddr} onChange={(e) => setBillData({...billData, fromAddr: e.target.value})} rows="2" placeholder="Full Address..."></textarea>
                  </div>
                  <div style={{borderLeft:'1.5px solid #eee', paddingLeft:'8px'}}>
                    <span className="ship-label">TO (CONSIGNEE):</span>
                    <textarea value={billData.toAddr} onChange={(e) => setBillData({...billData, toAddr: e.target.value})} rows="2" placeholder="Full Address..."></textarea>
                </div>
                </div>
              </div>
            </div>
            <div className="meta-side">
              <div className="bill-box">
                <div className="meta-field">
                  <label>Invoice No.</label>
                  <input type="text" value={billData.invNo} onChange={(e) => setBillData({...billData, invNo: e.target.value})} className="inv-no-big" />
                </div>
                <div className="meta-field">
                  <label>Date</label>
                  <input type="date" value={billData.billDate} onChange={(e) => setBillData({...billData, billDate: e.target.value})} />
                </div>
                <div className="meta-field">
                  <label>Vehicle No.</label>
                  <input type="text" value={billData.vehNo} onChange={(e) => setBillData({...billData, vehNo: e.target.value.toUpperCase()})} placeholder="RJ 18 GA XXXX" />
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard">
            <div className="card"><span>Grand Total</span><strong>₹ {formatINR(billData.grandtotal)}</strong></div>
            <div className="card"><span>Advance Received</span><strong>₹ <input type="number" value={billData.advInput} onChange={(e) => updateBillField('advInput', e.target.value)} /></strong></div>
            <div className="card"><span>Balance Due</span><strong>₹ {formatINR(billData.balance)}</strong></div>
          </div>

          <table id="tripTable">
            <thead>
              <tr>
                <th className="col-date">Date</th>
                <th className="col-lr">LR No.</th>
                <th className="col-inv">Inv no.</th>
                <th className="col-from">From</th>
                <th className="col-to">To</th>
                <th className="col-packages">Packages</th>
                <th className="col-wt">Wt(MT)</th>
                <th className="col-load">Loading</th>
                <th className="col-unload">Unloading</th>
                <th className="col-oth">Other</th>
                <th className="col-freight">Freight</th>
                <th className="col-total">Total</th>
              </tr>
            </thead>
            <tbody id="tripBody">
              {billData.rows.map((row, idx) => (
                <tr key={idx}>
                  <td><input type="text" value={row.date} onChange={(e) => updateRow(idx, 'date', e.target.value)} placeholder="DD/MM" /></td>
                  <td><input type="text" value={row.lr} onChange={(e) => updateRow(idx, 'lr', e.target.value)} /></td>
                  <td><input type="text" value={row.inv} onChange={(e) => updateRow(idx, 'inv', e.target.value)} /></td>
                  <td><textarea rows="2" value={row.from} onChange={(e) => updateRow(idx, 'from', e.target.value)} /></td>
                  <td><textarea rows="2" value={row.to} onChange={(e) => updateRow(idx, 'to', e.target.value)} /></td>
                  <td><input type="text" value={row.packages || ''} onChange={(e) => updateRow(idx, 'packages', e.target.value)} /></td>
                  <td><input type="text" value={row.wt} onChange={(e) => updateRow(idx, 'wt', e.target.value)} placeholder="0.00" /></td>
                  <td><input type="number" value={row.load} onChange={(e) => updateRow(idx, 'load', e.target.value)} /></td>
                  <td><input type="number" value={row.unload} onChange={(e) => updateRow(idx, 'unload', e.target.value)} /></td>
                  <td><input type="number" value={row.oth} onChange={(e) => updateRow(idx, 'oth', e.target.value)} /></td>
                  <td><input type="number" value={row.freight} onChange={(e) => updateRow(idx, 'freight', e.target.value)} className="row-total" /></td>
                  <td>
                    <input type="number" value={row.total} readOnly className="row-total" />
                    {(billData.rows.length > 1 || addedBilts.some(bilty => bilty.lr_no === row.lr)) && <button type="button" className="row-remove" aria-label={`Remove trip row ${idx + 1}`} onClick={() => removeRow(idx)}>Remove</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bottom-layout">
            <div className="left-info-column">
              <div className="bank-details-box">
                <h4>BANK ACCOUNT DETAILS</h4>
                Beneficiary: <b>{COMPANY.name}</b><br/>
                Bank: <b>{COMPANY.bankName}</b> | A/c: <b>{COMPANY.accountNo}</b><br/>
                IFSC: <b>{COMPANY.ifsc}</b> | Branch: <b>{COMPANY.branch}</b>
              </div>
              <div className="payment-modes-box">
                <h4>ADVANCE PAYMENT DETAILS</h4>
                <div className="payment-row"><label>BY CASH:</label><input type="text" value={billData.advCash} onChange={(e) => setBillData({...billData, advCash: e.target.value})} placeholder="Amt/Date" /></div>
                <div className="payment-row"><label>BY CHEQUE:</label><input type="text" value={billData.advChq} onChange={(e) => setBillData({...billData, advChq: e.target.value})} placeholder="Chq No/Bank" /></div>
                <div className="payment-row"><label>UPI / ONLINE:</label><input type="text" value={billData.advUpi} onChange={(e) => setBillData({...billData, advUpi: e.target.value})} placeholder="Txn ID/App" /></div>
              </div>
            </div>
            <div className="right-box">
              <table className="calc-table" style={{width:'100%'}}>
                <tbody>
                  <tr><td>Trip Sub-Total:</td><td>{formatINR(billData.subtotal)}</td></tr>
                  <tr><td>GST (<input type="number" value={billData.gstPer} onChange={(e) => updateBillField('gstPer', e.target.value)} style={{width:'30px', borderBottom:'1px solid #000', textAlign:'center'}} />%):</td><td>{formatINR(billData.gstAmt)}</td></tr>
                  <tr className="net-payable-row"><td>Grand Total:</td><td>{formatINR(billData.grandtotal)}</td></tr>
                  <tr style={{color:'var(--accent)'}}><td>Advance Recd:</td><td>-{formatINR(billData.advInput)}</td></tr>
                  <tr style={{borderTop:'2px solid #000', fontWeight:'900', fontSize:'16px', color:'#2e7d32'}}><td>NET BALANCE:</td><td>{formatINR(billData.balance)}</td></tr>
                </tbody>
              </table>
              <div className="words-right-container">
                <span className="words-label">Amount in Words:</span>
                <input type="text" value={billData.amountWords} readOnly className="words-input-field" />
              </div>
            </div>
          </div>

          <div className="remarks-section">
            <label>REMARKS / NOTES:</label>
            <input type="text" value={billData.remarks} onChange={(e) => setBillData({...billData, remarks: e.target.value})} className="remarks-input" placeholder="Enter remarks here..." />
          </div>

          {/* SIGNATURE FOOTER - DO NOT REMOVE */}
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
      </div>
    </div>
  )
}
