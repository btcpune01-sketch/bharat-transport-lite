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
  'bill-list': BillList,
  'bill-print': BillPrint,
  'gadi-challan': GadiChallan,
  'gate-pass': GatePass,
  'branch-transfer': Transit,
  'vehicle-tracking': TrackBilty,
  'pod': POD,
  'pod-list': POD,
  'stock-report': StockManagement,
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
  'user-management': Users,
  'backup': Backup,
  'admin': Settings,
  'settings': Settings,
  'reports': Reports,
  'stationery-stock': StockManagement,
  'branch-profile': Branches,
}

function BranchModuleRoute() {
  const { module, branchCode, id } = useParams()
  const Page = module === 'money-receipt' && id === 'create' ? MRCreate : branchPages[module]
  if (Page) {
    return module === 'dashboard'
      ? <Page branch={branchCode} isMainAdmin={false} />
      : <Page branchMode branchCode={branchCode} />
  }
  return <BranchFeatureNotice title={module ? module.replaceAll('-', ' ') : 'Module'} branchCode={branchCode} />
}

function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth()
  const location = useLocation()
  try {
    const branchSession = JSON.parse(localStorage.getItem('branch_session') || 'null')
    if (branchSession?.token && branchSession.branch?.url_slug) {
      const slug = branchSession.branch.url_slug
      if (!location.pathname.startsWith('/branch/')) {
         return <Navigate to={`/branch/${slug}/dashboard`} replace />
      }
    }
  } catch (error) {
    localStorage.removeItem('branch_session')
  }
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef2f7' }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-red-700 border-t-transparent mb-4"></div>
          <h2 className="text-xl font-bold text-gray-700">Loading...</h2>
        </div>
      </div>
    )
  }
  return currentUser ? children : <Navigate to="/login" replace />
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
          <Route path="/branch/:branchSlug" element={<TMSDashboard isMainAdmin={false} />} />

          {/* --- FIXED BRANCH LAYOUT ROUTES - Nested with Outlet --- */}
          <Route path="/branch/:branchCode" element={<BranchLayout />}>
            <Route path="dashboard" element={<TMSDashboard isMainAdmin={false} />} />
            <Route path=":module" element={<BranchModuleRoute />} />
            <Route path=":module/:id" element={<BranchModuleRoute />} />
          </Route>

          <Route path="/" element={<PrivateRoute><TMSDashboard branch="global" isMainAdmin showAllBranchesSelector /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><TMSDashboard branch="global" isMainAdmin showAllBranchesSelector /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><TMSDashboard branch="global" isMainAdmin showAllBranchesSelector /></PrivateRoute>} />
          <Route path="/admin/dashboard" element={<PrivateRoute><TMSDashboard branch="global" isMainAdmin showAllBranchesSelector /></PrivateRoute>} />
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
