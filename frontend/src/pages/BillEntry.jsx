import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import toast from 'react-hot-toast'
import { getNextSerialNumber, updateBillSerial } from '../utils/billSerial'
import { formatDate, formatDateForInput } from '../utils/dateFormatter'
import { getLocalDocumentNumber, isDatabaseUnavailable, saveLocalDraft } from '../utils/offlineDrafts'

export default function BillEntry({ branchMode = false }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyList, setHistoryList] = useState([])
  const [selectedInvoices, setSelectedInvoices] = useState([])
  const [lrSearch, setLrSearch] = useState('')
  const [biltyLoading, setBiltyLoading] = useState(false)
  const [addedBilts, setAddedBilts] = useState([])

  const [billData, setBillData] = useState({
    invNo: 'Loading...',
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
    phone: "+91 9680264231, 6375717265",
    email: "btcpune01@gmail.com",
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
      // Force update the invNo with the new BTC-XXXX serial
      setBillData(prev => ({ ...prev, invNo: nextSerial }))
    } catch (error) {
      console.warn('Unable to query the next bill number; using a local fallback:', error)
      const fallbackSerial = getLocalDocumentNumber('bill', 'BTC-')
      setBillData(prev => ({ ...prev, invNo: fallbackSerial }))
      toast('Database unavailable. A local bill number was generated.', { icon: '⚠️' })
    }
  }

  const mapBillToForm = (bill) => {
    let paymentDetails = {}
    if (bill.payment_details) {
      try {
        const parsedDetails = typeof bill.payment_details === 'string' ? JSON.parse(bill.payment_details) : bill.payment_details
        if (parsedDetails && typeof parsedDetails === 'object' && !Array.isArray(parsedDetails)) {
          paymentDetails = parsedDetails
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
      const res = await api.get(`/bills/${billId}`)
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
      const res = await api.get('/bills')
      setHistoryList((res.data.data || []).map(bill => ({ id: bill.id, ...mapBillToForm(bill), date: bill.bill_date })))
    } catch (e) {
      try { setHistoryList(JSON.parse(localStorage.getItem('btc_history') || '[]').map(mapBillToForm)) }
      catch (parseError) { setHistoryList([]) }
    }
  }

  const handleAddBilty = async (event) => {
    event.preventDefault()
    const lrNo = lrSearch.trim()
    if (!lrNo) { alert('Enter a Bilty / LR Number first.'); return }

    setBiltyLoading(true)
    try {
      const response = await api.get('/consignments', { params: { search: lrNo } })
      const matches = response.data?.data || []
      const bilty = matches.find(item => item.lr_no?.toLowerCase() === lrNo.toLowerCase()) || (matches.length === 1 ? matches[0] : null)
      if (!bilty) {
        alert(matches.length ? 'Multiple Bilty records match. Enter the complete LR Number.' : 'Bilty not found.')
        return
      }
      if (billData.rows.some(row => row.lr?.toLowerCase() === bilty.lr_no?.toLowerCase())) {
        alert('This Bilty is already added to the bill.')
        return
      }

      const weight = Number(bilty.actual_weight) > 0 ? bilty.actual_weight : (bilty.charged_weight || bilty.actual_weight || '')
      const row = {
        date: bilty.lr_date || '', lr: bilty.lr_no || '', inv: bilty.invoice_no || '',
        from: bilty.from_name || '', to: bilty.to_name || '', packages: bilty.packages || bilty.no_of_packages || '',
        wt: weight, load: '', unload: '', oth: '', freight: bilty.freight || '', total: '0.00'
      }
      
      setBillData(prev => {
        const rows = prev.rows.length === 1 && !prev.rows[0].lr && !prev.rows[0].from && !prev.rows[0].to ? [row] : [...prev.rows, row]
        const next = {
          ...prev,
          partyName: prev.partyName || bilty.consignor_name || '',
          partyGst: prev.partyGst || bilty.consignor_gst || '',
          fromAddr: prev.fromAddr || [bilty.consignor_name, bilty.consignor_address].filter(Boolean).join('\n'),
          toAddr: prev.toAddr || [bilty.consignee_name, bilty.consignee_gst ? `GST: ${bilty.consignee_gst}` : '', bilty.consignee_address].filter(Boolean).join('\n'),
          vehNo: prev.vehNo || bilty.lorry_no || '-',
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
      return { ...prev, rows, ...calculate({ ...prev, rows }) }
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
      const rows = prev.rows.length > 1 ? prev.rows.filter((row, rowIndex) => rowIndex !== index) : [{ date: '', lr: '', inv: '', from: '', to: '', packages: '', wt: '', load: '', unload: '', oth: '', freight: '', total: '0.00' }]
      const next = { ...prev, rows }
      return { ...next, ...calculate(next) }
    })
    const lrNo = billData.rows[index]?.lr
    if (lrNo) setAddedBilts(prev => prev.filter(bilty => bilty.lr_no !== lrNo))
  }

  const calculate = (source = billData) => {
    let sub = 0
    const rows = source.rows.map(row => {
      const rowTotal = (parseFloat(row.load) || 0) + (parseFloat(row.unload) || 0) + (parseFloat(row.oth) || 0) + (parseFloat(row.freight) || 0)
      sub += rowTotal
      return { ...row, total: rowTotal.toFixed(2) }
    })
    const gstA = (sub * parseFloat(source.gstPer || 0)) / 100
    const grand = sub + gstA
    const bal = grand - (parseFloat(source.advInput) || 0)

    return { rows, subtotal: sub, gstAmt: gstA, grandtotal: grand, balance: bal, amountWords: convertToWords(bal) }
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
        ...(branchMode ? { branch_code: JSON.parse(localStorage.getItem('branch_session') || 'null')?.branch?.branch_code } : {}),
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
          lr_no: row.lr, invoice_no: row.inv, from_name: row.from, to_name: row.to, packages: row.packages,
          weight_mt: row.wt, freight: row.freight, loading: row.load, unloading: row.unload, other_charges: row.oth, trip_date: row.date || null, total: row.total
        }))
      }
      
      const response = id ? await api.put(`/bills/${id}`, payload) : await api.post('/bills', payload)
      
      if (response.data?.local) {
        const localBill = { ...payload, bill_no: payload.bill_no, id: `local_${Date.now()}`, bill_date: payload.bill_date, party_name: payload.party_name, grand_total: payload.grand_total, net_balance: payload.balance_due }
        saveLocalDraft('bill', localBill)
        updateBillSerial(localBill.bill_no) // ✅ Serial update
        const localHistory = JSON.parse(localStorage.getItem('btc_history') || '[]')
        localStorage.setItem('btc_history', JSON.stringify([localBill, ...localHistory.filter(bill => bill.bill_no !== localBill.bill_no)]))
        toast('Saved locally, will sync when server is online', { icon: '💾', duration: 7000 })
        return
      }
      
      const savedBill = response.data
      updateBillSerial(savedBill.bill_no || billData.invNo) // ✅ Serial update
      
      const localHistory = JSON.parse(localStorage.getItem('btc_history') || '[]')
      localStorage.setItem('btc_history', JSON.stringify([savedBill, ...localHistory.filter(bill => bill.id !== savedBill.id)]))
      
      await fetchHistory()
      toast.success(id ? 'Bill updated successfully.' : 'Bill saved successfully.')
      navigate(`/bills/${savedBill.id}/print`)
    } catch (err) {
      if (isDatabaseUnavailable(err)) {
        const localBill = { ...billData, bill_no: billData.invNo, id: `local_${Date.now()}`, bill_date: billData.billDate, party_name: billData.partyName, grand_total: calculate(billData).grandtotal, net_balance: calculate(billData).balance }
        saveLocalDraft('bill', localBill)
        updateBillSerial(localBill.bill_no) // ✅ Serial update
        const localHistory = JSON.parse(localStorage.getItem('btc_history') || '[]')
        localStorage.setItem('btc_history', JSON.stringify([localBill, ...localHistory.filter(bill => bill.bill_no !== localBill.bill_no)]))
        toast('Saved locally, will sync when server is online', { icon: '💾', duration: 7000 })
      } else {
        toast.error(err.response?.data?.error || err.message || 'Failed to save bill')
      }
    } finally {
      setLoading(false)
    }
  }

  const newBill = () => {
    if (window.confirm("Generate New Bill?")) {
      if (id) { navigate('/bill/new'); return }
      setBillData({
        invNo: 'Loading...', billDate: formatDateForInput(new Date()), partyName: '', partyGst: '', fromAddr: '', toAddr: '', vehNo: '',
        advInput: 0, advCash: '', advChq: '', advUpi: '', gstPer: 0, remarks: '',
        rows: [{ date: '', lr: '', inv: '', from: '', to: '', wt: '', load: '', unload: '', oth: '', freight: '', total: '0.00' }]
      })
      setLrSearch('')
      setAddedBilts([])
      fetchNextBillNo() // This will fetch and set the correct BTC-XXXX number
    }
  }

  const validateAndPrint = () => {
    if (!billData.partyName) { alert("Party Name zaroori hai!"); return }
    window.print()
  }

  // (Excel, WhatsApp, Email, PDF functions remain exactly as you had them - omitted here for brevity, but keep them in your file)
  const formatINR = (num) => parseFloat(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    // ... (Your entire JSX return statement remains exactly as you provided it, no changes needed to UI)
    <div className="min-h-screen w-full bg-[#eef2f7]">
       {/* Paste your entire JSX return block here exactly as you had it */}
       <h1 className="text-center p-10">UI Code is unchanged. Keep your existing JSX.</h1>
    </div>
  )
}
