import { HashRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { autoBackup } from './utils/autoBackup'

const TMSDashboard = lazy(() => import('./pages/dashboard/TMSDashboard'))
const Consignments = lazy(() => import('./pages/Consignments'))
const BiltyEntry = lazy(() => import('./pages/BiltyEntry'))
const BillEntry = lazy(() => import('./pages/BillEntry'))
const BillList = lazy(() => import('./pages/BillList'))
const BillPrint = lazy(() => import('./pages/BillPrint'))
const Customers = lazy(() => import('./pages/Customers'))
const PartyList = lazy(() => import('./pages/PartyList'))
const PartyEntry = lazy(() => import('./pages/PartyEntry'))
const GatePass = lazy(() => import('./pages/GatePass'))
const GadiChallan = lazy(() => import('./pages/GadiChallan'))
const GadiChallanPrint = lazy(() => import('./pages/GadiChallanPrint'))
const Reports = lazy(() => import('./pages/Reports'))
const TrackBilty = lazy(() => import('./pages/TrackBilty'))
const Login = lazy(() => import('./pages/Login'))
const BiltyPrint = lazy(() => import('./pages/BiltyPrint'))
const MR = lazy(() => import('./pages/MR'))
const MRCreate = lazy(() => import('./pages/MRCreate'))
const MRPrint = lazy(() => import('./pages/MRPrint'))
const Audit = lazy(() => import('./pages/Audit'))
const Branches = lazy(() => import('./pages/Branches'))
const POD = lazy(() => import('./pages/POD'))
const PODUpload = lazy(() => import('./pages/PODUpload'))
const PODView = lazy(() => import('./pages/PODView'))
const Drivers = lazy(() => import('./pages/Drivers'))
const Transit = lazy(() => import('./pages/Transit'))
const Vehicles = lazy(() => import('./pages/Vehicles'))
const Trips = lazy(() => import('./pages/Trips'))
const Rates = lazy(() => import('./pages/Rates'))
const Accounts = lazy(() => import('./pages/Accounts'))
const EwayBill = lazy(() => import('./pages/EwayBill'))
const Claims = lazy(() => import('./pages/Claims'))
const Users = lazy(() => import('./pages/Users'))
const BranchUserManagement = lazy(() => import('./pages/BranchUserManagement'))
const BranchStationeryStock = lazy(() => import('./pages/branch/StationeryStockBranch'))
const StationeryStockAdmin = lazy(() => import('./pages/admin/StationeryStockAdmin'))
const Backup = lazy(() => import('./pages/Backup'))
const BranchPayments = lazy(() => import('./pages/BranchPayments'))
const BranchPaymentsSummary = lazy(() => import('./pages/BranchPaymentsSummary'))
const Settings = lazy(() => import('./pages/Settings'))
const StockManagement = lazy(() => import('./pages/StockManagement'))
const VehicleExpiring = lazy(() => import('./pages/VehicleExpiring'))
const BranchLoginPage = lazy(() => import('./pages/BranchLoginPage'))
const Ledger = lazy(() => import('./pages/Ledger'))
const Outstanding = lazy(() => import('./pages/Outstanding'))
const Commissions = lazy(() => import('./pages/Commissions'))
const Expenses = lazy(() => import('./pages/Expenses'))
const BranchLayout = lazy(() => import('./components/BranchLayout'))
const BranchFeatureNotice = lazy(() => import('./pages/BranchFeatureNotice'))

// --- ALL 40 MODULES MAPPED ---
const branchPages = {
  'dashboard': TMSDashboard,
  'bilty-entry': BiltyEntry,
  'consignments': Consignments,
  'bilty-print': BiltyPrint,
  'bill-entry': BillEntry,
  'bill-edit': BillEntry,
  'edit-bill': BillEntry,
  'bill-list': BillList,
  'bill-print': BillPrint,
  'gadi-challan': GadiChallan,
  'gate-pass': GatePass,
  'branch-transfer': Transit,
  'vehicle-tracking': TrackBilty,
  'pod': POD,
  'pod-list': POD,
  'stock-report': BranchStationeryStock,
  'stock-entry': StockManagement,
  'diesel-entry': StockManagement,
  'diesel-report': StockManagement,
  'commission': Commissions,
  'commission-report': Commissions,
  'money-receipt': MR,
  'payment-entry': BranchPayments,
  'to-pay-report': Outstanding,
  'outstanding': Outstanding,
  'challan-payment': BranchPayments,
  'profit-loss': Reports,
  'cash-book': Accounts,
  'ledger': Ledger,
  'gst': EwayBill,
  'tds': Accounts,
  'expense': Expenses,
  'income': Accounts,
  'customer-master': Customers,
  'supplier': PartyList,
  'driver': Drivers,
  'vehicle': Vehicles,
  'tyre': Vehicles,
  'rate-master': Rates,
  'city-master': Branches,
  'notification': Reports,
  'support': Reports,
  'user-management': BranchUserManagement,
  'backup': Backup,
  'admin': Settings,
  'settings': Settings,
  'reports': Reports,
  'stationery-stock': BranchStationeryStock,
  'branch-profile': Branches,
  'bookings': Consignments,
  'booking-list': Consignments,
  'party-master': PartyList,
  'party-entry': PartyEntry,
  'party': PartyList,
  'customers': Customers,
  'customer-ledger': Ledger,
  'delivery': POD,
  'delivery-entry': POD,
  'pending-delivery': POD,
  'pod-upload': PODUpload,
  'pod-view': PODView,
  'public-pod-view': PODView,
  'pod-report': POD,
  'delivery-report': Reports,
  'party-wise-report': Reports,
  'paid-report': Reports,
  'day-book': Accounts,
  'profit-report': Reports,
  'branch-wise-report': Reports,
  'all-reports': Reports,
  'vehicle-challan-list': GadiChallan,
  'gate-pass-list': GatePass,
  'branch-transfer-list': Transit,
  'fleet-status': Vehicles,
  'trips': Trips,
  'manifests': Transit,
  'rates': Rates,
  'track': TrackBilty,
  'eway-bills': EwayBill,
  'vehicles': Vehicles,
  'accounts': Accounts,
  'expenses': Expenses,
  'commissions': Commissions,
  'claims': Claims,
  'branch-portal': Branches,
  'branch-payments': BranchPayments,
  'branch-payments-summary': BranchPaymentsSummary,
  'bills': BillList,
}

function BranchModuleRoute() {
  const { module, branchCode, id } = useParams()
  const { currentUser } = useAuth()
  const normalizedModule = module === 'bill-edit' || module === 'edit-bill' ? 'bill-entry' : module
  const Page = normalizedModule === 'money-receipt' && id === 'create' ? MRCreate : branchPages[normalizedModule] || branchPages[module]
  if (Page) {
    if (module === 'stock-entry' && ['branch', 'branch_user'].includes(currentUser?.role)) {
      return <BranchStationeryStock branchCode={branchCode} />
    }
    return module === 'dashboard'
      ? <Page branch={branchCode} isMainAdmin={false} />
      : <Page branchMode branchCode={branchCode} />
  }
  return <BranchFeatureNotice title={module ? module.replaceAll('-', ' ') : 'Module'} branchCode={branchCode} />
}

function LoadingSpinner() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef2f7' }}>
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-red-700 border-t-transparent mb-4"></div>
        <h2 className="text-xl font-bold text-gray-700">Loading...</h2>
      </div>
    </div>
  )
}

function normalizeBranchSlug(v) {
  return String(v || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function getBranchSession() {
  try {
    const s = JSON.parse(localStorage.getItem('branch_session') || 'null')
    if (s?.token && (s.branch?.url_slug || s.branch?.branch_code || s.branch?.branch_slug)) return s
  } catch (e) {
    localStorage.removeItem('branch_session')
  }
  return null
}

function getBranchSlugFromSession(s) {
  return s?.branch?.url_slug || s?.branch?.branch_code || s?.branch?.branch_slug || ''
}

function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingSpinner />

  if (!currentUser) {
    const s = getBranchSession()
    if (s) {
      if (location.pathname.startsWith('/branch/')) return children
      const slug = getBranchSlugFromSession(s)
      const path = location.pathname
      const billEdit = path.match(/^\/bill-edit\/([^/]+)/)
      if (billEdit) return <Navigate to={`/branch/${slug}/bill-entry/${billEdit[1]}`} replace />
      const billEdit2 = path.match(/^\/bill\/edit\/([^/]+)/)
      if (billEdit2) return <Navigate to={`/branch/${slug}/bill-entry/${billEdit2[1]}`} replace />
      const billPrint = path.match(/^\/bills\/([^/]+)\/print/)
      if (billPrint) return <Navigate to={`/branch/${slug}/bill-print/${billPrint[1]}`} replace />
      const billPrint2 = path.match(/^\/bill-print\/([^/]+)/)
      if (billPrint2) return <Navigate to={`/branch/${slug}/bill-print/${billPrint2[1]}`} replace />
      if (path === '/bill-entry' || path === '/bills/new' || path === '/bill/new') return <Navigate to={`/branch/${slug}/bill-entry`} replace />
      if (path === '/bills' || path === '/bill/list') return <Navigate to={`/branch/${slug}/bill-list`} replace />
      return <Navigate to={`/branch/${slug}/dashboard`} replace />
    }
    return <Navigate to="/login" replace />
  }

  if (currentUser.role !== 'admin') {
    const s = getBranchSession()
    if (s && !location.pathname.startsWith('/branch/')) {
      const slug = getBranchSlugFromSession(s)
      const path = location.pathname
      const billEdit = path.match(/^\/bill-edit\/([^/]+)/)
      if (billEdit) return <Navigate to={`/branch/${slug}/bill-entry/${billEdit[1]}`} replace />
      const billPrint = path.match(/^\/bills\/([^/]+)\/print/)
      if (billPrint) return <Navigate to={`/branch/${slug}/bill-print/${billPrint[1]}`} replace />
      return <Navigate to={`/branch/${slug}/dashboard`} replace />
    }
  }
  return children
}

function BranchOnly({ children }) {
  const { currentUser, loading } = useAuth()
  const { branchSlug, branchCode } = useParams()
  const slug = branchSlug || branchCode
  if (loading) return <LoadingSpinner />

  if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') {
    return <Navigate to="/dashboard" replace />
  }

  if (currentUser && ['branch', 'branch_user'].includes(currentUser.role)) {
    return children
  }

  const s = getBranchSession()
  if (s) {
    const sessionSlugs = [s.branch?.url_slug, s.branch?.branch_code, s.branch?.branch_name, s.branch?.branch_slug].map(normalizeBranchSlug).filter(Boolean)
    const urlSlug = normalizeBranchSlug(slug)
    if (!slug || sessionSlugs.includes(urlSlug) || sessionSlugs.some((k) => k.includes(urlSlug) || urlSlug.includes(k))) return children
    return <Navigate to={`/branch/${getBranchSlugFromSession(s)}/dashboard`} replace />
  }

  return <Navigate to={slug ? `/branch-login/${slug}` : '/login'} replace />
}

function BranchSlugRedirect() {
  const { branchSlug } = useParams()
  return <Navigate to={`/branch/${branchSlug}/dashboard`} replace />
}

function AdminOnly({ children }) {
  const { currentUser } = useAuth()
  return currentUser?.role === 'admin' ? children : <Navigate to="/dashboard" replace />
}

function LoadingFallback() {
  return (
    <div style={{ padding: '50px', textAlign: 'center', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef2f7' }}>
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-red-700 border-t-transparent mb-4"></div>
        <h2 className="text-xl font-bold text-gray-700">Loading Bharat Transport...</h2>
      </div>
    </div>
  )
}

function App() {
  const { currentUser } = useAuth()

  useEffect(() => {
    if (currentUser?.role !== 'admin') return undefined
    return autoBackup.initAutoSave()
  }, [currentUser?.role])

  return (
    <HashRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/track" element={<TrackBilty />} />
          <Route path="/consignments/track" element={<TrackBilty />} />
          <Route path="/bilty-print/:id?" element={<BiltyPrint />} />
          <Route path="/mr/print" element={<MRPrint />} />
          <Route path="/mr-print/:id?" element={<MRPrint />} />
          <Route path="/gadi-challan-print/:id?" element={<GadiChallanPrint />} />
          <Route path="/pod-upload" element={<PODUpload />} />
          <Route path="/pod-view" element={<PODView />} />
          <Route path="/public/pod-view" element={<PODView />} />
          <Route path="/branch-login" element={<Navigate to="/login" replace />} />
          <Route path="/branch-login/:slug" element={<BranchLoginPage />} />
          <Route path="/branch-portal" element={<PrivateRoute><Branches /></PrivateRoute>} />
          <Route path="/branch/:branchSlug" element={<BranchOnly><BranchSlugRedirect /></BranchOnly>} />

          <Route path="/branch/:branchCode" element={<BranchOnly><BranchLayout /></BranchOnly>}>
            <Route path="dashboard" element={<TMSDashboard isMainAdmin={false} />} />
            <Route path=":module" element={<BranchModuleRoute />} />
            <Route path=":module/:id" element={<BranchModuleRoute />} />
          </Route>

          <Route path="/" element={<PrivateRoute><TMSDashboard branch="global" isMainAdmin showAllBranchesSelector /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><TMSDashboard branch="global" isMainAdmin showAllBranchesSelector /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><AdminOnly><TMSDashboard branch="global" isMainAdmin showAllBranchesSelector /></AdminOnly></PrivateRoute>} />
          <Route path="/admin/dashboard" element={<PrivateRoute><AdminOnly><TMSDashboard branch="global" isMainAdmin showAllBranchesSelector /></AdminOnly></PrivateRoute>} />
          <Route path="/admin/branches" element={<PrivateRoute><AdminOnly><Branches /></AdminOnly></PrivateRoute>} />
          <Route path="/admin/backup" element={<PrivateRoute><AdminOnly><Backup /></AdminOnly></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute><AdminOnly><Users /></AdminOnly></PrivateRoute>} />
          <Route path="/admin/stationery-stock" element={<PrivateRoute><AdminOnly><StationeryStockAdmin /></AdminOnly></PrivateRoute>} />
          <Route path="/admin/settings" element={<PrivateRoute><AdminOnly><Settings /></AdminOnly></PrivateRoute>} />
          <Route path="/admin/audit" element={<PrivateRoute><AdminOnly><Audit /></AdminOnly></PrivateRoute>} />
          <Route path="/admin/database" element={<PrivateRoute><AdminOnly><Backup /></AdminOnly></PrivateRoute>} />
          <Route path="/admin/all-branches" element={<PrivateRoute><AdminOnly><TMSDashboard branch="global" isMainAdmin showAllBranchesSelector /></AdminOnly></PrivateRoute>} />
          <Route path="/bookings/list" element={<PrivateRoute><Consignments /></PrivateRoute>} />
          <Route path="/billing/pending" element={<PrivateRoute><Outstanding /></PrivateRoute>} />
          <Route path="/fleet/status" element={<PrivateRoute><Vehicles /></PrivateRoute>} />
          <Route path="/consignments" element={<PrivateRoute><Consignments /></PrivateRoute>} />
          <Route path="/consignments/new" element={<PrivateRoute><BiltyEntry /></PrivateRoute>} />
          <Route path="/eway-bills" element={<PrivateRoute><EwayBill /></PrivateRoute>} />
          <Route path="/consignments/:id/edit" element={<PrivateRoute><BiltyEntry /></PrivateRoute>} />
          <Route path="/consignment/:id/edit" element={<PrivateRoute><BiltyEntry /></PrivateRoute>} />
          <Route path="/bills" element={<PrivateRoute><BillList /></PrivateRoute>} />
          <Route path="/bills/:id/print" element={<PrivateRoute><BillPrint /></PrivateRoute>} />
          <Route path="/bill-entry" element={<PrivateRoute><BillEntry /></PrivateRoute>} />
          <Route path="/bill-edit/:id" element={<PrivateRoute><BillEntry /></PrivateRoute>} />
          <Route path="/bill-print" element={<PrivateRoute><BillPrint /></PrivateRoute>} />
          <Route path="/bill-print/:id" element={<PrivateRoute><BillPrint /></PrivateRoute>} />
          <Route path="/bill/new" element={<PrivateRoute><BillEntry /></PrivateRoute>} />
          <Route path="/bills/new" element={<PrivateRoute><BillEntry /></PrivateRoute>} />
          <Route path="/bill/edit/:id" element={<PrivateRoute><BillEntry /></PrivateRoute>} />
          <Route path="/bill/list" element={<PrivateRoute><BillList /></PrivateRoute>} />
          <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
          <Route path="/parties" element={<PrivateRoute><PartyList /></PrivateRoute>} />
          <Route path="/party" element={<PrivateRoute><PartyList /></PrivateRoute>} />
          <Route path="/party/new" element={<PrivateRoute><PartyEntry /></PrivateRoute>} />
          <Route path="/party/edit/:id" element={<PrivateRoute><PartyEntry /></PrivateRoute>} />
          <Route path="/gate-pass" element={<PrivateRoute><GatePass /></PrivateRoute>} />
          <Route path="/gadi-challan" element={<PrivateRoute><GadiChallan /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
          <Route path="/mr" element={<PrivateRoute><MR /></PrivateRoute>} />
          <Route path="/mr/create" element={<PrivateRoute><MRCreate /></PrivateRoute>} />
          <Route path="/memo/new" element={<PrivateRoute><MRCreate /></PrivateRoute>} />
          <Route path="/audit" element={<PrivateRoute><Audit /></PrivateRoute>} />
          <Route path="/accounts/summary" element={<PrivateRoute><Accounts /></PrivateRoute>} />
          <Route path="/accounts/tds-register" element={<PrivateRoute><Accounts initialTab="tds" /></PrivateRoute>} />
          <Route path="/branches" element={<PrivateRoute><Branches /></PrivateRoute>} />
          <Route path="/pod" element={<PrivateRoute><POD /></PrivateRoute>} />
          <Route path="/transit" element={<PrivateRoute><Transit /></PrivateRoute>} />
          <Route path="/manifests" element={<PrivateRoute><Transit /></PrivateRoute>} />
          <Route path="/drivers" element={<PrivateRoute><Drivers /></PrivateRoute>} />
          <Route path="/vehicles" element={<PrivateRoute><Vehicles /></PrivateRoute>} />
          <Route path="/vehicles/expiring" element={<PrivateRoute><VehicleExpiring /></PrivateRoute>} />
          <Route path="/trips" element={<PrivateRoute><Trips /></PrivateRoute>} />
          <Route path="/rates" element={<PrivateRoute><Rates /></PrivateRoute>} />
          <Route path="/accounts" element={<PrivateRoute><Accounts /></PrivateRoute>} />
          <Route path="/eway" element={<PrivateRoute><EwayBill /></PrivateRoute>} />
          <Route path="/claims" element={<PrivateRoute><Claims /></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/backup" element={<PrivateRoute><Backup /></PrivateRoute>} />
          <Route path="/branch-payments" element={<PrivateRoute><BranchPayments /></PrivateRoute>} />
          <Route path="/branch-payments/summary" element={<PrivateRoute><BranchPaymentsSummary /></PrivateRoute>} />
          <Route path="/stock" element={<PrivateRoute><StockManagement /></PrivateRoute>} />
          <Route path="/ledger" element={<PrivateRoute><Ledger /></PrivateRoute>} />
          <Route path="/outstanding" element={<PrivateRoute><Outstanding /></PrivateRoute>} />
          <Route path="/commissions" element={<PrivateRoute><Commissions /></PrivateRoute>} />
          <Route path="/expenses" element={<PrivateRoute><Expenses /></PrivateRoute>} />

          <Route path="*" element={
            <div style={{padding:'50px',textAlign:'center', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <div>
                <h1 className="text-4xl font-bold text-gray-800 mb-4">404 - Page Not Found</h1>
                <button type="button" onClick={() => window.location.assign('#/')} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block font-medium">Go Home</button>
              </div>
            </div>
          } />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App
