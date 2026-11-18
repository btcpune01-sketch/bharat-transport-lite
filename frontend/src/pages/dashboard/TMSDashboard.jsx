import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  Activity, ArrowDownToLine, Bell, Calculator, CheckCircle2, ChevronDown, FilePlus2,
  LogOut, Receipt, Search, Truck, Wallet, X
} from 'lucide-react'
import api, { branchAPI, dashboardAPI } from '../../api'
import { useAuth } from '../../AuthContext'
import toast from 'react-hot-toast'
import MonthlyStatsCharts from '../../components/MonthlyStatsCharts'
import BranchPaymentStatus from '../../components/BranchPaymentStatus'

const navigation = [
  {
    label: 'Dashboard',
    items: [
      { label: 'Dashboard Overview', path: 'dashboard' },
      { label: "Today's Booking", path: 'bookings/list?filter=today' },
      { label: "This Month's Booking", path: 'bookings/list?filter=month' },
      { label: 'Refresh Dashboard Data', action: 'refresh' }
    ]
  },
  {
    label: 'Bookings',
    items: [
      { label: 'New Bilty', path: 'bilty-entry' },
      { label: 'Consignments', path: 'consignments' },
      { label: 'Bilty Print / LR Print', path: 'bilty-print' },
      { label: 'Booking List', path: 'bookings/list' },
      { label: 'Gate Pass', path: 'gate-pass' },
      { label: 'Branch Transfer', path: 'branch-transfer' },
      { label: 'LR Tracking', path: 'track' },
      { label: 'E-Way Bills', path: 'eway-bills' },
      { label: 'Freight Calculator', path: 'freight-calculator' }
    ]
  },
  {
    label: 'Fleet & Drivers',
    items: [
      { label: 'Gadi Challan', path: 'gadi-challan' },
      { label: 'Vehicle Master', path: 'vehicle' },
      { label: 'Driver Master', path: 'driver' },
      { label: 'Vehicle Tracking', path: 'vehicle-tracking' },
      { label: 'Vehicle Challan History', path: 'vehicle-challan-list' },
      { label: 'Fleet Status', path: 'fleet-status' },
      { label: 'Document Expiry Alerts', path: 'vehicles/expiring' },
      { label: 'Trip Management', path: 'trips' }
    ]
  },
  {
    label: 'Operations',
    items: [
      { label: 'Gate Pass', path: 'gate-pass' },
      { label: 'Gate Pass List', path: 'gate-pass-list' },
      { label: 'Branch Transfer', path: 'branch-transfer' },
      { label: 'Branch Transfer List', path: 'branch-transfer-list' },
      { label: 'Manifest / Transit', path: 'manifests' },
      { label: 'Tracking', path: 'track' }
    ]
  },
  {
    label: 'Delivery',
    items: [
      { label: 'POD Entry', path: 'pod' },
      { label: 'Delivery Entry', path: 'delivery' },
      { label: 'POD Upload', path: 'pod-upload' },
      { label: 'Pending Delivery', path: 'pending-delivery' },
      { label: 'POD Register', path: 'pod-list' },
      { label: 'POD Report', path: 'pod-report' },
      { label: 'Delivery Report', path: 'delivery-report' },
      { label: 'POD Viewer', path: 'pod-view' },
      { label: 'Public POD View', path: 'public-pod-view' }
    ]
  },
  {
    label: 'Customers & Parties',
    items: [
      { label: 'Party Master', path: 'party-master' },
      { label: 'Customer Directory', path: 'customers' },
      { label: 'Create Party', path: 'party/new', adminOnly: true },
      { label: 'Customer Ledger', path: 'customer-ledger' },
      { label: 'Party Wise Report', path: 'party-wise-report' },
      { label: 'Rate Contracts', path: 'rates' }
    ]
  },
  {
    label: 'Billing & Invoices',
    items: [
      { label: 'Bill Entry', path: 'bill-entry' },
      { label: 'Bill List', path: 'bill-list' },
      { label: 'Bill Print', path: 'bill-print' },
      { label: 'Bill Register', path: 'bills' },
      { label: 'To Pay Report', path: 'to-pay-report' }
    ]
  },
  {
    label: 'Payments',
    items: [
      { label: 'Payment Entry', path: 'payment-entry' },
      { label: 'Money Receipt', path: 'money-receipt' },
      { label: 'Create Money Receipt', path: 'mr/create' },
      { label: 'Outstanding Report', path: 'outstanding' },
      { label: 'Paid Report', path: 'paid-report' },
      { label: 'Day Book', path: 'day-book' }
    ]
  },
  {
    label: 'Accounts & Finance',
    items: [
      { label: 'Ledger', path: 'ledger' },
      { label: 'Profit Report', path: 'profit-report' },
      { label: 'Stock Report', path: 'stock-report' },
      { label: 'Branch Wise Report', path: 'branch-wise-report' },
      { label: 'All Reports', path: 'all-reports' },
      { label: 'Daily Expenses', path: 'expenses' },
      { label: 'TDS Register', path: 'accounts/tds-register' },
      { label: 'Commissions', path: 'commissions' },
      { label: 'Claims', path: 'claims' }
    ]
  }
]

const adminQuickActions = [
  { label: 'New Bilty', path: 'bilty-entry', icon: FilePlus2, color: 'bg-blue-600 hover:bg-blue-700' },
  { label: 'New Bill', path: 'bill-entry', icon: Receipt, color: 'bg-blue-600 hover:bg-blue-700' },
  { label: 'Money Receipt', path: 'money-receipt', icon: Wallet, color: 'bg-purple-600 hover:bg-purple-700' },
  { label: 'Vehicle Challan', path: 'gadi-challan', icon: Truck, color: 'bg-emerald-600 hover:bg-emerald-700' },
  { label: 'Freight Calculator', path: 'freight-calculator', icon: Calculator, color: 'bg-slate-600 hover:bg-slate-700' },
  { label: 'Gate Pass', path: 'gate-pass', icon: FilePlus2, color: 'bg-cyan-600 hover:bg-cyan-700' },
  { label: 'Delivery Entry', path: 'delivery', icon: FilePlus2, color: 'bg-teal-600 hover:bg-teal-700' },
  { label: 'Branch Transfer', path: 'branch-transfer', icon: Truck, color: 'bg-indigo-600 hover:bg-indigo-700' },
  { label: 'Party Master', path: 'party-master', icon: Receipt, color: 'bg-violet-600 hover:bg-violet-700' },
  { label: 'Vehicle Master', path: 'vehicle', icon: Truck, color: 'bg-emerald-700 hover:bg-emerald-800' },
  { label: 'Reports', path: 'reports', icon: Activity, color: 'bg-slate-700 hover:bg-slate-800' },
  { label: 'Backup', path: 'backup', icon: ArrowDownToLine, color: 'bg-rose-600 hover:bg-rose-700', adminOnly: true },
  { label: 'User Management', path: 'user-management', icon: Wallet, color: 'bg-purple-700 hover:bg-purple-800' }
]

const administrationMenus = {
  admin: {
    label: 'Administration',
    items: [
      { label: 'Branch Management', path: 'admin/branches' },
      { label: 'Global User Management', path: 'admin/users' },
      { label: 'Backup & Restore', path: 'admin/backup' },
      { label: 'Stationery Stock Management', path: 'admin/stationery-stock' },
      { label: 'System Settings', path: 'admin/settings' },
      { label: 'Audit Logs', path: 'admin/audit' },
      { label: 'Database Management', path: 'admin/database' },
      { label: 'All Branches Data View', path: 'admin/all-branches' },
      { label: 'Branch Portal Management', path: 'branch-portal' },
      { label: 'Branch Ledger', path: 'branch-payments/summary' },
      { label: 'Role Management', path: 'admin/users' }
    ]
  },
  branch: {
    label: 'Administration',
    items: [
      { label: 'Branch User Management', path: 'user-management' },
      { label: 'Branch Stationery Stock', path: 'stationery-stock' },
      { label: 'Branch Settings', path: 'settings' }
    ]
  }
}

const stationeryTypes = [
  { label: 'BILTY', matches: ['bilty', 'lr'] },
  { label: 'BILLING', matches: ['billing', 'bill'] },
  { label: 'MR', matches: ['mr', 'money_receipt'] },
  { label: 'GADI_CHALLAN', matches: ['gadi_challan', 'challan'] }
]

const valueOrZero = (value) => Number(value || 0)
const money = (value) => `₹${valueOrZero(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const number = (value) => valueOrZero(value).toLocaleString('en-IN')

function branchLabel(branch) {
  return (branch || 'Branch')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getData(response) {
  return response?.data?.data || response?.data || {}
}

export default function TMSDashboard({ branch }) {
  const { currentUser, logout } = useAuth()
  const routeParams = useParams()
  const navigate = useNavigate()
  const branchSlug = branch && branch !== 'global'
    ? branch
    : routeParams.branchSlug || routeParams.branchCode || ''
  const isBranchDashboard = Boolean(branchSlug && branchSlug !== 'global')
  const isAdminUser = currentUser?.role === 'admin'
  const canClearPending = ['admin', 'manager'].includes(String(currentUser?.role || '').toLowerCase())
  const canAdminViewBranch = isBranchDashboard && isAdminUser
  const [stats, setStats] = useState(null)
  const [monthlyStats, setMonthlyStats] = useState({ bills: [], bilties: [] })
  const [monthlyStatsError, setMonthlyStatsError] = useState('')
  const [stock, setStock] = useState([])
  const [pendingRows, setPendingRows] = useState([])
  const [pendingError, setPendingError] = useState('')
  const [pendingToClear, setPendingToClear] = useState(null)
  const [clearingPending, setClearingPending] = useState(false)
  const [billTab, setBillTab] = useState('pending')
  const [clearedBills, setClearedBills] = useState([])
  const [clearedError, setClearedError] = useState('')
  const [allBills, setAllBills] = useState([])
  const [billBoxTab, setBillBoxTab] = useState('pending')
  const [billToClear, setBillToClear] = useState(null)
  const [clearingBill, setClearingBill] = useState(false)
  const [linkingBill, setLinkingBill] = useState(null)
  const [linkLrNo, setLinkLrNo] = useState('')
  const [linking, setLinking] = useState(false)
  const [viewBill, setViewBill] = useState(null)
  const [branches, setBranches] = useState([])
  const [statsUnavailable, setStatsUnavailable] = useState(false)
  const [activeMenu, setActiveMenu] = useState('')
  const [loading, setLoading] = useState(true)
  const [trackNumber, setTrackNumber] = useState('')
  const [trackResult, setTrackResult] = useState(null)
  const [trackError, setTrackError] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [branchSession, setBranchSession] = useState(null)
  const [documentSeriesStatus, setDocumentSeriesStatus] = useState([])
  const isAdmin = isAdminUser && !isBranchDashboard
  const menuItems = [
    ...navigation,
    ...(isAdmin ? [administrationMenus.admin] : isBranchDashboard ? [administrationMenus.branch] : [])
  ]
  const quickActions = isAdmin
    ? adminQuickActions
    : adminQuickActions.filter((item) => !item.adminOnly && (isBranchDashboard || item.path !== 'user-management'))

  useEffect(() => {
    if (!isBranchDashboard) return
    try {
      const session = JSON.parse(localStorage.getItem('branch_session') || 'null')
      if (!session?.token || session.branch?.url_slug !== branchSlug) {
        if (currentUser?.role !== 'admin' && currentUser?.branch_slug === branchSlug) {
          setBranchSession({
            token: localStorage.getItem('token'),
            branch: {
              id: currentUser.branch_id,
              url_slug: currentUser.branch_slug,
              branch_name: currentUser.branch_name
            }
          })
        } else {
          setBranchSession(false)
        }
        return
      }
      setBranchSession(session)
    } catch (error) {
      console.error('Unable to read the saved branch session:', error)
      setBranchSession(false)
    }
  }, [branchSlug, currentUser, isBranchDashboard])

  useEffect(() => {
    if (!isAdminUser) return
    let active = true
    branchAPI.getAll()
      .then((response) => {
        if (!active) return
        const data = getData(response)
        setBranches(Array.isArray(data) ? data : [])
      })
      .catch((error) => {
        console.error('Unable to load branches for dashboard navigation:', error)
        if (active) setBranches([])
      })
    return () => { active = false }
  }, [isAdminUser])

  useEffect(() => {
    if (!isBranchDashboard) {
      setDocumentSeriesStatus([])
      return undefined
    }
    let active = true
    api.get('/document-series/status', { params: { branch: branchSlug } })
      .then(response => {
        const rows = response.data?.data
        if (!Array.isArray(rows)) throw new Error('The server returned invalid document series data.')
        if (active) setDocumentSeriesStatus(rows)
      })
      .catch(error => {
        console.error('Unable to load branch document series on dashboard:', error)
        if (active) setDocumentSeriesStatus([])
      })
    return () => { active = false }
  }, [branchSlug, isBranchDashboard, refreshKey])

  const activeBranch = branchSession?.branch
    || branches.find((item) => item.url_slug === branchSlug)

  useEffect(() => {
    if (isBranchDashboard && branchSession === null) return
    if (isBranchDashboard && !branchSession && !canAdminViewBranch) return
    if (canAdminViewBranch && !activeBranch) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setStatsUnavailable(false)
    const statsBranchSlug = isBranchDashboard ? branchSlug : undefined
    const statsBranchId = isBranchDashboard ? activeBranch?.id : undefined
    const query = {}
    if (statsBranchSlug) query.branch = statsBranchSlug
    if (statsBranchId) query.branch_id = statsBranchId

    Promise.allSettled([
      dashboardAPI.getDashboardStats(statsBranchSlug, statsBranchId),
      api.get(isBranchDashboard ? '/stationery-stock' : '/stock', { params: query }),
      api.get('/dashboard/pending-amount', { params: query }),
      api.get('/dashboard/cleared-amount', { params: query }),
      dashboardAPI.getMonthlyStats(statsBranchSlug, statsBranchId),
      api.get('/bills', { params: query })
    ]).then((results) => {
      if (!active) return
      const [statsResult, stockResult, pendingResult, clearedResult, monthlyStatsResult, billsResult] = results
      if (statsResult.status === 'fulfilled' && statsResult.value.data?.success !== false) {
        setStats(getData(statsResult.value))
        setStatsUnavailable(false)
      } else {
        setStats(null)
        setStatsUnavailable(true)
      }
      if (stockResult.status === 'fulfilled') {
        const data = getData(stockResult.value)
        setStock(Array.isArray(data) ? data : [])
      } else {
        setStock([])
      }
      if (pendingResult.status === 'fulfilled') {
        const data = getData(pendingResult.value)
        setPendingRows(Array.isArray(data) ? data : [])
        setPendingError('')
      } else {
        console.error('Unable to load dashboard pending amounts:', pendingResult.reason)
        setPendingRows([])
        setPendingError(pendingResult.reason?.response?.data?.error || 'Pending amounts could not be loaded.')
      }
      if (clearedResult.status === 'fulfilled') {
        const data = getData(clearedResult.value)
        setClearedBills(Array.isArray(data) ? data : [])
        setClearedError('')
      } else {
        console.error('Unable to load dashboard cleared amounts:', clearedResult.reason)
        setClearedBills([])
        setClearedError(clearedResult.reason?.response?.data?.error || 'Cleared bills could not be loaded.')
      }
      if (monthlyStatsResult.status === 'fulfilled') {
        const data = getData(monthlyStatsResult.value)
        setMonthlyStats({
          bills: Array.isArray(data.bills) ? data.bills : [],
          bilties: Array.isArray(data.bilties) ? data.bilties : []
        })
        setMonthlyStatsError('')
      } else {
        console.error('Unable to load monthly dashboard statistics:', monthlyStatsResult.reason)
        setMonthlyStats({ bills: [], bilties: [] })
        setMonthlyStatsError(monthlyStatsResult.reason?.response?.data?.error || 'Monthly statistics could not be loaded.')
      }
      if (billsResult && billsResult.status === 'fulfilled') {
        const raw = billsResult.value?.data || {}
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw.data) ? raw.data : (Array.isArray(raw.bills) ? raw.bills : (Array.isArray(raw.rows) ? raw.rows : [])))
        setAllBills(list)
      } else {
        setAllBills([])
      }
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [
    branchSlug, branchSession, isBranchDashboard, canAdminViewBranch,
    activeBranch, refreshKey
  ])

  if (isBranchDashboard && branchSession === false && !canAdminViewBranch) {
    return <Navigate to={`/branch-login/${encodeURIComponent(branchSlug)}`} replace />
  }

  const branchPath = (path) => {
    if (isBranchDashboard) {
      if (path.startsWith('bookings/list')) {
        return `/branch/${branchSlug}/consignments${path.includes('?') ? `?${path.split('?')[1]}` : ''}`
      }
      const moduleAliases = {
        'freight-calculator': 'rate-master',
        'party/new': 'party-entry',
        'mr/create': 'money-receipt/create',
        'party-master': 'party-master',
        vehicle: 'vehicle',
        'accounts/tds-register': 'accounts',
        'billing/pending': 'outstanding',
        'fleet/status': 'fleet-status',
        bills: 'bill-list',
        'branch-payments/summary': 'branch-payments-summary'
      }
      const modulePath = moduleAliases[path] || path
      return `/branch/${branchSlug}/${modulePath}`
    }
    if (path.startsWith('bookings/list')) {
      return `/bookings/list${path.includes('?') ? `?${path.split('?')[1]}` : ''}`
    }
    const globalAliases = {
      'bilty-entry': '/consignments/new',
      'bilty-print': '/bilty-print',
      'bill-entry': '/bill-entry',
      'bill-list': '/bills',
      'bill-print': '/bill-print',
      'money-receipt': '/mr',
      'mr/create': '/mr/create',
      'payment-entry': '/branch-payments',
      'party-master': '/parties',
      'party/new': '/party/new',
      vehicle: '/vehicles',
      driver: '/drivers',
      delivery: '/pod',
      'pod-upload': '/pod-upload',
      'public-pod-view': '/public/pod-view',
      'pending-delivery': '/pod',
      'pod-list': '/pod',
      'pod-report': '/pod',
      'delivery-report': '/reports',
      'party-wise-report': '/reports',
      'paid-report': '/reports',
      'day-book': '/accounts/summary',
      'profit-report': '/reports',
      'stock-report': '/stock',
      'branch-wise-report': '/reports',
      'all-reports': '/reports',
      'vehicle-challan-list': '/gadi-challan',
      'gate-pass-list': '/gate-pass',
      'branch-transfer': '/transit',
      'branch-transfer-list': '/transit',
      'fleet-status': '/fleet/status',
      'vehicle-tracking': '/track',
      'to-pay-report': '/outstanding',
      'customer-ledger': '/ledger',
      'freight-calculator': '/rates',
      'user-management': '/admin/users',
      backup: '/admin/backup',
      'stationery-stock': '/admin/stationery-stock',
      settings: '/admin/settings',
      'branch-portal': '/branch-portal',
      'branch-payments/summary': '/branch-payments/summary',
      'accounts/tds-register': '/accounts/tds-register',
      'admin/database': '/admin/database'
    }
    if (globalAliases[path]) return globalAliases[path]
    return path === 'dashboard'
      ? '/dashboard'
      : `/${path}`
  }
  const title = isBranchDashboard
    ? branchLabel(branchSlug).toUpperCase()
    : isAdmin ? 'ADMIN' : currentUser?.branch_name || currentUser?.username || 'Dashboard'

  async function handleTrack(event) {
    event.preventDefault()
    if (!trackNumber.trim()) return
    setTrackError('')
    setTrackResult(null)
    try {
      const response = await api.get('/consignments/track', {
        params: { lr_no: trackNumber.trim() }
      })
      setTrackResult(response.data)
    } catch (error) {
      setTrackError(error.response?.data?.error || 'Unable to track this bilty.')
    }
  }

  async function clearPendingAmount() {
    if (!pendingToClear) return
    setClearingPending(true)
    const params = {}
    if (isBranchDashboard) {
      params.branch = branchSlug
      if (activeBranch?.id) params.branch_id = activeBranch.id
    }
    try {
      await api.patch(`/dashboard/pending-amount/${pendingToClear.id}`, {}, { params })
      setPendingRows((rows) => rows.filter((r) => r.id !== pendingToClear.id))
      toast.success(`Pending amount for ${pendingToClear.lr_no} cleared.`)
      setPendingToClear(null)
      setRefreshKey((key) => key + 1)
    } catch (error) {
      console.error('Unable to clear dashboard pending amount:', error)
      toast.error(error.response?.data?.error || 'Unable to clear this pending amount.')
    } finally {
      setClearingPending(false)
    }
  }

  async function clearBillAmount() {
    if (!billToClear) return
    setClearingBill(true)
    const params = {}
    if (isBranchDashboard) {
      params.branch = branchSlug
      if (activeBranch?.id) params.branch_id = activeBranch.id
    }
    try {
      try {
        await api.patch(`/bills/${billToClear.id}`, { net_balance: 0, balance_due: 0, payment_status: 'cleared', status: 'cleared' }, { params })
      } catch (e) {
        await api.patch(`/bills/${billToClear.id}/clear`, {}, { params })
      }
      setAllBills((prev) => prev.map((b) => String(b.id) === String(billToClear.id) ? { ...b, net_balance: 0, balance_due: 0, payment_status: 'cleared', status: 'cleared' } : b))
      toast.success(`Bill ${billToClear.bill_no || ''} cleared.`)
      setBillToClear(null)
      setRefreshKey((key) => key + 1)
    } catch (error) {
      console.error('Unable to clear bill:', error)
      toast.error(error.response?.data?.error || 'Unable to clear this bill.')
    } finally {
      setClearingBill(false)
    }
  }

  async function linkBillToBilty() {
    if (!linkingBill || !linkLrNo.trim()) return
    const lr = linkLrNo.trim()
    const exists = pendingRows.some((r) => String(r.lr_no).trim() === lr) || clearedBills.some((r) => String(r.lr_no).trim() === lr)
    if (!exists) {
      toast.error(`Bilty ${lr} Dashboard me nahi mili. Sahi Bilty Number likho.`)
      return
    }
    setLinking(true)
    const params = {}
    if (isBranchDashboard) {
      params.branch = branchSlug
      if (activeBranch?.id) params.branch_id = activeBranch.id
    }
    try {
      await api.patch(`/bills/${linkingBill.id}`, { lr_no: lr, lrNo: lr, bilty_no: lr, lr_numbers: [lr] }, { params })
      setAllBills((prev) => prev.map((b) => String(b.id) === String(linkingBill.id) ? { ...b, lr_no: lr, lrNo: lr, bilty_no: lr, lr_numbers: [lr] } : b))
      toast.success(`Bill ${linkingBill.bill_no} ab Bilty ${lr} se connect ho gaya.`)
      setLinkingBill(null)
      setLinkLrNo('')
      setRefreshKey((key) => key + 1)
    } catch (error) {
      console.error('Unable to link bill to bilty:', error)
      toast.error(error.response?.data?.error || 'Link nahi ho paya.')
    } finally {
      setLinking(false)
    }
  }

  async function handleLogout() {
    await logout()
    sessionStorage.clear()
    navigate('/login', { replace: true })
  }

  function stockBalance(stationery) {
    const itemStock = stock.find((entry) => {
      const entryType = String(entry.book_type || entry.document_type || entry.documentType || entry.type || '').toLowerCase()
      return stationery.matches.some((key) => entryType.includes(key))
    })
    return itemStock
      ? `${number(itemStock.remaining ?? itemStock.remaining_count ?? itemStock.remaining_quantity)}/${number(itemStock.total_assigned ?? itemStock.total_stock ?? itemStock.total_quantity)}`
      : '--/--'
  }

  const getStat = (...keys) => {
    for (const key of keys) {
      if (stats?.[key] !== undefined && stats?.[key] !== null) return stats[key]
    }
    return 0
  }

  const billBalance = (b) => Number(b?.net_balance ?? b?.balance_due ?? b?.grand_total ?? 0)
  const billNoOf = (b) => b?.bill_no || b?.invoice_no || b?.bill_number || b?.billNo || ''
  const billByLr = {}
  allBills.forEach((b) => {
    const direct = [b.lr_no, b.lrNo, b.bilty_no, b.biltyNo].filter(Boolean)
    const arr = Array.isArray(b.lr_numbers) ? b.lr_numbers : (Array.isArray(b.lr_nos) ? b.lr_nos : (Array.isArray(b.bilty_numbers) ? b.bilty_numbers : []))
    const itemLrs = Array.isArray(b.items) ? b.items.map((i) => i.lr_no || i.lrNo || i.bilty_no).filter(Boolean) : []
    ;[...direct, ...arr, ...itemLrs].forEach((lr) => { if (lr) billByLr[String(lr).trim()] = b })
  })
  function findBillForBilty(entry) {
    return billByLr[String(entry.lr_no || '').trim()] || null
  }
  function getBiltyBillingStatus(entry) {
    const bill = findBillForBilty(entry)
    if (!bill) return { label: 'Billing pending', sub: 'Is Bilty ka Bill abhi nahi bana hai', cls: 'bg-red-100 text-red-700', dot: 'bg-red-500' }
    const isPaid = billBalance(bill) <= 0
    if (isPaid) return { label: `Bill ${billNoOf(bill)} - Payment Clear ✅`, sub: `Is Bilty ka Bill ${billNoOf(bill)} tha, Payment Clear ho gaya hai`, cls: 'bg-green-100 text-green-700', dot: 'bg-green-500' }
    return { label: `Bill ${billNoOf(bill)} - Payment Pending`, sub: `Is Bilty ka Bill ${billNoOf(bill)} ban gaya hai, Payment baaki hai`, cls: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' }
  }
  const pendingBillsBox = allBills.filter((b) => billBalance(b) > 0)
  const clearedBillsBox = allBills.filter((b) => billBalance(b) <= 0)

  // *** FIX - Ab New Tab me nahi khulega, andar hi khulega, isliye 404 nahi aayega ***
  function openBillUrl(b) {
    if (!b) return '#'
    return branchPath('bill-list')
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-sm font-extrabold text-white">BTC</div>
          <strong className="text-sm font-bold text-slate-900">{title}</strong>
          <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-600">
            TMS 6.0 Live{isAdmin && !isBranchDashboard ? ' - Global' : ''}
          </span>
          <span className="text-xs font-semibold text-green-600">● System Online</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleTrack} className="flex">
            <label className="sr-only" htmlFor="dashboard-track">Track LR or bilty number</label>
            <input
              id="dashboard-track"
              value={trackNumber}
              onChange={(event) => setTrackNumber(event.target.value)}
              placeholder="Enter LR / Bilty Number..."
              className="w-56 rounded-l-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <button type="submit" className="rounded-r-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Search className="mr-1 inline h-4 w-4" />Track
            </button>
          </form>
          {isAdmin && !isBranchDashboard && (
            <>
              <label className="sr-only" htmlFor="dashboard-branch">Switch to branch dashboard</label>
              <select
                id="dashboard-branch"
                value=""
                onChange={(event) => {
                  if (event.target.value) navigate(`/branch/${encodeURIComponent(event.target.value)}/dashboard`)
                }}
                className="max-w-48 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select Branch</option>
                {branches.map((item) => (
                  <option key={item.id} value={item.url_slug}>{item.branch_name || item.branch_code}</option>
                ))}
              </select>
            </>
          )}
          {isBranchDashboard && isAdminUser && (
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Back to Admin
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              aria-label="Notifications"
              aria-expanded={showNotifications}
              onClick={() => { setShowNotifications((open) => !open); setShowProfileMenu(false) }}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
            >
              <Bell className="h-5 w-5" />
              {pendingRows.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">{pendingRows.length > 99 ? '99+' : pendingRows.length}</span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-lg">
                <strong className="text-slate-800">Notifications</strong>
                {pendingRows.length > 0 ? (
                  <div className="mt-2">
                    <p className="font-bold text-red-600">⚠️ {pendingRows.length} Bilty Pending hai</p>
                    <p className="text-slate-500">Total Pending: {money(pendingRows.reduce((s, r) => s + Number(r.grand_total || 0), 0))}</p>
                    <p className="mt-1 text-slate-500">Payment aaye to Pending se Clear kar do.</p>
                  </div>
                ) : (
                  <p className="mt-2 text-slate-500">Koi Pending Bilty nahi hai. Sab Clear hai ✅</p>
                )}
              </div>
            )}
          </div>
          <div className="relative flex items-center gap-2 border-l border-slate-200 pl-3">
            <button
              type="button"
              aria-expanded={showProfileMenu}
              onClick={() => { setShowProfileMenu((open) => !open); setShowNotifications(false) }}
              className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-slate-100"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                {(currentUser?.username || (isAdminUser ? 'Admin' : title)).slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden text-xs font-semibold capitalize text-slate-700 sm:inline">
                {isAdminUser ? 'Admin' : currentUser?.username || title}
              </span>
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => navigate(isAdminUser ? '/admin/users' : branchPath('user-management'))}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50"
                >
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => navigate(isAdminUser ? '/admin/settings' : branchPath('settings'))}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50"
                >
                  Settings
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {trackError && (
        <div role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-800">
          {trackError}
        </div>
      )}
      {trackResult && (
        <div role="dialog" aria-modal="true" aria-labelledby="tracking-result-title" className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
          <section className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="tracking-result-title" className="text-lg font-bold text-slate-900">Tracking details</h2>
                <p className="mt-1 text-sm text-slate-500">LR / Bilty {trackResult.lr_no}</p>
              </div>
              <button type="button" aria-label="Close tracking details" onClick={() => setTrackResult(null)} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">×</button>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <dt className="text-slate-500">Status</dt><dd className="font-semibold text-slate-900">{trackResult.status || 'Unknown'}</dd>
              <dt className="text-slate-500">From</dt><dd className="text-slate-900">{trackResult.from_name || '—'}</dd>
              <dt className="text-slate-500">To</dt><dd className="text-slate-900">{trackResult.to_name || '—'}</dd>
              <dt className="text-slate-500">Consignee</dt><dd className="text-slate-900">{trackResult.consignee_name || '—'}</dd>
              <dt className="text-slate-500">POD Status</dt><dd className="text-slate-900">{trackResult.pod_status || '—'}</dd>
            </dl>
          </section>
        </div>
      )}

      <nav aria-label="Main navigation" className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-1 px-3 py-2">
          {menuItems.map((category) => (
            <div key={category.label} className="relative">
              <button
                type="button"
                aria-expanded={activeMenu === category.label}
                onClick={() => setActiveMenu(activeMenu === category.label ? '' : category.label)}
                className={`flex items-center gap-1 rounded-md px-3 py-2 text-xs font-semibold hover:bg-blue-50 hover:text-blue-700 ${activeMenu === category.label ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
              >
                {category.label}<ChevronDown className="h-3 w-3" />
              </button>
              {activeMenu === category.label && (
                <div className="absolute left-0 top-full z-20 mt-1 min-w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {category.items.filter((item) => !item.adminOnly || isAdmin).map((item) => item.action === 'refresh' ? (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => { setRefreshKey((key) => key + 1); setActiveMenu('') }}
                      className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <Link
                      key={item.label}
                      to={branchPath(item.path)}
                      onClick={() => setActiveMenu('')}
                      className="block px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        {statsUnavailable && (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Dashboard statistics are temporarily unavailable because the database could not be queried.
          </div>
        )}

        <section aria-labelledby="quick-actions-title">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h1 id="quick-actions-title" className="text-lg font-bold text-slate-900">Quick Actions</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            {quickActions.map(({ label, path, icon: Icon, color, adminOnly }) => (
              !adminOnly || isAdmin ? <Link
                key={label}
                to={branchPath(path)}
                className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors ${color}`}
              >
                <Icon className="h-4 w-4" />+ {label}
              </Link> : null
            ))}
          </div>
        </section>

        <section aria-label="Dashboard statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link to={branchPath('bookings/list?filter=today')} className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Today&apos;s Booking</p>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{number(getStat('today_lr', 'todaysBooking'))} <span className="text-sm font-medium text-slate-500">Bilties</span></p>
            <p className="mt-2 text-sm text-slate-600">Today&apos;s Revenue <strong className="text-slate-900">{money(getStat('today_revenue'))}</strong></p>
          </Link>
          <Link to={branchPath('bookings/list?filter=month')} className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">This Month&apos;s Booking</p>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{number(getStat('month_lr', 'monthlyBooking'))} <span className="text-sm font-medium text-slate-500">Bilties</span></p>
            <p className="mt-2 text-sm text-slate-600">Month&apos;s Revenue <strong className="text-slate-900">{money(getStat('month_revenue'))}</strong></p>
          </Link>
          <Link to={branchPath('billing/pending')} className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Pending Amount</p>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{money(getStat('pending_amount', 'pendingAmount'))}</p>
            <div className="mt-3 grid grid-cols-2 gap-y-2 text-xs text-slate-600">
              <span>Pending Bilties <strong>{number(getStat('pending_lr'))}</strong></span>
              <span>Bills <strong>{number(getStat('pending_bills'))}</strong></span>
              <span>Money Receipts <strong>{number(getStat('total_mr'))}</strong></span>
              <span>Gadi Challans <strong>{number(getStat('total_gadi_challan'))}</strong></span>
            </div>
          </Link>
          <Link to={branchPath('fleet/status')} className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Fleet &amp; Network Status</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>Active Vehicles <strong>{number(getStat('active_vehicles'))}</strong></p>
              <p>Active Drivers <strong>{number(getStat('active_drivers'))}</strong></p>
              <p>Branches <strong>{number(isBranchDashboard ? 1 : getStat('total_branches'))}</strong></p>
              <p>Pending POD <strong>{number(getStat('pending_pod'))}</strong> Deliveries</p>
            </div>
          </Link>
        </section>

        {monthlyStatsError ? (
          <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {monthlyStatsError}
          </div>
        ) : (
          <MonthlyStatsCharts bills={monthlyStats.bills} bilties={monthlyStats.bilties} />
        )}

        {isAdmin && <BranchPaymentStatus />}

        <section aria-labelledby="pending-amounts-title" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex gap-2">
            <button type="button" onClick={() => setBillTab('pending')} className={`rounded-full px-4 py-2 text-sm font-bold ${billTab === 'pending' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Pending Bilty ({pendingRows.length})</button>
            <button type="button" onClick={() => setBillTab('cleared')} className={`rounded-full px-4 py-2 text-sm font-bold ${billTab === 'cleared' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Cleared Bilty ({clearedBills.length})</button>
          </div>
          {billTab === 'cleared' ? (
            <div>
              <h2 className="mb-2 text-base font-bold text-slate-900">Cleared Bilty</h2>
              {clearedError ? (
                <p className="text-sm text-amber-800">{clearedError}</p>
              ) : clearedBills.length === 0 ? (
                <p className="text-sm text-slate-500">Abhi koi Bilty Clear nahi hui hai.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {clearedBills.map((entry) => (
                    <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{entry.lr_no || 'Bilty'} <span className="font-normal text-slate-500">· {entry.consignor_name || entry.consignee_name || 'Customer not specified'}</span></p>
                        <p className="text-xs text-slate-500">Cleared on: {entry.cleared_at || 'Today'}{entry.cleared_by ? ` · By: ${entry.cleared_by}` : ''}{entry.branch_code ? ` · ${entry.branch_code}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <strong className="text-sm text-green-700">{money(entry.grand_total)}</strong>
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">✓ Cleared</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
          <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 id="pending-amounts-title" className="text-base font-bold text-slate-900">Bilty</h2>
            <span className="text-xs text-slate-500">Showing up to 100 unpaid bilties</span>
            {loading && <span className="text-xs text-slate-500">Updating…</span>}
          </div>
          {pendingError ? (
            <p role="alert" className="text-sm text-amber-800">{pendingError}</p>
          ) : pendingRows.length === 0 ? (
            <p className="text-sm text-slate-500">No pending bilty amounts found.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingRows.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{entry.lr_no || 'Bilty'} <span className="font-normal text-slate-500">· {entry.consignor_name || entry.consignee_name || 'Customer not specified'}</span></p>
                    {(() => { const st = getBiltyBillingStatus(entry); return (<><span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cls}`}><span className={`h-2 w-2 rounded-full ${st.dot}`} />{st.label}</span><p className="mt-1 text-[11px] text-slate-500">{st.sub}</p></>) })()}
                    <p className="text-xs text-slate-500">{entry.lr_date || 'Date unavailable'}{entry.branch_code ? ` · ${entry.branch_code}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <strong className="text-sm text-red-700">{money(entry.grand_total)}</strong>
                    {canClearPending && (
                      <button
                        type="button"
                        onClick={() => setPendingToClear(entry)}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />Clear
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
          )}
        </section>

        <section aria-label="Bill Box" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex gap-2">
            <button type="button" onClick={() => setBillBoxTab('pending')} className={`rounded-full px-4 py-2 text-sm font-bold ${billBoxTab === 'pending' ? 'bg-yellow-500 text-white' : 'bg-slate-100 text-slate-700'}`}>Pending Bills ({pendingBillsBox.length})</button>
            <button type="button" onClick={() => setBillBoxTab('cleared')} className={`rounded-full px-4 py-2 text-sm font-bold ${billBoxTab === 'cleared' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Cleared Bills ({clearedBillsBox.length})</button>
          </div>
          <h2 className="mb-2 text-base font-bold text-slate-900">Bill</h2>
          {(billBoxTab === 'pending' ? pendingBillsBox : clearedBillsBox).length === 0 ? (
            <p className="text-sm text-slate-500">{billBoxTab === 'pending' ? 'No pending bills.' : 'No cleared bills.'}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {(billBoxTab === 'pending' ? pendingBillsBox : clearedBillsBox).map((b) => (
                <div key={b.id || b.bill_no || b.invoice_no} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <button type="button" onClick={() => setViewBill(b)} className="text-left font-semibold text-blue-700 underline hover:text-blue-900">
                      {b.bill_no || b.invoice_no || b.bill_number}
                    </button>
                    <span className="font-normal text-slate-500"> · Bilty No: {b.lr_no || (Array.isArray(b.items) ? b.items.map((i) => i.lr_no).join(', ') : '') || '—'} · {b.party_name || b.customer_name || b.consignor_name || ''}</span>
                    <br />
                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${billBoxTab === 'cleared' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>{billBoxTab === 'cleared' ? 'Payment Received ✅' : 'Bill Done - Payment Pending'}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-sm text-slate-900">{money(b.grand_total || b.total_amount || b.amount)}</strong>
                    <button type="button" onClick={() => setViewBill(b)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100">
                      👁 View Bill
                    </button>
                    <button type="button" onClick={() => navigate(openBillUrl(b))} className="inline-flex items-center gap-1 rounded-md border border-purple-200 px-2.5 py-1.5 text-xs font-semibold text-purple-800 hover:bg-purple-50">
                      ↗ Bill List me kholo
                    </button>
                    {canClearPending && (
                      <button type="button" onClick={() => { setLinkingBill(b); setLinkLrNo(b.lr_no || '') }} className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-50">
                        🔗 Link Bilty
                      </button>
                    )}
                    {billBoxTab === 'pending' && canClearPending && (
                      <button type="button" onClick={() => setBillToClear(b)} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50">
                        <CheckCircle2 className="h-4 w-4" />Clear
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Stationery &amp; Printed Books Stock (Remaining)</h2>
            {loading && <span className="text-xs text-slate-500">Updating…</span>}
            <Link
              to={isBranchDashboard ? branchPath('stationery-stock') : '/admin/stationery-stock'}
              className="ml-auto text-sm font-semibold text-blue-700 hover:underline"
            >
              {isBranchDashboard ? 'View & request stock' : 'Manage stock'}
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stationeryTypes.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-xs font-bold tracking-wide text-slate-600">{item.label}</span>
                <span className="text-sm font-bold text-slate-900">{stockBalance(item)}</span>
              </div>
            ))}
          </div>
        </section>
        {isBranchDashboard && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">Bilty / Bill Series Status</h2>
              <Link to={branchPath('stationery-stock')} className="text-sm font-semibold text-blue-700 hover:underline">Manage series</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    {['Branch Name', 'Series Type', 'Series Start', 'Series End', 'Last Used', 'Next Number', 'Remaining', 'Status'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documentSeriesStatus.map(row => (
                    <tr key={`${row.branch_id}-${row.series_type}`}>
                      <td className="px-3 py-3 font-semibold">{row.branch_name} ({row.branch_code})</td>
                      <td className="px-3 py-3">{row.series_type === 'bilty' ? 'Bilty' : 'Bill'}</td>
                      <td className="px-3 py-3">{row.series_start || '—'}</td>
                      <td className="px-3 py-3">{row.series_end || '—'}</td>
                      <td className="px-3 py-3">{row.last_used || '—'}</td>
                      <td className="px-3 py-3 font-semibold">{row.next_number || '—'}</td>
                      <td className="px-3 py-3">{row.remaining ?? '—'}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                          row.status === 'Khatam' ? 'bg-red-100 text-red-700'
                            : row.status === 'Khatam Hone Wala' ? 'bg-amber-100 text-amber-800'
                              : row.status === 'Active' ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-600'
                        }`}>{row.status}</span>
                      </td>
                    </tr>
                  ))}
                  {!documentSeriesStatus.length && <tr><td colSpan={8} className="px-3 py-5 text-center text-slate-500">Series status is currently unavailable.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
      {pendingToClear && (
        <div role="dialog" aria-modal="true" aria-labelledby="clear-pending-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4">
          <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="clear-pending-title" className="text-lg font-bold text-slate-900">Clear pending amount?</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Are you sure you want to clear the pending amount for {pendingToClear.lr_no} ({money(pendingToClear.grand_total)})?
                  This marks the bilty as cleared; it does not create a payment receipt.
                </p>
              </div>
              <button type="button" aria-label="Close confirmation" disabled={clearingPending} onClick={() => setPendingToClear(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={clearingPending} onClick={() => setPendingToClear(null)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
              <button type="button" disabled={clearingPending} onClick={clearPendingAmount} className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                {clearingPending ? 'Clearing…' : 'Confirm clear'}
              </button>
            </div>
          </section>
        </div>
      )}
      {billToClear && (
        <div role="dialog" aria-modal="true" aria-labelledby="clear-bill-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4">
          <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="clear-bill-title" className="text-lg font-bold text-slate-900">Clear bill?</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Are you sure you want to clear Bill {billToClear.bill_no} ({money(billToClear.grand_total)})?
                  Sirf Bill Cleared me jayega, Bilty ko kuch nahi hoga.
                </p>
              </div>
              <button type="button" aria-label="Close confirmation" disabled={clearingBill} onClick={() => setBillToClear(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={clearingBill} onClick={() => setBillToClear(null)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
              <button type="button" disabled={clearingBill} onClick={clearBillAmount} className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                {clearingBill ? 'Clearing…' : 'Confirm clear'}
              </button>
            </div>
          </section>
        </div>
      )}
      {linkingBill && (
        <div role="dialog" aria-modal="true" aria-labelledby="link-bilty-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4">
          <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="link-bilty-title" className="text-lg font-bold text-slate-900">Bill ko Bilty se Link karo</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Bill <b>{linkingBill.bill_no}</b> kis Bilty ka hai? Bilty Number likho. Jaise - BTC-12307
                  <br />Party naam se nahi, SIRF Bilty Number se jodega, taaki 10 Bilty me confusion na ho.
                </p>
              </div>
              <button type="button" disabled={linking} onClick={() => { setLinkingBill(null); setLinkLrNo('') }} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mt-4 block text-sm font-semibold text-slate-700">Bilty Number / LR No</label>
            <input value={linkLrNo} onChange={(e) => setLinkLrNo(e.target.value)} placeholder="BTC-12307" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <p className="mt-2 text-xs text-slate-500">Dashboard me maujood Bilty Number hi likhna hai.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={linking} onClick={() => { setLinkingBill(null); setLinkLrNo('') }} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
              <button type="button" disabled={linking || !linkLrNo.trim()} onClick={linkBillToBilty} className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                {linking ? 'Linking…' : 'Link kar do'}
              </button>
            </div>
          </section>
        </div>
      )}
      {viewBill && (
        <div role="dialog" aria-modal="true" aria-labelledby="view-bill-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4">
          <section className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="view-bill-title" className="text-lg font-bold text-slate-900">Bill Details</h2>
                <p className="mt-1 text-sm text-slate-500">Is Bill ka pura detail yahi dikh jayega</p>
              </div>
              <button type="button" onClick={() => setViewBill(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <dt className="text-slate-500">Bill No</dt><dd className="font-bold text-slate-900">{viewBill.bill_no || viewBill.invoice_no || viewBill.bill_number || '—'}</dd>
              <dt className="text-slate-500">Party</dt><dd className="font-bold text-slate-900">{viewBill.party_name || viewBill.customer_name || viewBill.consignor_name || viewBill.consignee_name || '—'}</dd>
              <dt className="text-slate-500">Bilty No / LR No</dt><dd className="font-bold text-slate-900">{viewBill.lr_no || viewBill.bilty_no || (Array.isArray(viewBill.items) ? viewBill.items.map((i) => i.lr_no).filter(Boolean).join(', ') : '') || '— (Abhi Link nahi hua)'}</dd>
              <dt className="text-slate-500">Bill Date</dt><dd className="text-slate-900">{viewBill.bill_date || viewBill.date || viewBill.created_at || '—'}</dd>
              <dt className="text-slate-500">Amount</dt><dd className="font-bold text-slate-900">{money(viewBill.grand_total || viewBill.total_amount || viewBill.amount)}</dd>
              <dt className="text-slate-500">Balance / Pending</dt><dd className="font-bold text-red-700">{money(billBalance(viewBill))}</dd>
              <dt className="text-slate-500">Status</dt><dd className="font-bold text-slate-900">{billBalance(viewBill) <= 0 ? 'Payment Clear ✅' : 'Payment Pending'}</dd>
              <dt className="text-slate-500">Branch</dt><dd className="text-slate-900">{viewBill.branch_code || viewBill.branch_name || branchSlug || '—'}</dd>
            </dl>
            {Array.isArray(viewBill.items) && viewBill.items.length > 0 && (
              <div className="mt-4 border-t border-slate-200 pt-3">
                <p className="text-sm font-bold text-slate-900">Bill Items ({viewBill.items.length})</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {viewBill.items.map((it, idx) => (
                    <li key={idx} className="flex justify-between gap-2"><span>{it.description || it.item_name || it.lr_no || `Item ${idx + 1}`}</span><span className="font-semibold">{money(it.amount || it.total || it.grand_total)}</span></li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setViewBill(null)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Band karo
              </button>
              <button type="button" onClick={() => { setViewBill(null); navigate(openBillUrl(viewBill)) }} className="rounded-md bg-purple-700 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-800">
                ↗ Bill List me kholo
              </button>
              <button type="button" onClick={() => { setLinkingBill(viewBill); setLinkLrNo(viewBill.lr_no || ''); setViewBill(null) }} className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800">
                🔗 Link Bilty
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
