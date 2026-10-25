import axios from 'axios'
import { autoBackup } from './utils/autoBackup'

// Use the shared /api route for the backend service.
const API_URL = import.meta.env.VITE_API_URL || '/api'

console.info('API base URL:', API_URL || 'Current Domain (Same Origin)')

function getActiveBranchSession() {
  const match = window.location.hash.match(/^#\/branch\/([^/?#]+)/)
  if (!match) return null
  try {
    const session = JSON.parse(localStorage.getItem('branch_session') || 'null')
    const slug = decodeURIComponent(match[1])
    if (!session?.token || session.branch?.url_slug !== slug) return null
    return { ...session, slug }
  } catch (error) {
    console.error('Unable to read the saved branch session:', error)
    return null
  }
}

axios.interceptors.request.use((config) => {
  const session = getActiveBranchSession()
  if (session) {
    config.headers.Authorization = `Bearer ${session.token}`
    config.headers['X-Branch-Slug'] = session.slug
  }
  return config
})

const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } })

api.interceptors.request.use((config) => {
  const branchSession = getActiveBranchSession()
  if (branchSession) config.headers['X-Branch-Slug'] = branchSession.slug
  const token = branchSession?.token || localStorage.getItem('token')
  if (token && (branchSession || !config.headers.Authorization)) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toLowerCase()
    if (method && method !== 'get' && !response.config.url?.startsWith('/auth/')) {
      autoBackup.debouncedSave()
    }
    return response
  },
  (error) => {
    const isLoginRequest = error.config?.url?.split('?')[0] === '/auth/login'
    if (error.response?.status === 401 && !isLoginRequest) {
      const branchSession = getActiveBranchSession()
      if (branchSession) {
        localStorage.removeItem('branch_session')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.hash = `#/branch-login/${encodeURIComponent(branchSession.slug)}`
        return Promise.reject(error)
      }
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.hash = '#/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  changePassword: (old_password, new_password) => api.post('/auth/change-password', { old_password, new_password })
}

export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }), getOne: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data), update: (id, data) => api.put(`/customers/${id}`, data), delete: (id) => api.delete(`/customers/${id}`)
}

export const branchAPI = {
  getAll: (params) => api.get('/branches', { params }), getOne: (id) => api.get(`/branches/${id}`),
  create: (data) => api.post('/branches', data), update: (id, data) => api.put(`/branches/${id}`, data), delete: (id) => api.delete(`/branches/${id}`)
}

export const branchPaymentsAPI = {
  getAll: (params) => api.get('/branch-payments', { params }),
  getSummary: (params) => api.get('/branch-payments/summary', { params }),
  create: (data) => api.post('/branch-payments', data),
  getLedger: (params) => api.get('/branch-payments/ledger', { params })
}

export const driverAPI = {
  getAll: (params) => api.get('/drivers', { params }), getOne: (id) => api.get(`/drivers/${id}`),
  create: (data) => api.post('/drivers', data), update: (id, data) => api.put(`/drivers/${id}`, data), delete: (id) => api.delete(`/drivers/${id}`)
}

export const vehicleAPI = {
  getAll: (params) => api.get('/vehicles', { params }), getOne: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post('/vehicles', data), update: (id, data) => api.put(`/vehicles/${id}`, data), delete: (id) => api.delete(`/vehicles/${id}`)
}

export const itemAPI = {
  getAll: (params) => api.get('/items', { params }), getOne: (id) => api.get(`/items/${id}`),
  create: (data) => api.post('/items', data), update: (id, data) => api.put(`/items/${id}`, data), delete: (id) => api.delete(`/items/${id}`)
}

export const biltyAPI = {
  getAll: (params) => api.get('/consignments', { params }), getNextNumber: () => api.get('/consignments/next-number'),
  getById: (id) => api.get(`/consignments/${id}`), getOne: (lr_no) => api.get(`/consignments/${lr_no}`),
  search: (query) => api.get('/consignments', { params: { search: query } }),
  getByBranch: (branch) => api.get('/consignments', { params: { branch } }),
  create: (data) => api.post('/consignments', data), update: (id, data) => api.put(`/consignments/${id}`, data),
  updateStatus: (id, data) => api.patch(`/consignments/${id}/status`, data), delete: (id) => api.delete(`/consignments/${id}`)
}

export const billAPI = {
  getAll: (params) => api.get('/bills', { params }), getOne: (bill_no) => api.get(`/bills/${bill_no}`),
  create: (data) => api.post('/bills', data), update: (id, data) => api.put(`/bills/${id}`, data),
  addPayment: (id, data) => api.post(`/bills/${id}/payments`, data), delete: (id) => api.delete(`/bills/${id}`)
}

export const podAPI = { getAll: () => api.get('/pod'), getByLR: (lr_no) => api.get(`/pod/${lr_no}`), create: (data) => api.post('/pod', data) }
export const ewayAPI = { getAll: () => api.get('/eway-bills'), create: (data) => api.post('/eway-bills', data) }
export const whatsappAPI = { getAll: () => api.get('/notifications'), send: (data) => api.post('/notifications/whatsapp', data) }
export const tripAPI = { getAll: (params) => api.get('/trips', { params }), getOne: (id) => api.get(`/trips/${id}`), create: (data) => api.post('/trips', data), update: (id, data) => api.put(`/trips/${id}`, data), delete: (id) => api.delete(`/trips/${id}`) }
export const tripExpenseAPI = { getAll: (params) => api.get('/trip-expenses', { params }), create: (data) => api.post('/trip-expenses', data), delete: (id) => api.delete(`/trip-expenses/${id}`) }
export const driverAdvanceAPI = { getAll: (params) => api.get('/driver-advances', { params }), create: (data) => api.post('/driver-advances', data) }
export const paymentAPI = { getAll: (params) => api.get('/payments', { params }), create: (data) => api.post('/payments', data), delete: (id) => api.delete(`/payments/${id}`) }
export const vendorPaymentAPI = { getAll: () => api.get('/vendor-payments'), create: (data) => api.post('/vendor-payments', data) }
export const ledgerAPI = { get: (customer_id) => api.get(`/ledger/${customer_id}`), create: (data) => api.post('/ledger', data) }
export const expenseAPI = { getAll: (params) => api.get('/expenses', { params }), create: (data) => api.post('/expenses', data), delete: (id) => api.delete(`/expenses/${id}`) }
export const stockAPI = { getItems: () => api.get('/stock/items'), createItem: (data) => api.post('/stock/items', data), getCurrent: (params) => api.get('/stock/current', { params }), getTransactions: (params) => api.get('/stock/transactions', { params }), addIn: (data) => api.post('/stock/in', data), getAlerts: (params) => api.get('/stock/alerts', { params }), markAlertRead: (id) => api.patch(`/stock/alerts/${id}/read`) }

export const dashboardAPI = {
  getStats: (params) => api.get('/dashboard/stats', { params: normalizeDashboardParams(params) }),
  recentBilties: (params) => api.get('/dashboard/recent', { params: normalizeDashboardParams(params) }),
  getRecentActivities: (params) => api.get('/dashboard/recent', { params: normalizeDashboardParams(params) }),
  topParties: (params) => api.get('/dashboard/top-parties', { params }),
  getDashboardStats: (branchSlug, branchId) => api.get('/dashboard/stats', {
    params: normalizeDashboardParams({ branch: branchSlug, branch_id: branchId })
  }),
  getDashboardRecentActivities: (branchSlug, branchId) => api.get('/dashboard/recent', {
    params: normalizeDashboardParams({ branch: branchSlug, branch_id: branchId })
  }),
  getTopParties: (params) => api.get('/dashboard/top-parties', { params }),
  revenueChart: () => api.get('/dashboard/revenue-chart'),
  lrChart: () => api.get('/dashboard/lr-chart')
}

function normalizeDashboardParams(params = {}) {
  const normalized = { ...params }
  if (normalized.branch === 'global') delete normalized.branch
  else if (normalized.branch !== undefined && normalized.branch !== null) {
    normalized.branch = String(normalized.branch || 'ahmedabad').trim().toLowerCase()
  }

  if (normalized.branch_id !== undefined && normalized.branch_id !== null && normalized.branch_id !== 'all') {
    const digits = String(normalized.branch_id).split(':')[0].replace(/[^0-9]/g, '')
    const branchId = Number.parseInt(digits, 10)
    normalized.branch_id = Number.isSafeInteger(branchId) && branchId > 0
      ? branchId
      : normalized.branch ? 1 : undefined
  } else if (normalized.branch_id === 'all') {
    delete normalized.branch_id
  }

  if (normalized.branch_id === undefined) delete normalized.branch_id
  return normalized
}

export const reportAPI = { monthly: (params) => api.get('/reports/monthly', { params }), outstanding: () => api.get('/accounts/summary'), pendingLR: () => api.get('/reports/pending-lr'), partyWise: (params) => api.get('/reports/party-wise', { params }), branchWise: (params) => api.get('/reports/branch-wise', { params }), gst: (params) => api.get('/reports/gst', { params }), vehicleWise: (params) => api.get('/reports/vehicle-wise', { params }), driverWise: () => api.get('/reports/driver-wise') }
export const settingsAPI = { getAll: (params) => api.get('/settings', { params }), get: (key) => api.get(`/settings/${key}`), update: (key, value) => api.put(`/settings/${key}`, { value }), updateBulk: (data) => api.put('/settings', data) }
export const auditAPI = { getAll: () => api.get('/audit') }
export const trackAPI = { track: (lr_no) => api.get(`/consignments/track?lr_no=${lr_no}`) }

export default api
export { API_URL }
