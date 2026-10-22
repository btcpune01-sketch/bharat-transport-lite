import axios from 'axios'

// ✅ FIX: Monorepo Setup - Use current domain (Empty string = same origin)
const API_URL = import.meta.env.VITE_API_URL || ''

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
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
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
  getAll: (params) => api.get('/api/customers', { params }), getOne: (id) => api.get(`/api/customers/${id}`),
  create: (data) => api.post('/api/customers', data), update: (id, data) => api.put(`/api/customers/${id}`, data), delete: (id) => api.delete(`/api/customers/${id}`)
}

export const branchAPI = {
  getAll: (params) => api.get('/api/branches', { params }), getOne: (id) => api.get(`/api/branches/${id}`),
  create: (data) => api.post('/api/branches', data), update: (id, data) => api.put(`/api/branches/${id}`, data), delete: (id) => api.delete(`/api/branches/${id}`)
}

export const branchPaymentsAPI = {
  getAll: (params) => api.get('/api/branch-payments', { params }),
  getSummary: (params) => api.get('/api/branch-payments/summary', { params }),
  create: (data) => api.post('/api/branch-payments', data),
  getLedger: (params) => api.get('/api/branch-payments/ledger', { params })
}

export const driverAPI = {
  getAll: (params) => api.get('/api/drivers', { params }), getOne: (id) => api.get(`/api/drivers/${id}`),
  create: (data) => api.post('/api/drivers', data), update: (id, data) => api.put(`/api/drivers/${id}`, data), delete: (id) => api.delete(`/api/drivers/${id}`)
}

export const vehicleAPI = {
  getAll: (params) => api.get('/api/vehicles', { params }), getOne: (id) => api.get(`/api/vehicles/${id}`),
  create: (data) => api.post('/api/vehicles', data), update: (id, data) => api.put(`/api/vehicles/${id}`, data), delete: (id) => api.delete(`/api/vehicles/${id}`)
}

export const itemAPI = {
  getAll: (params) => api.get('/api/items', { params }), getOne: (id) => api.get(`/api/items/${id}`),
  create: (data) => api.post('/api/items', data), update: (id, data) => api.put(`/api/items/${id}`, data), delete: (id) => api.delete(`/api/items/${id}`)
}

export const biltyAPI = {
  getAll: (params) => api.get('/api/consignments', { params }), getNextNumber: () => api.get('/api/consignments/next-number'),
  getById: (id) => api.get(`/api/consignments/${id}`), getOne: (lr_no) => api.get(`/api/consignments/${lr_no}`),
  search: (query) => api.get('/api/consignments', { params: { search: query } }),
  getByBranch: (branch) => api.get('/api/consignments', { params: { branch } }),
  create: (data) => api.post('/api/consignments', data), update: (id, data) => api.put(`/api/consignments/${id}`, data),
  updateStatus: (id, data) => api.patch(`/api/consignments/${id}/status`, data), delete: (id) => api.delete(`/api/consignments/${id}`)
}

export const billAPI = {
  getAll: (params) => api.get('/api/bills', { params }), getOne: (bill_no) => api.get(`/api/bills/${bill_no}`),
  create: (data) => api.post('/api/bills', data), update: (id, data) => api.put(`/api/bills/${id}`, data),
  addPayment: (id, data) => api.post(`/api/bills/${id}/payments`, data), delete: (id) => api.delete(`/api/bills/${id}`)
}

export const podAPI = { getAll: () => api.get('/api/pod'), getByLR: (lr_no) => api.get(`/api/pod/${lr_no}`), create: (data) => api.post('/api/pod', data) }
export const ewayAPI = { getAll: () => api.get('/api/eway-bills'), create: (data) => api.post('/api/eway-bills', data) }
export const whatsappAPI = { getAll: () => api.get('/api/notifications'), send: (data) => api.post('/api/notifications/whatsapp', data) }
export const tripAPI = { getAll: (params) => api.get('/api/trips', { params }), getOne: (id) => api.get(`/api/trips/${id}`), create: (data) => api.post('/api/trips', data), update: (id, data) => api.put(`/api/trips/${id}`, data), delete: (id) => api.delete(`/api/trips/${id}`) }
export const tripExpenseAPI = { getAll: (params) => api.get('/api/trip-expenses', { params }), create: (data) => api.post('/api/trip-expenses', data), delete: (id) => api.delete(`/api/trip-expenses/${id}`) }
export const driverAdvanceAPI = { getAll: (params) => api.get('/api/driver-advances', { params }), create: (data) => api.post('/api/driver-advances', data) }
export const paymentAPI = { getAll: (params) => api.get('/api/payments', { params }), create: (data) => api.post('/api/payments', data), delete: (id) => api.delete(`/api/payments/${id}`) }
export const vendorPaymentAPI = { getAll: () => api.get('/api/vendor-payments'), create: (data) => api.post('/api/vendor-payments', data) }
export const ledgerAPI = { get: (customer_id) => api.get(`/api/ledger/${customer_id}`), create: (data) => api.post('/api/ledger', data) }
export const expenseAPI = { getAll: (params) => api.get('/api/expenses', { params }), create: (data) => api.post('/api/expenses', data), delete: (id) => api.delete(`/api/expenses/${id}`) }
export const stockAPI = { getItems: () => api.get('/api/stock/items'), createItem: (data) => api.post('/api/stock/items', data), getCurrent: (params) => api.get('/api/stock/current', { params }), getTransactions: (params) => api.get('/api/stock/transactions', { params }), addIn: (data) => api.post('/api/stock/in', data), getAlerts: (params) => api.get('/api/stock/alerts', { params }), markAlertRead: (id) => api.patch(`/api/stock/alerts/${id}/read`) }

export const dashboardAPI = {
  getStats: (params) => api.get('/api/dashboard/stats', { params }),
  recentBilties: (params) => api.get('/api/dashboard/recent', { params }),
  getRecentActivities: (params) => api.get('/api/dashboard/recent', { params }),
  topParties: (params) => api.get('/api/dashboard/top-parties', { params }),
  getDashboardStats: (params) => api.get('/api/dashboard/stats', { params }),
  getTopParties: (params) => api.get('/api/dashboard/top-parties', { params }),
  revenueChart: () => api.get('/api/dashboard/revenue-chart'),
  lrChart: () => api.get('/api/dashboard/lr-chart')
}

export const reportAPI = { monthly: (params) => api.get('/api/reports/monthly', { params }), outstanding: () => api.get('/api/accounts/summary'), pendingLR: () => api.get('/api/reports/pending-lr'), partyWise: (params) => api.get('/api/reports/party-wise', { params }), branchWise: (params) => api.get('/api/reports/branch-wise', { params }), gst: (params) => api.get('/api/reports/gst', { params }), vehicleWise: (params) => api.get('/api/reports/vehicle-wise', { params }), driverWise: () => api.get('/api/reports/driver-wise') }
export const settingsAPI = { getAll: (params) => api.get('/api/settings', { params }), get: (key) => api.get(`/api/settings/${key}`), update: (key, value) => api.put(`/api/settings/${key}`, { value }), updateBulk: (data) => api.put('/api/settings', data) }
export const auditAPI = { getAll: () => api.get('/api/audit') }
export const trackAPI = { track: (lr_no) => api.get(`/api/consignments/track?lr_no=${lr_no}`) }

export default api
export { API_URL }
