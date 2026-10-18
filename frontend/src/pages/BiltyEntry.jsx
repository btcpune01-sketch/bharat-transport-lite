// FINAL - All Sections Fixed + LR Editable - Print Format NOT Changed
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { biltyAPI, customerAPI } from '../api'
import toast from 'react-hot-toast'
import { formatDateForInput } from '../utils/dateFormatter'
import CreatableBranchSelect from '../components/CreatableBranchSelect'

function CustomSelect({ label, value, onChange, options, name, required }) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  const selectedLabel = options.find(o => o.value === value)?.label || (label.includes('Select') ? label : `Select ${label}`)
  return (
    <div className="relative" ref={ref}>
      <label className="block text-gray-300 text-sm font-medium mb-1">{label}{required && ' *'}</label>
      <div onClick={() => setIsOpen(!isOpen)} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white cursor-pointer flex justify-between items-center hover:bg-white/10 transition">
        <span>{selectedLabel}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-auto">
          {options.map((option) => (
            <div key={option.value} onClick={() => { onChange({ target: { name, value: option.value } }); setIsOpen(false) }} className={`px-4 py-2 cursor-pointer text-black hover:bg-blue-100 ${value === option.value ? 'bg-blue-500 text-white' : 'bg-white'}`}>{option.label}</div>
          ))}
        </div>
      )}
    </div>
  )
}

const numberToWords = (num) => {
  if (!num || num === 0) return 'Zero Only'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const convert = (n) => {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
  }
  const rupees = Math.floor(num)
  const paise = Math.round((num - rupees) * 100)
  let result = 'Rupees ' + convert(rupees)
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise'
  return result + ' Only'
}

const preferStoredMeasurement = (primary, legacy) => {
  const primaryNumber = Number(primary);
  const legacyNumber = Number(legacy);
  if (primary !== null && primary !== undefined && primary !== '' && primaryNumber !== 0) return primary;
  if (legacy !== null && legacy !== undefined && legacy !== '' && legacyNumber !== 0) return legacy;
  return primary ?? legacy ?? 0;
};

export default function BiltyEntry({ branchMode = false }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [branchCode, setBranchCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [numberLoading, setNumberLoading] = useState(true)
  const [numberError, setNumberError] = useState(false)
  const [isLrEditable, setIsLrEditable] = useState(false)
  const [lrError, setLrError] = useState('')
  const [lrChecking, setLrChecking] = useState(false)
  const lrCheckRequest = useRef(0)
  const [mrActive, setMrActive] = useState(false)
  const [customers, setCustomers] = useState([])

  const [formData, setFormData] = useState({
    lr_no: '', lr_date: formatDateForInput(new Date()), branch_code: '', from_name: '', to_code: '', to_name: '',
    delivery_type: 'Door Delivery', unloading_party_mobile: '', delivery_godown_address: '', pickup_address: '',
    consignor_name: '', consignor_address: '', consignor_gst: '', consignor_mobile: '', customer_code_consignor: '',
    consignee_name: '', consignee_address: '', consignee_gst: '', consignee_mobile: '', customer_code_consignee: '',
    invoice_no: '', invoice_date: '', po_no: '', po_date: '',
    vehicle_no: '', driver_name: '', driver_mobile: '',
    no_of_packages: 0, method_of_packing: '', package_type: '', hsn_code: '', description: '', actual_weight: 0, charged_weight: 0, rate: 0, distance: 0,
    length: 0, width: 0, height: 0, no_of_pkgs_dimension: 0, total_cft_cmt: 0,
    private_marks: '', mr_no: '', mr_date: '', mr_amount: 0, load_type: 'Part Load',
    freight: 0, aoc_amount: 0, eov_charges: 0, cover_charges: 0, material_mgmt_ch: 0,
    collection_charges: 0, door_dly_charges: 0, pass_cc_charges: 0, enroute_charges: 0,
    statistical_charges: 0, misc_charges: 0, grand_total: 0,
    eway_bill_no: '', eway_valid_upto: '',
    declared_value: 0, basis_of_booking: '', bill_to_party: '', billed_at_type: '', billed_at: '', gst_through: '', amount_in_words: '',
    third_party_name: '', third_party_gstin: '', third_party_gst: '', third_party_address: '',
    insurance_status: 'Not Insured', insurance_company: '', insurance_policy_no: '', insurance_date: '', insurance_amount: 0,
    created_by: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).username || 'Admin' : 'Admin'
  })

  useEffect(() => {
    if (!branchMode) return
    try {
      const code = JSON.parse(localStorage.getItem('branch_session') || 'null')?.branch?.branch_code
      if (!code) throw new Error('The branch code is missing from this session.')
      setBranchCode(code)
      setFormData(previous => ({ ...previous, branch_code: code }))
    } catch (error) {
      console.error('Unable to load the branch code for Bilty entry:', error)
      toast.error('Unable to load the branch assigned to this session.')
    }
  }, [branchMode])

  useEffect(() => {
    fetchCustomers()
    if (!id) {
      generateLRNo()
      return
    }
    setNumberLoading(true)
    biltyAPI.getById(id)
      .then(({ data }) => {
        if (!data || !data.id) throw new Error('The server returned invalid Bilty details')
        const { from_code: _fromCode, aoc_percent: _aocPercent, ...savedData } = data
        const billToParty = savedData.bill_to_party || savedData.billed_at_type || ''
        const total = [
          'freight', 'aoc_amount', 'eov_charges', 'cover_charges', 'material_mgmt_ch',
          'collection_charges', 'door_dly_charges', 'pass_cc_charges', 'enroute_charges',
          'statistical_charges', 'misc_charges'
        ].reduce((sum, field) => sum + (parseFloat(savedData[field]) || 0), 0)
        setFormData(previous => ({
          ...previous,
          ...savedData,
          actual_weight: preferStoredMeasurement(savedData.actual_weight, savedData.act_wt),
          charged_weight: preferStoredMeasurement(savedData.charged_weight, savedData.chg_wt),
          no_of_packages: preferStoredMeasurement(savedData.no_of_packages, savedData.package_count),
          length: preferStoredMeasurement(savedData.length, savedData.l),
          width: preferStoredMeasurement(savedData.width, savedData.w),
          height: preferStoredMeasurement(savedData.height, savedData.h),
          method_of_packing: savedData.method_of_packing || savedData.package_type || '',
          package_type: savedData.package_type || savedData.method_of_packing || '',
          total_cft_cmt: preferStoredMeasurement(savedData.total_cft_cmt, savedData.total_cft ?? savedData.cft_cmt),
          lr_date: savedData.lr_date ? formatDateForInput(savedData.lr_date) : previous.lr_date,
          invoice_date: savedData.invoice_date ? formatDateForInput(savedData.invoice_date) : '',
          po_date: savedData.po_date ? formatDateForInput(savedData.po_date) : '',
          mr_date: savedData.mr_date ? formatDateForInput(savedData.mr_date) : '',
          insurance_date: savedData.insurance_date ? formatDateForInput(savedData.insurance_date) : '',
          eway_valid_upto: savedData.eway_valid_upto ? formatDateForInput(savedData.eway_valid_upto) : '',
          bill_to_party: billToParty,
          third_party_gstin: savedData.third_party_gstin || savedData.third_party_gst || '',
          third_party_gst: savedData.third_party_gstin || savedData.third_party_gst || '',
          grand_total: total,
          amount_in_words: numberToWords(total)
        }))
        setIsLrEditable(true)
        setMrActive(Boolean(data.mr_active))
      })
      .catch(err => {
        console.error('Failed to load Bilty:', err)
        toast.error(err.response?.data?.error || 'Failed to load Bilty')
      })
      .finally(() => setNumberLoading(false))
  }, [id])

  const fetchCustomers = async () => {
    try { const res = await customerAPI.getAll(); setCustomers(res.data) } catch (err) { console.error('Failed to load customers') }
  }

  const generateLRNo = async () => {
    setNumberLoading(true); setNumberError(false)
    try {
      const response = await biltyAPI.getNextNumber()
      const nextLrNo = response.data?.lr_no || response.data?.data?.lr_no
      if (!nextLrNo) throw new Error('invalid')
      setFormData(prev => ({ ...prev, lr_no: nextLrNo })); setIsLrEditable(false)
    } catch (err) {
      setFormData(prev => ({ ...prev, lr_no: '' })); setNumberError(true)
      toast.error('Unable to generate LR number. Retry.')
    } finally { setNumberLoading(false) }
  }

  const validateLRNo = async (lrNo) => {
    const normalizedLrNo = lrNo.trim()
    if (!normalizedLrNo) { setLrError('LR Number required hai'); return false }
    if (!/^[A-Za-z0-9/-]+$/.test(normalizedLrNo)) { setLrError('Only letters, numbers, -, / allowed'); return false }
    const requestId = ++lrCheckRequest.current; setLrChecking(true)
    try {
      const response = await biltyAPI.getAll({ lrNumber: normalizedLrNo })
      const consignments = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data?.consignments)
            ? response.data.consignments
            : null
      if (!consignments) throw new Error('The server returned an invalid LR number check response')
      const duplicate = consignments.some(item =>
        String(item.id) !== String(id || '') &&
        String(item.lr_no || '').trim().toLowerCase() === normalizedLrNo.toLowerCase()
      )
      if (requestId === lrCheckRequest.current) { setLrError(duplicate ? 'This Bilty No already exists - Dusra number dalo' : ''); setLrChecking(false) }
      return !duplicate
    } catch (err) {
      console.error('LR No validation error:', err)
      if (requestId === lrCheckRequest.current) { setLrError('Unable to validate LR number. Please try again.'); setLrChecking(false) }
      return false
    }
  }

  useEffect(() => {
    if (!isLrEditable || !formData.lr_no.trim()) return
    const timeout = setTimeout(() => validateLRNo(formData.lr_no), 600)
    return () => clearTimeout(timeout)
  }, [formData.lr_no, isLrEditable])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'lr_no') setLrError('')
    setFormData(prev => {
      const newData = { ...prev, [name]: value }
      if (name === 'method_of_packing' || name === 'package_type') {
        newData.method_of_packing = value
        newData.package_type = value
      }
      if (name === 'charged_weight' || name === 'rate') {
        const w = parseFloat(name === 'charged_weight' ? value : prev.charged_weight) || 0
        const r = parseFloat(name === 'rate' ? value : prev.rate) || 0
        if (prev.freight === 0 || prev.freight === (prev.charged_weight * prev.rate)) { newData.freight = w * r }
      }
      if (['length', 'width', 'height', 'no_of_pkgs_dimension'].includes(name)) {
        const l = parseFloat(name === 'length' ? value : prev.length) || 0
        const w = parseFloat(name === 'width' ? value : prev.width) || 0
        const h = parseFloat(name === 'height' ? value : prev.height) || 0
        const qty = parseFloat(name === 'no_of_pkgs_dimension' ? value : prev.no_of_pkgs_dimension) || 0
        newData.total_cft_cmt = l * w * h * qty
      }
      const chargeFields = ['freight', 'aoc_amount', 'eov_charges', 'cover_charges', 'material_mgmt_ch', 'collection_charges', 'door_dly_charges', 'pass_cc_charges', 'enroute_charges', 'statistical_charges', 'misc_charges']
      if (chargeFields.includes(name) || name === 'charged_weight' || name === 'rate') {
        const total = chargeFields.reduce((sum, field) => sum + (parseFloat(newData[field]) || 0), 0)
        newData.grand_total = total; newData.amount_in_words = numberToWords(total)
      }
      return newData
    })
  }

  const handleCustomerSelect = (type, customerId) => {
    const customer = customers.find(c => c.id === parseInt(customerId))
    if (customer) {
      setFormData(prev => ({
        ...prev,
        [`${type}_name`]: customer.customer_name || customer.name,
        [`${type}_address`]: customer.address || '',
        [`${type}_mobile`]: customer.mobile || '',
        [`${type}_gst`]: customer.gst_no || '',
        [`customer_code_${type}`]: customer.customer_code || ''
      }))
    }
  }

  const handleBranchSelect = (type, branch) => {
    setFormData(prev => {
      const next = { ...prev, [`${type}_code`]: branch.code }
      if (type === 'from' || type === 'to') next[`${type}_name`] = branch.name
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.consignor_name || !formData.consignee_name) { toast.error('Consignor और Consignee का नाम required है'); return }
    if (!formData.lr_no) { toast.error('LR number is still generating. Please retry.'); return }
    if (!await validateLRNo(formData.lr_no)) { toast.error(lrError || 'Please check LR number'); return }
    if (formData.bill_to_party === 'THIRD PARTY' && !formData.third_party_name.trim()) { toast.error('Third Party Name is required'); return }
    if (formData.bill_to_party === 'THIRD PARTY' && formData.third_party_gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/i.test(formData.third_party_gstin.trim())) {
      toast.error('Enter a valid GSTIN for the Third Party')
      return
    }
    setLoading(true)
    try {
      const billedAt = formData.bill_to_party === 'CONSIGNOR'
        ? formData.consignor_name
        : formData.bill_to_party === 'CONSIGNEE'
          ? formData.consignee_name
          : formData.bill_to_party === 'THIRD PARTY'
            ? formData.third_party_name
            : formData.bill_to_party === 'PAID' ? 'Paid' : ''
      const { from_code: _fromCode, aoc_percent: _aocPercent, ...payloadData } = formData
      const payload = {
        ...payloadData,
        ...(branchMode ? { branch_code: branchCode } : {}),
        actual_weight: formData.actual_weight ?? formData.act_wt ?? 0,
        charged_weight: formData.charged_weight ?? formData.chg_wt ?? 0,
        length: formData.length ?? 0,
        width: formData.width ?? 0,
        height: formData.height ?? 0,
        no_of_packages: formData.no_of_packages ?? formData.package_count ?? 0,
        package_type: formData.package_type || formData.method_of_packing,
        bill_to_party: formData.bill_to_party,
        billed_at_type: formData.bill_to_party,
        third_party_gstin: formData.third_party_gstin,
        third_party_gst: formData.third_party_gstin,
        billed_at: billedAt
      }
      payload.eway_valid_upto = payload.eway_valid_upto || null
      if (mrActive) { payload.mr_active = true; payload.mr_date = payload.mr_date || null }
      else { for (const field of Object.keys(payload)) { if (field.startsWith('mr_')) delete payload[field] } }
      if (id) {
        await biltyAPI.update(id, payload)
        toast.success('Bilty Updated - ' + payload.lr_no)
      } else {
        await biltyAPI.create(payload)
        toast.success('Bilty Saved - ' + payload.lr_no)
      }
      navigate('/consignments')
    } catch (err) {
      const errorMsg = err.response?.data?.error || `Failed to ${id ? 'update' : 'create'} bilty`
      if (errorMsg.toLowerCase().includes('already exists') || errorMsg.toLowerCase().includes('duplicate')) {
        setLrError('This Bilty No already exists'); setIsLrEditable(true); toast.error('This Bilty No already exists')
      } else { toast.error(errorMsg) }
    } finally { setLoading(false) }
  }

  const deliveryOptions = [{ value: 'Door Delivery', label: 'Door Delivery' }, { value: 'Godown Delivery', label: 'Godown Delivery' }, { value: 'Pickup', label: 'Pickup' }, { value: 'Self', label: 'Self' }]
  const gstOptions = [{ value: '', label: 'Select' }, { value: 'CONSIGNOR', label: 'CONSIGNOR' }, { value: 'CONSIGNEE', label: 'CONSIGNEE' }, { value: 'THIRD PARTY', label: 'THIRD PARTY' }, { value: 'B.T.C.', label: 'B.T.C.' }]
  const billedAtOptions = [{ value: '', label: 'Select' }, { value: 'CONSIGNOR', label: 'Consignor' }, { value: 'CONSIGNEE', label: 'Consignee' }, { value: 'THIRD PARTY', label: 'Third Party' }, { value: 'PAID', label: 'Paid' }]
  const billedAtName = formData.bill_to_party === 'CONSIGNOR'
    ? formData.consignor_name
    : formData.bill_to_party === 'CONSIGNEE'
      ? formData.consignee_name
      : formData.bill_to_party === 'THIRD PARTY'
        ? formData.third_party_name
        : formData.bill_to_party === 'PAID' ? 'Paid' : ''
  const loadTypeOptions = [{ value: 'Full Load', label: 'Full Load' }, { value: 'Part Load', label: 'Part Load' }]
  const insuranceOptions = [{ value: 'Not Insured', label: 'Not Insured' }, { value: 'Insured', label: 'Insured' }]
  const consignorOptions = [{ value: '', label: 'Select Party' }, ...customers.map(c => ({ value: c.id, label: c.customer_name || c.name }))]
  const consigneeOptions = [{ value: '', label: 'Select Party' }, ...customers.map(c => ({ value: c.id, label: c.customer_name || c.name }))]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">{id ? 'Edit Bilty (LR)' : 'Create New Bilty (LR)'}</h1>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition">← Back</button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 space-y-6">
          
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-xl font-bold text-white mb-4">📋 Section 1: Header Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">LR Number / Bilty Number *</label>
                <div className="flex gap-2 items-center">
                  <input type="text" name="lr_no" value={formData.lr_no} onChange={handleChange} disabled={!isLrEditable} required placeholder={numberLoading ? "Generating..." : "BTC-00012"} className={`w-full px-4 py-2 border rounded-lg font-bold transition-all ${isLrEditable ? 'bg-white text-black border-green-400 ring-2 ring-green-400' : 'bg-white/10 border-white/20 text-white'}`} style={isLrEditable ? {background:'#ffffff', color:'#000000'} : {}} />
                  <button type="button" onClick={() => setIsLrEditable(!isLrEditable)} className={`shrink-0 px-4 py-2 rounded-lg font-bold transition-all ${isLrEditable ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}>{isLrEditable ? '🔒 Lock' : '✏️ Edit'}</button>
                </div>
                {numberError && <button type="button" onClick={generateLRNo} className="mt-2 px-3 py-1 bg-yellow-500 text-black rounded text-sm">Retry Generate</button>}
                {lrChecking && <p className="mt-1 text-sm text-yellow-300 animate-pulse">Checking LR number...</p>}
                {lrError && <p className="mt-1 text-sm text-red-400 font-bold">⚠️ {lrError}</p>}
                {!isLrEditable && !lrError && <p className="mt-1 text-xs text-gray-400">Auto generated hai. Change karna hai to Edit dabao.</p>}
                {isLrEditable && !lrError && <p className="mt-1 text-xs text-green-400">✓ Ab khud ka number type kar sakte ho</p>}
              </div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">LR Date *</label><input type="date" name="lr_date" value={formData.lr_date} onChange={handleChange} required className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              {branchMode ? (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Branch *</label>
                  <input value={branchCode} readOnly required aria-readonly="true" className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-2 font-semibold text-white" />
                </div>
              ) : (
                <div><CreatableBranchSelect label="Branch" value={formData.branch_code} onChange={(branch) => handleBranchSelect('branch', branch)} required /></div>
              )}
              <div><label className="block text-gray-300 text-sm font-medium mb-1">From Name / Origin *</label><input type="text" name="from_name" value={formData.from_name} onChange={handleChange} required className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><CreatableBranchSelect label="To Code" value={formData.to_code} onChange={(branch) => handleBranchSelect('to', branch)} required /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">To Name *</label><input type="text" name="to_name" value={formData.to_name} onChange={handleChange} required className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><CustomSelect label="Delivery Type" name="delivery_type" value={formData.delivery_type} onChange={handleChange} options={deliveryOptions} required /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Unloading Party Mobile</label><input type="text" name="unloading_party_mobile" value={formData.unloading_party_mobile} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div className="md:col-span-2"><label className="block text-gray-300 text-sm font-medium mb-1">Delivery Godown Address</label><input type="text" name="delivery_godown_address" value={formData.delivery_godown_address} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div className="md:col-span-3"><label className="block text-gray-300 text-sm font-medium mb-1">Pickup Address</label><input type="text" name="pickup_address" value={formData.pickup_address} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
            </div>
          </div>

          <div className="border-b border-white/10 pb-6">
            <h3 className="text-xl font-bold text-white mb-4"> Section 2: Consignor (भेजने वाला)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"><div><CustomSelect label="Select Party" name="consignor_select" value="" onChange={(e) => handleCustomerSelect('consignor', e.target.value)} options={consignorOptions} /></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Consignor Name *</label><input type="text" name="consignor_name" value={formData.consignor_name} onChange={handleChange} required className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Consignor Mobile *</label><input type="text" name="consignor_mobile" value={formData.consignor_mobile} onChange={handleChange} required className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div className="md:col-span-2"><label className="block text-gray-300 text-sm font-medium mb-1">Consignor Address *</label><textarea name="consignor_address" value={formData.consignor_address} onChange={handleChange} required rows="2" className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Consignor GST</label><input type="text" name="consignor_gst" value={formData.consignor_gst} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Customer Code</label><input type="text" name="customer_code_consignor" value={formData.customer_code_consignor} readOnly className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white" /></div>
            </div>
          </div>

          <div className="border-b border-white/10 pb-6">
            <h3 className="text-xl font-bold text-white mb-4"> Section 3: Consignee (लेने वाला)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"><div><CustomSelect label="Select Party" name="consignee_select" value="" onChange={(e) => handleCustomerSelect('consignee', e.target.value)} options={consigneeOptions} /></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Consignee Name *</label><input type="text" name="consignee_name" value={formData.consignee_name} onChange={handleChange} required className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Consignee Mobile *</label><input type="text" name="consignee_mobile" value={formData.consignee_mobile} onChange={handleChange} required className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div className="md:col-span-2"><label className="block text-gray-300 text-sm font-medium mb-1">Consignee Address *</label><textarea name="consignee_address" value={formData.consignee_address} onChange={handleChange} required rows="2" className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Consignee GST</label><input type="text" name="consignee_gst" value={formData.consignee_gst} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Customer Code</label><input type="text" name="customer_code_consignee" value={formData.customer_code_consignee} readOnly className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white" /></div>
            </div>
          </div>

          <div className="border-b border-white/10 pb-6">
            <h3 className="text-xl font-bold text-white mb-4">📄 Section 4: Invoice Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Invoice No</label><input type="text" name="invoice_no" value={formData.invoice_no} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Invoice Date</label><input type="date" name="invoice_date" value={formData.invoice_date} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Purchase Order No</label><input type="text" name="po_no" value={formData.po_no} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">PO Date</label><input type="date" name="po_date" value={formData.po_date} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
            </div>
          </div>

          <div className="border-b border-white/10 pb-6">
            <h3 className="text-xl font-bold text-white mb-4"> Section 5: Vehicle & Driver</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Lorry No (Vehicle No)</label><input type="text" name="vehicle_no" value={formData.vehicle_no} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Driver Name</label><input type="text" name="driver_name" value={formData.driver_name} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Driver Mobile</label><input type="text" name="driver_mobile" value={formData.driver_mobile} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
            </div>
          </div>

          <div className="border-b border-white/10 pb-6">
            <h3 className="text-xl font-bold text-white mb-4">🛡️ Section 6: Insurance</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><CustomSelect label="Insurance Status" name="insurance_status" value={formData.insurance_status} onChange={handleChange} options={insuranceOptions} /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Insurance Company</label><input type="text" name="insurance_company" value={formData.insurance_company} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Policy No</label><input type="text" name="insurance_policy_no" value={formData.insurance_policy_no} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Insurance Date</label><input type="date" name="insurance_date" value={formData.insurance_date} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Insurance Amount (₹)</label><input type="number" name="insurance_amount" value={formData.insurance_amount} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
            </div>
          </div>

          <div className="border-b border-white/10 pb-6">
            <h3 className="text-xl font-bold text-white mb-4">📦 Section 7: Package Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="block text-gray-300 text-sm font-medium mb-1">No of Packages *</label><input type="number" name="no_of_packages" value={formData.no_of_packages} onChange={handleChange} required className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Method of Packing</label><input type="text" name="method_of_packing" value={formData.method_of_packing} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">HSN Code</label><input type="text" name="hsn_code" value={formData.hsn_code} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Distance (Kms)</label><input type="number" name="distance" value={formData.distance} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div className="md:col-span-2"><label className="block text-gray-300 text-sm font-medium mb-1">Description (Said to Contain) *</label><textarea name="description" value={formData.description} onChange={handleChange} required rows="2" className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Actual Weight (Kg) *</label><input type="number" name="actual_weight" value={formData.actual_weight} onChange={handleChange} required className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Charged Weight (Kg) *</label><input type="number" name="charged_weight" value={formData.charged_weight} onChange={handleChange} required className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Rate *</label><input type="number" name="rate" value={formData.rate} onChange={handleChange} required className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
            </div>
          </div>

          <div className="border-b border-white/10 pb-6">
            <h3 className="text-xl font-bold text-white mb-4">📐 Section 8: Dimensions</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Length</label><input type="number" name="length" value={formData.length} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Width</label><input type="number" name="width" value={formData.width} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Height</label><input type="number" name="height" value={formData.height} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">No of Pkgs (dimension)</label><input type="number" name="no_of_pkgs_dimension" value={formData.no_of_pkgs_dimension} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Total CFT/CMT (Auto)</label><input type="number" value={formData.total_cft_cmt} readOnly className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white font-bold" /></div>
            </div>
          </div>

          <div className="border-b border-white/10 pb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">🏷️ Section 9: Private Marks / MR</h3>
              <label className="flex items-center gap-2 text-white font-bold"><input type="checkbox" checked={mrActive} onChange={(e) => setMrActive(e.target.checked)} />Enable MR</label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2"><label className="block text-gray-300 text-sm font-medium mb-1">Private Marks</label><textarea name="private_marks" value={formData.private_marks} onChange={handleChange} rows="2" className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              {mrActive && (<><div><label className="block text-gray-300 text-sm font-medium mb-1">M.R. No</label><input type="text" name="mr_no" value={formData.mr_no} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div><div><label className="block text-gray-300 text-sm font-medium mb-1">M.R. Date</label><input type="date" name="mr_date" value={formData.mr_date} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div><div><label className="block text-gray-300 text-sm font-medium mb-1">M.R. Amount</label><input type="number" name="mr_amount" value={formData.mr_amount} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div></>)}
              <div><CustomSelect label="Load Type" name="load_type" value={formData.load_type} onChange={handleChange} options={loadTypeOptions} /></div>
            </div>
          </div>

          {/* FIXED SECTION 10 - FULL 12 CHARGES */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-xl font-bold text-white mb-4">💰 Section 10: Charges (Auto + Manual) - FULL</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><label className="block text-gray-300 text-sm font-medium mb-1">FREIGHT (Editable)</label><input type="number" name="freight" value={formData.freight} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">A.O.C. Amount</label><input type="number" name="aoc_amount" value={formData.aoc_amount} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">EOV Charges</label><input type="number" name="eov_charges" value={formData.eov_charges} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Cover Charges</label><input type="number" name="cover_charges" value={formData.cover_charges} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Material Mgmt Ch</label><input type="number" name="material_mgmt_ch" value={formData.material_mgmt_ch} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Collection Charges</label><input type="number" name="collection_charges" value={formData.collection_charges} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Door Dly Charges</label><input type="number" name="door_dly_charges" value={formData.door_dly_charges} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Pass/CC Attach Ch</label><input type="number" name="pass_cc_charges" value={formData.pass_cc_charges} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Enroute Charges</label><input type="number" name="enroute_charges" value={formData.enroute_charges} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Statistical Charges</label><input type="number" name="statistical_charges" value={formData.statistical_charges} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Misc. Charges</label><input type="number" name="misc_charges" value={formData.misc_charges} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
            </div>
            <div className="mt-4 text-right"><span className="text-gray-300 text-lg">Grand Total: </span><span className="text-3xl font-bold text-green-400">₹{formData.grand_total}</span></div>
          </div>

          <div className="border-b border-white/10 pb-6">
            <h3 className="text-xl font-bold text-white mb-4">📋 Section 11: E-Way Bill</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-gray-300 text-sm font-medium mb-1">E-Way Bill No</label><input type="text" name="eway_bill_no" value={formData.eway_bill_no} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Valid Upto</label><input type="date" name="eway_valid_upto" value={formData.eway_valid_upto} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
            </div>
          </div>

          {/* FIXED SECTION 12 - BILL TO PARTY WITH DROPDOWN */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-xl font-bold text-white mb-4">💵 Section 12: Booking Details - BILL TO PARTY FIXED</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Declared Value of Goods</label><input type="number" name="declared_value" value={formData.declared_value} onChange={handleChange} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Basis of Booking</label><input type="text" name="basis_of_booking" value={formData.basis_of_booking} onChange={handleChange} placeholder="(1) To Pay (2) To Be (3) Paid" className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><CustomSelect label="Billed at with M/s" name="bill_to_party" value={formData.bill_to_party} onChange={(e) => setFormData(prev => ({ ...prev, bill_to_party: e.target.value, billed_at_type: e.target.value, gst_through: e.target.value }))} options={billedAtOptions} /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1">Company Name (Auto from Bill To)</label><input type="text" value={billedAtName} readOnly placeholder="Bill To Party select karo" className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white font-bold" /></div>
              <div className="md:col-span-2"><CustomSelect label="GST Through" name="gst_through" value={formData.gst_through} onChange={(e) => setFormData(prev => ({ ...prev, gst_through: e.target.value, billed_at_type: e.target.value === 'B.T.C.' ? '' : e.target.value, bill_to_party: e.target.value === 'B.T.C.' ? '' : e.target.value }))} options={gstOptions} /></div>
              
              {formData.bill_to_party === 'THIRD PARTY' && (
                <>
                  <div><label className="block text-gray-300 text-sm font-medium mb-1">Third Party Name *</label><input type="text" name="third_party_name" value={formData.third_party_name} onChange={handleChange} required className="w-full px-4 py-2 bg-white/5 border border-green-400 rounded-lg text-white ring-1 ring-green-400" placeholder="Third Party ka naam likho" /></div>
                  <div><label className="block text-gray-300 text-sm font-medium mb-1">Third Party GSTIN</label><input type="text" name="third_party_gstin" value={formData.third_party_gstin} onChange={handleChange} pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][A-Za-z0-9]Z[A-Za-z0-9]" title="Enter valid GSTIN" className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
                  <div className="md:col-span-3"><label className="block text-gray-300 text-sm font-medium mb-1">Third Party Address</label><textarea name="third_party_address" value={formData.third_party_address} onChange={handleChange} rows="2" className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
                </>
              )}

              <div className="md:col-span-3"><label className="block text-gray-300 text-sm font-medium mb-1">Amount in Words (Auto)</label><input type="text" value={formData.amount_in_words} readOnly className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white font-bold italic" /></div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6">
            <button type="button" onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition">Cancel</button>
            <button type="submit" disabled={loading || numberLoading} className="px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition font-bold text-lg disabled:opacity-50">{loading ? (id ? 'Updating...' : 'Saving...') : numberLoading ? (id ? 'Loading Bilty...' : 'Generating LR...') : id ? 'Update Bilty' : `Save Bilty ${formData.lr_no}`}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
