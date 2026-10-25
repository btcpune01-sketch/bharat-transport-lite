import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { formatDate } from '../utils/dateFormatter'
import api from '../api'

const getAuthConfig = () => {
  const token = localStorage.getItem('token')
  if (!token) throw new Error('Your session has expired. Please sign in again.')
  return { headers: { Authorization: `Bearer ${token}` } }
}

const branchStockTypes = [
  { key: 'bilty_book', label: 'Bilty Book', unit: 'Books' },
  { key: 'bill_book', label: 'Bill Book', unit: 'Books' },
  { key: 'mr_book', label: 'Money Receipt Book', unit: 'Books' },
  { key: 'challan_book', label: 'Gadi Challan Book', unit: 'Books' },
  { key: 'a4_paper_reams', label: 'A4 Paper Reams', unit: 'Reams' },
  { key: 'printer_ink_black', label: 'Printer Ink (Black)', unit: 'Cartridges' },
  { key: 'dot_matrix_ribbon', label: 'Dot Matrix Ribbon', unit: 'Ribbons' },
  { key: 'envelopes_large', label: 'Envelopes (Large)', unit: 'Pieces' },
  { key: 'stapler_pins', label: 'Stapler Pins', unit: 'Boxes' },
  { key: 'file_folders', label: 'File Folders', unit: 'Pieces' },
  { key: 'carbon_paper', label: 'Carbon Paper', unit: 'Pieces' },
  { key: 'stamp_pad', label: 'Stamp Pad', unit: 'Pieces' }
]

const normalizeBranchOverview = (responseData) => {
  const overview = responseData?.data ?? responseData
  const branches = Array.isArray(overview)
    ? overview
    : Array.isArray(overview?.branches)
      ? overview.branches
      : Array.isArray(overview?.branchStocks)
        ? overview.branchStocks
        : null

  if (!branches) throw new Error('The server returned invalid branch stock data.')

  return {
    branches: branches.map((branch, index) => {
      const branchStock = branch.stocks
      const stockByType = Array.isArray(branchStock)
        ? new Map(branchStock.map((item) => [item.book_type || item.bookType, item]))
        : null
      const stockItems = branchStockTypes.map((book) => {
        const legacyKey = {
          bilty_book: 'biltyBook',
          bill_book: 'billBook',
          mr_book: 'mrBook',
          challan_book: 'gadiChallan'
        }[book.key]
        const item = stockByType?.get(book.key) || branch[legacyKey] || {}
        return {
          book_type: book.key,
          label: book.label,
          unit: book.unit,
          total_assigned: Number(item.total_assigned ?? item.totalAssigned) || 0,
          used: Number(item.used) || 0,
          remaining: Number(item.remaining) || 0,
          master_available: Number(item.master_available ?? item.masterAvailable) || 0,
          start_serial: item.start_serial ?? item.startSerial ?? null,
          end_serial: item.end_serial ?? item.endSerial ?? null,
          current_running_serial: item.current_running_serial ?? item.currentRunningSerial ?? null,
          updated_at: item.updated_at ?? item.updatedAt ?? null
        }
      })
      return {
        ...branch,
        branch_id: branch.branch_id ?? branch.id ?? branch._id ?? branch.url_slug ?? branch.branchSlug ?? index,
        branch_name: branch.branch_name ?? branch.branchName ?? branch.name ?? branch.branchSlug ?? branch.url_slug ?? branch.branch ?? 'Unknown branch',
        branch_code: branch.branch_code ?? branch.branchCode ?? branch.code,
        url_slug: branch.url_slug ?? branch.branchSlug ?? branch.slug,
        stocks: stockItems
      }
    }),
    masterStock: Array.isArray(overview?.masterStock) ? overview.masterStock : [],
    history: Array.isArray(overview?.history) ? overview.history : []
  }
}

export default function StockManagement() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  
  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const [stock, setStock] = useState([])
  const [history, setHistory] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [quantity, setQuantity] = useState('')
  const [remarks, setRemarks] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [documentStockError, setDocumentStockError] = useState('')
  const [documentStockLoading, setDocumentStockLoading] = useState(true)
  const [branchOverview, setBranchOverview] = useState({ branches: [], masterStock: [], history: [] })
  const [branchOverviewLoading, setBranchOverviewLoading] = useState(false)
  const [branchOverviewError, setBranchOverviewError] = useState('')
  const [branchSearch, setBranchSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [branchBookTypeFilter, setBranchBookTypeFilter] = useState('')
  const [branchHistory, setBranchHistory] = useState([])
  const [branchHistoryFilters, setBranchHistoryFilters] = useState({ branch: '', bookType: '', from: '', to: '' })
  const [branchHistoryLoading, setBranchHistoryLoading] = useState(false)
  const branchHistoryRef = useRef(null)

  const defaultStock = [
    { id: 'bilty', documentType: 'bilty', name: 'Bilty Book (BTC)', category: 'document', currentStock: 100, totalStock: 100, threshold: 10, unit: 'Pages', used: 0, running: 0, pending: 0 },
    { id: 'billing', documentType: 'billing', name: 'Bill Book', category: 'document', currentStock: 100, totalStock: 100, threshold: 10, unit: 'Pages', used: 0, running: 0, pending: 0 },
    { id: 'mr', documentType: 'mr', name: 'MR Book (Money Receipt)', category: 'document', currentStock: 50, totalStock: 50, threshold: 10, unit: 'Pages', used: 0, running: 0, pending: 0 },
    { id: 'gadi_challan', documentType: 'gadi_challan', name: 'Gadi Challan Book', category: 'document', currentStock: 50, totalStock: 50, threshold: 10, unit: 'Pages', used: 0, running: 0, pending: 0 },
    { id: 7, name: 'A4 Paper Reams', category: 'stationery', currentStock: 100, threshold: 20, unit: 'Reams', pricePerUnit: 250, used: 0 },
    { id: 8, name: 'Printer Ink (Black)', category: 'stationery', currentStock: 50, threshold: 10, unit: 'Cartridges', pricePerUnit: 500, used: 0 },
    { id: 9, name: 'Dot Matrix Ribbon', category: 'stationery', currentStock: 40, threshold: 10, unit: 'Ribbons', pricePerUnit: 200, used: 0 },
    { id: 10, name: 'Envelopes (Large)', category: 'stationery', currentStock: 500, threshold: 100, unit: 'Pieces', pricePerUnit: 5, used: 0 },
    { id: 11, name: 'Stapler Pins', category: 'stationery', currentStock: 100, threshold: 20, unit: 'Boxes', pricePerUnit: 30, used: 0 },
    { id: 12, name: 'File Folders', category: 'stationery', currentStock: 200, threshold: 50, unit: 'Pieces', pricePerUnit: 15, used: 0 },
    { id: 13, name: 'Carbon Paper', category: 'stationery', currentStock: 150, threshold: 30, unit: 'Pieces', pricePerUnit: 20, used: 0 },
    { id: 14, name: 'Stamp Pad', category: 'stationery', currentStock: 20, threshold: 5, unit: 'Pieces', pricePerUnit: 50, used: 0 },
    { id: 15, name: 'Pen / Marker', category: 'stationery', currentStock: 80, threshold: 15, unit: 'Pieces', pricePerUnit: 25, used: 0 },
  ]

  const applyDocumentStock = (rows) => {
    if (!Array.isArray(rows)) throw new Error('The server returned an invalid document stock response.')
    const documentItems = rows.map(item => {
      const defaults = defaultStock.find(stockItem => stockItem.documentType === item.document_type)
      if (!defaults) {
        if (item.document_type !== 'lr_copy') throw new Error(`The server returned unknown document type "${item.document_type}".`)
        return {
          id: 'lr_copy',
          documentType: 'lr_copy',
          name: item.name || 'LR Copy Book',
          category: 'document',
          unit: 'Pages',
          threshold: Number(item.low_stock_limit) || 10,
          totalStock: Number(item.total_stock) || 0,
          used: Number(item.used_count) || 0,
          currentStock: Number(item.remaining_count) || 0
        }
      }
      return {
        ...defaults,
        name: item.name || defaults.name,
        totalStock: Number(item.total_stock) || 0,
        used: Number(item.used_count) || 0,
        running: Number(item.running_count) || 0,
        pending: Number(item.pending_count) || 0,
        currentStock: item.remaining_count == null ? defaults.currentStock : Number(item.remaining_count),
        threshold: Number(item.low_stock_limit) || defaults.threshold
      }
    })
    setStock(current => [...(documentItems.length ? documentItems : defaultStock.filter(item => item.category === 'document')), ...current.filter(item => item.category !== 'document')])
  }

  useEffect(() => {
    const initializeStock = async () => {
      let savedStationery = defaultStock.filter(item => item.category === 'stationery')
      const savedStock = localStorage.getItem('btc_stock_final')
      if (savedStock) {
        try {
          const parsed = JSON.parse(savedStock)
          if (!Array.isArray(parsed)) throw new Error('Saved stock data is not a list.')
          savedStationery = parsed.filter(item => item.category === 'stationery')
        } catch (error) {
          console.error('Unable to read saved stationery stock:', error)
        }
      }
      setStock([...defaultStock.filter(item => item.category === 'document'), ...savedStationery])

      const savedHistory = localStorage.getItem('btc_stock_history_final')
      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory)
          if (!Array.isArray(parsed)) throw new Error('Saved stock history is not a list.')
          setHistory(parsed)
        } catch (error) {
          console.error('Unable to read saved stock history:', error)
          setHistory([])
        }
      }

      try {
        const [stockResult, historyResult, branchMasterResult] = await Promise.allSettled([
          api.get('/stock', getAuthConfig()),
          api.get('/stock/history', getAuthConfig()),
          api.get('/stationery-stock/branch-overview', getAuthConfig())
        ])
        if (stockResult.status === 'rejected') throw stockResult.reason
        applyDocumentStock(stockResult.value.data?.data)
        if (branchMasterResult.status === 'fulfilled') {
          const overview = normalizeBranchOverview(branchMasterResult.value.data)
          if (Array.isArray(overview.masterStock)) {
            const masterByType = new Map(overview.masterStock.map((item) => [item.book_type, item]))
            setStock((current) => current.map((item) => {
              if (item.category !== 'stationery') return item
              const type = branchStockTypes.find((book) => book.label === item.name)?.key
              const master = masterByType.get(type)
              if (!master) return item
              return {
                ...item,
                totalStock: Number(master.total_stock) || 0,
                used: Number(master.used) || 0,
                currentStock: Number(master.available) || 0
              }
            }))
            setBranchOverview(overview)
          }
        } else {
          console.error('Unable to load company stationery master stock:', branchMasterResult.reason)
        }
        if (historyResult.status === 'rejected') {
          console.error('Unable to load document stock history:', historyResult.reason)
        } else {
          const documentHistory = Array.isArray(historyResult.value.data?.data)
            ? historyResult.value.data.data.map(entry => ({
              id: `document-${entry.id}`,
              date: entry.date,
              itemName: entry.name,
              type: entry.action === 'added' ? 'IN' : 'OUT',
              documentNumber: entry.document_number || '-',
              performedBy: entry.used_by || '-',
              branch: entry.branch || 'Head Office'
            }))
            : []
          setHistory(current => [...documentHistory, ...current])
        }
      } catch (error) {
        console.error('Unable to load document stock:', error)
        setDocumentStockError(error.response?.data?.error || error.message || 'Unable to load document stock.')
      } finally {
        setDocumentStockLoading(false)
      }
    }

    initializeStock()
  }, [])

  useEffect(() => {
    let active = true
    setBranchOverviewLoading(true)
    setBranchOverviewError('')
    api.get('/stationery-stock/branch-overview')
      .then((response) => {
        const data = normalizeBranchOverview(response.data)
        if (active) {
          setBranchOverview(data)
        }
      })
      .catch((error) => {
        if (active) setBranchOverviewError(error.response?.data?.error || error.message || 'Unable to load branch stock.')
      })
      .finally(() => { if (active) setBranchOverviewLoading(false) })
    return () => { active = false }
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'branch-stock') return undefined
    let active = true
    setBranchHistoryLoading(true)
    const params = Object.fromEntries(Object.entries(branchHistoryFilters).filter(([, value]) => value))
    api.get('/stationery-stock/branch-history', { params })
      .then((response) => {
        const data = response.data?.data
        if (!Array.isArray(data)) throw new Error('The server returned invalid branch stock history.')
        if (active) setBranchHistory(data)
      })
      .catch((error) => {
        if (active) setBranchOverviewError(error.response?.data?.error || error.message || 'Unable to load branch stock history.')
      })
      .finally(() => { if (active) setBranchHistoryLoading(false) })
    return () => { active = false }
  }, [activeTab, branchHistoryFilters])

  const saveStock = (newStock) => {
    setStock(newStock)
    localStorage.setItem('btc_stock_final', JSON.stringify(newStock.filter(item => item.category === 'stationery')))
  }

  const saveHistory = (newHistory) => {
    setHistory(newHistory)
    localStorage.setItem('btc_stock_history_final', JSON.stringify(newHistory))
  }

  const getStockStatus = (current, threshold = 50) => {
    if (current <= Math.max(1, Math.floor(threshold / 2))) return { color: 'bg-red-100 text-red-700 border-red-300', text: 'CRITICAL', level: 'critical' }
    if (current <= threshold) return { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', text: 'LOW', level: 'low' }
    return { color: 'bg-green-100 text-green-700 border-green-300', text: 'GOOD', level: 'good' }
  }

  const openAddModal = (item) => {
    setSelectedItem(item)
    setQuantity('')
    setRemarks('')
    setShowAddModal(true)
  }

  const openRemoveModal = (item) => {
    setSelectedItem(item)
    setQuantity('')
    setRemarks('')
    setShowRemoveModal(true)
  }

  const handleAddStock = async (e) => {
    e.preventDefault()
    const qty = parseInt(quantity)
    if (!qty || qty <= 0) { alert('⚠️ Valid quantity daalo!'); return }
    const type = selectedItem.documentType
      ? ({ bilty: 'bilty_book', billing: 'bill_book', mr: 'mr_book', gadi_challan: 'challan_book' }[selectedItem.documentType] || selectedItem.documentType)
      : branchStockTypes.find((book) => book.label === selectedItem.name)?.key
    if (!type) {
      alert('This stock item is not available in the company stock catalog.')
      return
    }
    const serial = `MASTER-${Date.now()}`
    try {
      const response = await api.post('/stationery-stock/add', {
        type,
        qty,
        supplier: remarks,
        startNo: selectedItem.documentType ? `${serial}-0001` : '',
        endNo: selectedItem.documentType ? `${serial}-${String(qty).padStart(4, '0')}` : ''
      }, getAuthConfig())
      if (!response.data?.data) throw new Error('The server did not confirm the stock purchase.')
      if (selectedItem.documentType) {
        const totalStock = Number(selectedItem.totalStock || 0) + qty
        setStock(current => current.map(item => item.documentType === selectedItem.documentType
          ? { ...item, totalStock, currentStock: item.currentStock + qty }
          : item))
        setDocumentStockError('')
      } else {
        const updatedStock = stock.map(item =>
          item.id === selectedItem.id ? { ...item, currentStock: item.currentStock + qty, totalStock: (item.totalStock || item.currentStock) + qty } : item
        )
        saveStock(updatedStock)
      }
    } catch (error) {
      console.error('Unable to record stock purchase:', error)
      alert(error.response?.data?.error || error.message || 'Unable to record the purchase.')
      return
    }
    const entry = {
      id: Date.now(),
      date: formatDate(new Date()),
      itemName: selectedItem.name,
      type: 'IN',
      quantity: qty,
      unit: selectedItem.unit,
      remarks: remarks || '',
      performedBy: user.username || 'Admin',
      balanceAfter: selectedItem.currentStock + qty
    }
    setHistory(current => [entry, ...current])
    setShowAddModal(false)
    alert(`✅ ${qty} ${selectedItem.unit} ${selectedItem.name} add ho gaye!`)
  }

  const handleRemoveStock = (e) => {
    e.preventDefault()
    const qty = parseInt(quantity)
    if (!qty || qty <= 0) { alert('⚠️ Valid quantity daalo!'); return }
    if (qty > selectedItem.currentStock) { alert(`❌ Sirf ${selectedItem.currentStock} available hain!`); return }
    const updatedStock = stock.map(item => 
      item.id === selectedItem.id ? { ...item, currentStock: item.currentStock - qty, used: (item.used || 0) + qty } : item
    )
    saveStock(updatedStock)
    const entry = {
      id: Date.now(),
      date: formatDate(new Date()),
      itemName: selectedItem.name,
      type: 'OUT',
      quantity: qty,
      unit: selectedItem.unit,
      remarks: remarks || '',
      performedBy: user.username || 'Admin',
      balanceAfter: selectedItem.currentStock - qty
    }
    saveHistory([entry, ...history])
    setShowRemoveModal(false)
    alert(`✅ ${qty} ${selectedItem.unit} ${selectedItem.name} use ho gaye!`)
  }

  const filteredStock = stock.filter(item => {
    if (filterCategory !== 'all' && item.category !== filterCategory) return false
    if (!searchQuery) return true
    return item.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const totalItems = stock.length
  const totalUsed = stock.reduce((sum, s) => sum + (s.used || 0), 0)
  const totalRemaining = stock.reduce((sum, s) => sum + (s.currentStock || 0), 0)
  const lowStockItems = stock.filter(s => s.currentStock <= (s.threshold || 50))
  const documentItems = filteredStock.filter(s => s.category === 'document')
  const stationeryItems = filteredStock.filter(s => s.category === 'stationery')

  const branchHasLowStock = (branch) => (Array.isArray(branch.stocks) ? branch.stocks : []).some((item) =>
    Number(item.remaining) < 5
  )
  const branchRows = branchOverview.branches.flatMap((branch) =>
    (Array.isArray(branch.stocks) ? branch.stocks : []).map((item) => ({ ...item, branch }))
  )
  const filteredBranchRows = branchRows.filter(({ branch, book_type: bookType }) =>
    (!branchFilter || String(branch.branch_id) === branchFilter) &&
    (!branchBookTypeFilter || bookType === branchBookTypeFilter) &&
    `${branch.branch_name} ${branch.branch_code || ''} ${branch.url_slug || ''}`.toLowerCase().includes(branchSearch.toLowerCase())
  )
  const branchSummary = useMemo(() => {
    const rows = branchOverview.branches.flatMap((branch) => Array.isArray(branch.stocks) ? branch.stocks : [])
    const populatedRows = rows.filter((item) => Number(item.total_assigned) > 0 || Number(item.used) > 0)
    return {
      branches: branchOverview.branches.length,
      items: populatedRows.length,
      remaining: rows.reduce((sum, item) => sum + Number(item.remaining || 0), 0),
      used: rows.reduce((sum, item) => sum + Number(item.used || 0), 0),
      low: populatedRows.filter((item) => {
        const total = Number(item.total_assigned) || 0
        const remaining = Number(item.remaining) || 0
        return total > 0 && remaining / total <= 0.2
      }).length
    }
  }, [branchOverview.branches])
  const branchCount = branchOverview.branches.length

  const downloadBranchReport = (rows, filename) => {
    const columns = ['Date', 'Branch', 'Book Type', 'Action', 'Quantity', 'Source', 'By', 'Branch Remaining', 'Master Remaining']
    const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const csv = [
      columns.map(escapeCsv).join(','),
      ...rows.map((row) => [
        row.created_at,
        row.branch_name,
        branchStockTypes.find((book) => book.key === row.book_type)?.label || row.book_type,
        row.action,
        row.quantity,
        row.source,
        row.performed_by,
        row.remaining,
        row.master_remaining
      ].map(escapeCsv).join(','))
    ].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const downloadBranchInventory = (branches, filename) => {
    const columns = ['Branch', 'Branch Code', 'Book Type', 'Total Assigned', 'Used', 'Remaining', 'Master Remaining', 'Unit']
    const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const csv = [
      columns.map(escapeCsv).join(','),
      ...branches.flatMap((branch) => branch.stocks.map((item) => [
        branch.branch_name,
        branch.branch_code,
        item.label,
        item.total_assigned,
        item.used,
        item.remaining,
        item.master_available,
        item.unit
      ].map(escapeCsv).join(','))
      )
    ].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const renderStockCard = (item) => {
    const status = getStockStatus(item.currentStock, item.threshold)
    const isDocument = Boolean(item.documentType)
    return (
      <div key={item.id} className={`bg-white rounded-2xl shadow-lg p-5 border-l-4 ${status.level === 'critical' ? 'border-red-500' : status.level === 'low' ? 'border-yellow-500' : 'border-green-500'}`}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
            <p className="text-xs text-gray-500">Unit: {item.unit}</p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-bold border ${status.color}`}>{status.text}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          <div className="text-center bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">Stock</div>
            <div className="text-xl font-bold text-gray-800">{item.totalStock ?? item.currentStock + (item.used || 0)}</div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">Used</div>
            <div className="text-xl font-bold text-blue-600">{item.used || 0}</div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-2"><div className="text-xs text-gray-500">Running</div><div className="text-xl font-bold text-blue-600">{item.running || 0}</div></div>
          <div className="text-center bg-gray-50 rounded-lg p-2"><div className="text-xs text-gray-500">Pending</div><div className="text-xl font-bold text-amber-600">{item.pending || 0}</div></div>
          <div className="text-center bg-gray-50 rounded-lg p-2"><div className="text-xs text-gray-500">Remaining</div><div className={`text-xl font-bold ${item.currentStock < 10 ? 'text-red-600' : 'text-gray-800'}`}>{item.currentStock}</div></div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openAddModal(item)} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm">{isDocument ? '➕ Record Purchase' : '➕ Add'}</button>
          {!isDocument && <button onClick={() => openRemoveModal(item)} className="flex-1 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold text-sm">➖ Use</button>}
        </div>
      </div>
    )
  }

  const renderDocumentTable = () => (
    <div className="overflow-x-auto rounded-xl bg-white shadow-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Book Type</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Book Name</th>
            <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-600">Total Pages</th>
            <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-600">Used</th>
            <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-600">Remaining</th>
            <th className="px-4 py-3 text-center text-xs font-bold uppercase text-gray-600">Status</th>
            <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-600">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {documentItems.map(item => {
            const status = getStockStatus(item.currentStock, item.threshold)
            return (
              <tr key={item.id} className="hover:bg-blue-50">
                <td className="px-4 py-3 text-sm font-semibold capitalize text-gray-700">{item.documentType.replaceAll('_', ' ')}</td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900">{item.name}</td>
                <td className="px-4 py-3 text-right text-sm">{item.totalStock}</td>
                <td className="px-4 py-3 text-right text-sm text-blue-700">{item.used}</td>
                <td className="px-4 py-3 text-right text-sm font-bold">{item.currentStock}</td>
                <td className="px-4 py-3 text-center"><span className={`rounded-full border px-2 py-1 text-xs font-bold ${status.color}`}>{status.text}</span></td>
                <td className="px-4 py-3 text-right"><button onClick={() => openAddModal(item)} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700">Record Purchase</button></td>
              </tr>
            )
          })}
          {!documentItems.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No document books configured.</td></tr>}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="min-h-screen p-4 md:p-6 w-full bg-[#eef2f7]">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800"> Stock Management</h1>
            <p className="text-gray-500 mt-1">Bilty, Bill, MR, Challan aur Stationery ka hisab</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setActiveTab('history')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">📜 History</button>
            <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">← Dashboard</button>
          </div>
        </div>

        {documentStockError && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            <p className="font-bold">Unable to load document stock</p>
            <p className="text-sm">{documentStockError}</p>
          </div>
        )}

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl p-5 shadow-lg">
            <div className="text-blue-100 text-xs font-medium uppercase">Total Items</div>
            <div className="text-3xl font-bold mt-2">{totalItems}</div>
            <div className="text-blue-200 text-xs mt-1">Document + Stationery</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-700 text-white rounded-2xl p-5 shadow-lg">
            <div className="text-green-100 text-xs font-medium uppercase">Remaining Stock</div>
            <div className="text-2xl font-bold mt-2">{totalRemaining}</div>
            <div className="text-green-200 text-xs mt-1">Document books + stationery</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-2xl p-5 shadow-lg">
            <div className="text-orange-100 text-xs font-medium uppercase">Low Stock</div>
            <div className="text-3xl font-bold mt-2">{lowStockItems.length}</div>
            <div className="text-orange-200 text-xs mt-1">Need immediate reorder</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-2xl p-5 shadow-lg">
            <div className="text-purple-100 text-xs font-medium uppercase">Total Used</div>
            <div className="text-3xl font-bold mt-2">{totalUsed}</div>
            <div className="text-purple-200 text-xs mt-1">All-time consumption</div>
          </div>
        </div>

        {/* LOW STOCK ALERT */}
        {lowStockItems.length > 0 && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-bold text-red-800 text-lg">⚠️ Low Stock Alert!</p>
                <p className="text-sm text-red-700 mt-1">
                  <strong>{lowStockItems.map(i => i.name).join(', ')}</strong> — reorder karo!
                </p>
              </div>
              <button onClick={() => setFilterCategory('all')} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm">📦 View All Stock</button>
            </div>
          </div>
        )}

        {/* TABS */}
        <div className="bg-white rounded-2xl shadow-lg mb-6">
          <div className="flex border-b overflow-x-auto">
            <button onClick={() => setActiveTab('overview')} className={`px-6 py-3 font-bold whitespace-nowrap transition ${activeTab === 'overview' ? 'text-blue-700 border-b-4 border-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}>📊 Overview</button>
            <button onClick={() => setActiveTab('document')} className={`px-6 py-3 font-bold whitespace-nowrap transition ${activeTab === 'document' ? 'text-blue-700 border-b-4 border-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}>📄 Document Books ({documentItems.length})</button>
            <button onClick={() => setActiveTab('stationery')} className={`px-6 py-3 font-bold whitespace-nowrap transition ${activeTab === 'stationery' ? 'text-blue-700 border-b-4 border-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}>📦 Stationery ({stationeryItems.length})</button>
            <button onClick={() => setActiveTab('history')} className={`px-6 py-3 font-bold whitespace-nowrap transition ${activeTab === 'history' ? 'text-blue-700 border-b-4 border-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}>📜 History ({history.length})</button>
            {user.role === 'admin' && (
              <button onClick={() => setActiveTab('branch-stock')} className={`relative px-6 py-3 font-bold whitespace-nowrap transition ${activeTab === 'branch-stock' ? 'text-blue-700 border-b-4 border-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}>
                🏢 Branch Stock ({branchCount})
                {branchOverview.branches.some(branchHasLowStock) && <span aria-label="Branch stock is low" className="absolute right-3 top-2 h-2 w-2 rounded-full bg-red-600" />}
              </button>
            )}
          </div>
        </div>

        {/* SEARCH BAR */}
        {activeTab !== 'history' && activeTab !== 'branch-stock' && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" placeholder="Search items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="p-2.5 border border-gray-300 rounded-lg">
                <option value="all">All Categories</option>
                <option value="document">📄 Document Books</option>
                <option value="stationery">📦 Stationery</option>
              </select>
            </div>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4"> Document Books ({documentItems.length})</h2>
              {documentStockLoading ? <p className="py-8 text-center text-gray-500">Loading document stock...</p> : renderDocumentTable()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">📦 Stationery & Consumables ({stationeryItems.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stationeryItems.map(renderStockCard)}
              </div>
            </div>
          </div>
        )}

        {/* DOCUMENT TAB */}
        {activeTab === 'document' && (
          documentStockLoading ? <p className="py-8 text-center text-gray-500">Loading document stock...</p> : renderDocumentTable()
        )}

        {/* STATIONERY TAB */}
        {activeTab === 'stationery' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stationeryItems.map(renderStockCard)}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800"> Stock History ({history.length})</h2>
              {history.length > 0 && (
                <button onClick={() => { if (window.confirm('Clear all history?')) saveHistory([]) }} className="text-sm text-red-600 hover:text-red-800">🗑️ Clear History</button>
              )}
            </div>
            {history.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <div className="text-6xl mb-4">📭</div>
                <p>No stock history yet. Add or remove stock to see entries here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Book Type</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Document No.</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Used By</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Branch</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(entry.date)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{entry.itemName}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700">{entry.documentNumber || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{entry.performedBy || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{entry.branch || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'branch-stock' && user.role === 'admin' && (
              <div className="space-y-6">
                {branchOverviewError && (
                  <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
                    {branchOverviewError}
                  </div>
                )}
                <section aria-label="Branch stock summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <article className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-5 text-white shadow-lg">
                    <p className="text-xs font-medium uppercase text-blue-100">Total Items</p>
                    <p className="mt-2 text-3xl font-bold">{branchOverviewLoading ? '…' : branchSummary.items}</p>
                  </article>
                  <article className="rounded-2xl bg-gradient-to-br from-green-500 to-green-700 p-5 text-white shadow-lg">
                    <p className="text-xs font-medium uppercase text-green-100">Remaining Stock</p>
                    <p className="mt-2 text-3xl font-bold">{branchOverviewLoading ? '…' : branchSummary.remaining}</p>
                    <p className="mt-1 text-xs text-green-100">Across all branches</p>
                  </article>
                  <article className="rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-5 text-white shadow-lg">
                    <p className="text-xs font-medium uppercase text-orange-100">Low Stock</p>
                    <p className="mt-2 text-3xl font-bold">{branchOverviewLoading ? '…' : branchSummary.low}</p>
                    <p className="mt-1 text-xs text-orange-100">Items at 20% remaining or below</p>
                  </article>
                  <article className="rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 p-5 text-white shadow-lg">
                    <p className="text-xs font-medium uppercase text-purple-100">Total Used</p>
                    <p className="mt-2 text-3xl font-bold">{branchOverviewLoading ? '…' : branchSummary.used}</p>
                  </article>
                </section>

                <section className="rounded-2xl bg-white p-5 shadow-lg">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">All Branch Stocks - Admin View Only</h2>
                      <p className="mt-1 text-sm text-gray-500">Each branch updates its own stock. Admin monitors series, serials, and remaining balances.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadBranchInventory(branchOverview.branches, 'branch-stock-report.csv')}
                      className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Export All Branch Stock Report CSV
                    </button>
                  </div>
                  <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <select aria-label="Filter branch stock by branch" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                      <option value="">All branches</option>
                      {branchOverview.branches.map((branch) => <option key={branch.branch_id} value={String(branch.branch_id)}>{branch.branch_name}</option>)}
                    </select>
                    <select aria-label="Filter branch stock by book type" value={branchBookTypeFilter} onChange={(event) => setBranchBookTypeFilter(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                      <option value="">All book types</option>
                      {branchStockTypes.map((book) => <option key={book.key} value={book.key}>{book.label}</option>)}
                    </select>
                    <input type="search" aria-label="Search branch stock" placeholder="Search branch..." value={branchSearch} onChange={(event) => setBranchSearch(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                  {branchOverviewLoading ? (
                    <p className="py-8 text-center text-gray-500">Loading branch stock…</p>
                  ) : branchOverviewError ? null : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[1250px] w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                          <tr>
                            {['Branch', 'Book Type', 'Total', 'Remaining', 'Used', '% Remaining', 'Current Series / Running Serial', 'Last Updated', 'Status', 'Actions'].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredBranchRows.map((row) => {
                            const total = Number(row.total_assigned) || 0
                            const remaining = Number(row.remaining) || 0
                            const used = Number(row.used) || 0
                            const percent = total ? Math.min(100, Math.round(remaining / total * 100)) : 0
                            const status = percent === 0 || percent < 5
                              ? { label: 'CRITICAL', style: 'bg-red-100 text-red-700' }
                              : percent <= 20
                                ? { label: 'LOW', style: 'bg-yellow-100 text-yellow-800' }
                                : { label: 'GOOD', style: 'bg-green-100 text-green-700' }
                            return (
                              <tr key={`${row.branch.branch_id}-${row.book_type}`} className="hover:bg-slate-50">
                                <td className="px-3 py-3 font-semibold text-slate-800">{row.branch.branch_name}</td>
                                <td className="px-3 py-3">{row.label}</td>
                                <td className="px-3 py-3">{total}</td>
                                <td className="px-3 py-3 font-semibold">{remaining}</td>
                                <td className="px-3 py-3">{used}</td>
                                <td className="px-3 py-3">{percent}%</td>
                                <td className="px-3 py-3">
                                  <div>{row.start_serial || '—'}{row.end_serial ? ` to ${row.end_serial}` : ''}</div>
                                  <div className="text-xs text-slate-500">Running: {row.current_running_serial || '—'}</div>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap">{row.updated_at ? formatDate(row.updated_at) : '—'}</td>
                                <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${status.style}`}>{status.label}</span></td>
                                <td className="px-3 py-3">
                                  <div className="flex gap-2 whitespace-nowrap">
                                    <button type="button" onClick={() => {
                                      setBranchHistoryFilters((current) => ({ ...current, branch: row.branch.url_slug, bookType: row.book_type }))
                                      branchHistoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                    }} className="font-semibold text-blue-700 hover:underline">View History</button>
                                    <button type="button" onClick={() => navigate(`/branch/${row.branch.url_slug}/stationery-stock`)} className="font-semibold text-slate-700 hover:underline">View Branch Page</button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                          {!filteredBranchRows.length && <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">No branch stock entries match these filters.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section ref={branchHistoryRef} className="scroll-mt-4 rounded-2xl bg-white shadow-lg">
                  <div className="border-b bg-gray-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">Branch Stock History</h2>
                        <p className="mt-1 text-sm text-gray-500">Allocations, usage, and requests recorded by branch.</p>
                      </div>
                      <button type="button" onClick={() => downloadBranchReport(branchHistory, 'branch-stock-history.csv')} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white">
                        Export Filtered History
                      </button>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <select aria-label="Filter history by branch" value={branchHistoryFilters.branch} onChange={(event) => setBranchHistoryFilters({ ...branchHistoryFilters, branch: event.target.value })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                        <option value="">All branches</option>
                        {branchOverview.branches.map((branch) => <option key={branch.branch_id} value={branch.url_slug}>{branch.branch_name}</option>)}
                      </select>
                      <select aria-label="Filter history by book type" value={branchHistoryFilters.bookType} onChange={(event) => setBranchHistoryFilters({ ...branchHistoryFilters, bookType: event.target.value })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                        <option value="">All book types</option>
                        {branchStockTypes.map((book) => <option key={book.key} value={book.key}>{book.label}</option>)}
                      </select>
                      <label className="text-xs font-semibold text-slate-600">From <input type="date" value={branchHistoryFilters.from} onChange={(event) => setBranchHistoryFilters({ ...branchHistoryFilters, from: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
                      <label className="text-xs font-semibold text-slate-600">To <input type="date" value={branchHistoryFilters.to} onChange={(event) => setBranchHistoryFilters({ ...branchHistoryFilters, to: event.target.value })} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          {['Date', 'Branch', 'Book Type', 'Action', 'Qty', 'Source', 'By', 'Branch Remaining', 'Master Remaining'].map((label) => <th key={label} className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">{label}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {branchHistory.map((entry) => (
                          <tr key={entry.id}>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{formatDate(entry.created_at)}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-800">{entry.branch_name}</td>
                            <td className="px-4 py-3 text-sm">{branchStockTypes.find((book) => book.key === entry.book_type)?.label || entry.book_type}</td>
                            <td className="px-4 py-3 text-sm">{entry.action === 'assigned' ? 'Add' : entry.action === 'requested' ? 'Request' : 'Used'}</td>
                            <td className="px-4 py-3 text-sm">{entry.quantity}</td>
                            <td className="px-4 py-3 text-sm capitalize">{entry.source || '—'}</td>
                            <td className="px-4 py-3 text-sm">{entry.performed_by || '—'}</td>
                            <td className="px-4 py-3 text-sm">{entry.remaining ?? '—'}</td>
                            <td className="px-4 py-3 text-sm">{entry.master_remaining ?? '—'}</td>
                          </tr>
                        ))}
                        {!branchHistoryLoading && !branchHistory.length && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">No branch stock history matches these filters.</td></tr>}
                        {branchHistoryLoading && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Loading branch stock history…</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}
          </div>
        )}

        {/* ADD STOCK MODAL */}
        {showAddModal && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-green-500">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-800">➕ Add Stock</h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✖</button>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-800 font-bold">{selectedItem.name}</p>
                <p className="text-xs text-green-600 mt-1">Current Stock: <strong>{selectedItem.currentStock} {selectedItem.unit}</strong></p>
              </div>
              <form onSubmit={handleAddStock}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Add *</label>
                <input type="number" required min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-lg font-bold mb-3" placeholder="e.g., 100" autoFocus />
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg mb-4" placeholder="e.g., Purchased from ABC Stationers" />
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">✅ Add Stock</button>
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-gray-400 text-white rounded-lg font-bold hover:bg-gray-500">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* REMOVE STOCK MODAL */}
        {showRemoveModal && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-orange-500">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-800">➖ Use / Remove Stock</h3>
                <button onClick={() => setShowRemoveModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✖</button>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-orange-800 font-bold">{selectedItem.name}</p>
                <p className="text-xs text-orange-600 mt-1">Available: <strong>{selectedItem.currentStock} {selectedItem.unit}</strong></p>
              </div>
              <form onSubmit={handleRemoveStock}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Use *</label>
                <input type="number" required min="1" max={selectedItem.currentStock} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-lg font-bold mb-3" placeholder="e.g., 10" autoFocus />
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg mb-4" placeholder="e.g., Used for daily printing" />
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700">✅ Remove Stock</button>
                  <button type="button" onClick={() => setShowRemoveModal(false)} className="flex-1 py-3 bg-gray-400 text-white rounded-lg font-bold hover:bg-gray-500">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
