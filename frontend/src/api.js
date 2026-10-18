import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://bharat-transport-api.onrender.com'

console.info('API base URL:', API_URL)

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

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// ============================================
// AUTO ATTACH TOKEN
// ============================================
api.interceptors.request.use((config) => {
  const branchSession = getActiveBranchSession()
  if (branchSession) config.headers['X-Branch-Slug'] = branchSession.slug
  const token = branchSession?.token || localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ============================================
// AUTO LOGOUT ON 401
// ============================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.split('?')[0] === '/api/auth/login'
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

// ============================================
// AUTH API
// ============================================
export const authAPI = {
  login: (username, password) => api.post('/api/auth/login', { username, password }),
  register: (data) => api.post('/api/auth/register', data),
  me: () => api.get('/api/auth/me'),
  changePassword: (old_password, new_password) =>
    api.post('/api/auth/change-password', { old_password, new_password })
}

// ============================================
// CUSTOMER API (Party Master)
// ============================================
export const customerAPI = {
  getAll: (params) => api.get('/api/customers', { params }),
  getOne: (id) => api.get(`/api/customers/${id}`),
  create: (data) => api.post('/api/customers', data),
  update: (id, data) => api.put(`/api/customers/${id}`, data),
  delete: (id) => api.delete(`/api/customers/${id}`)
}

// ============================================
// BRANCH API
// ============================================
export const branchAPI = {
  getAll: (params) => api.get('/api/branches', { params }),
  getOne: (id) => api.get(`/api/branches/${id}`),
  create: (data) => api.post('/api/branches', data),
  update: (id, data) => api.put(`/api/branches/${id}`, data),
  delete: (id) => api.delete(`/api/branches/${id}`)
}

// ============================================
// DRIVER API
// ============================================
export const driverAPI = {
  getAll: (params) => api.get('/api/drivers', { params }),
  getOne: (id) => api.get(`/api/drivers/${id}`),
  create: (data) => api.post('/api/drivers', data),
  update: (id, data) => api.put(`/api/drivers/${id}`, data),
  delete: (id) => api.delete(`/api/drivers/${id}`)
}

// ============================================
// VEHICLE API
// ============================================
export const vehicleAPI = {
  getAll: (params) => api.get('/api/vehicles', { params }),
  getOne: (id) => api.get(`/api/vehicles/${id}`),
  create: (data) => api.post('/api/vehicles', data),
  update: (id, data) => api.put(`/api/vehicles/${id}`, data),
  delete: (id) => api.delete(`/api/vehicles/${id}`)
}

// ============================================
// ITEM API
// ============================================
export const itemAPI = {
  getAll: (params) => api.get('/api/items', { params }),
  getOne: (id) => api.get(`/api/items/${id}`),
  create: (data) => api.post('/api/items', data),
  update: (id, data) => api.put(`/api/items/${id}`, data),
  delete: (id) => api.delete(`/api/items/${id}`)
}

// ============================================
// CONSIGNMENT (BILTY / LR) API
// ============================================
export const biltyAPI = {
  getAll: (params) => api.get('/api/consignments', { params }),
  getNextNumber: () => api.get('/api/consignments/next-number'),
  getById: (id) => api.get(`/api/consignments/${id}`),
  getOne: (lr_no) => api.get(`/api/consignments/${lr_no}`),
  create: (data) => api.post('/api/consignments', data),
  update: (id, data) => api.put(`/api/consignments/${id}`, data),
  updateStatus: (id, data) => api.patch(`/api/consignments/${id}/status`, data),
  delete: (id) => api.delete(`/api/consignments/${id}`)
}

// ============================================
// BILL API
// ============================================
export const billAPI = {
  getAll: (params) => api.get('/api/bills', { params }),
  getOne: (bill_no) => api.get(`/api/bills/${bill_no}`),
  create: (data) => api.post('/api/bills', data),
  update: (id, data) => api.put(`/api/bills/${id}`, data),
  addPayment: (id, data) => api.post(`/api/bills/${id}/payments`, data),
  delete: (id) => api.delete(`/api/bills/${id}`)
}

// ============================================
// POD API
// ============================================
export const podAPI = {
  getAll: () => api.get('/api/pod'),
  getByLR: (lr_no) => api.get(`/api/pod/${lr_no}`),
  create: (data) => api.post('/api/pod', data)
}

// ============================================
// E-WAY BILL API
// ============================================
export const ewayAPI = {
  getAll: () => api.get('/api/eway-bills'),
  create: (data) => api.post('/api/eway-bills', data)
}

// ============================================
// WHATSAPP API
// ============================================
export const whatsappAPI = {
  getAll: () => api.get('/api/notifications'),
  send: (data) => api.post('/api/notifications/whatsapp', data)
}

// ============================================
// TRIP API
// ============================================
export const tripAPI = {
  getAll: (params) => api.get('/api/trips', { params }),
  getOne: (id) => api.get(`/api/trips/${id}`),
  create: (data) => api.post('/api/trips', data),
  update: (id, data) => api.put(`/api/trips/${id}`, data),
  delete: (id) => api.delete(`/api/trips/${id}`)
}

// ============================================
// TRIP EXPENSE API
// ============================================
export const tripExpenseAPI = {
  getAll: (params) => api.get('/api/trip-expenses', { params }),
  create: (data) => api.post('/api/trip-expenses', data),
  delete: (id) => api.delete(`/api/trip-expenses/${id}`)
}

// ============================================
// DRIVER ADVANCE API
// ============================================
export const driverAdvanceAPI = {
  getAll: (params) => api.get('/api/driver-advances', { params }),
  create: (data) => api.post('/api/driver-advances', data)
}

// ============================================
// PAYMENT API (Party Receipt)
// ============================================
export const paymentAPI = {
  getAll: (params) => api.get('/api/payments', { params }),
  create: (data) => api.post('/api/payments', data),
  delete: (id) => api.delete(`/api/payments/${id}`)
}

// ============================================
// VENDOR PAYMENT API
// ============================================
export const vendorPaymentAPI = {
  getAll: () => api.get('/api/vendor-payments'),
  create: (data) => api.post('/api/vendor-payments', data)
}

// ============================================
// LEDGER API
// ============================================
export const ledgerAPI = {
  get: (customer_id) => api.get(`/api/ledger/${customer_id}`),
  create: (data) => api.post('/api/ledger', data)
}

// ============================================
// EXPENSE API (Office)
// ============================================
export const expenseAPI = {
  getAll: (params) => api.get('/api/expenses', { params }),
  create: (data) => api.post('/api/expenses', data),
  delete: (id) => api.delete(`/api/expenses/${id}`)
}

// ============================================
// STOCK API
// ============================================
export const stockAPI = {
  getItems: () => api.get('/api/stock/items'),
  createItem: (data) => api.post('/api/stock/items', data),
  getCurrent: (params) => api.get('/api/stock/current', { params }),
  getTransactions: (params) => api.get('/api/stock/transactions', { params }),
  addIn: (data) => api.post('/api/stock/in', data),
  getAlerts: (params) => api.get('/api/stock/alerts', { params }),
  markAlertRead: (id) => api.patch(`/api/stock/alerts/${id}/read`)
}

// ============================================
// DASHBOARD API
// ============================================
export const dashboardAPI = {
  getStats: () => api.get('/api/dashboard/stats'),
  recentBilties: () => api.get('/api/dashboard/recent'),
  topParties: () => api.get('/api/dashboard/top-parties'),
  revenueChart: () => api.get('/api/dashboard/revenue-chart'),
  lrChart: () => api.get('/api/dashboard/lr-chart')
}

// ============================================
// REPORT API
// ============================================
export const reportAPI = {
  monthly: (params) => api.get('/api/reports/monthly', { params }),
  outstanding: () => api.get('/api/accounts/summary'),
  pendingLR: () => api.get('/api/reports/pending-lr'),
  partyWise: (params) => api.get('/api/reports/party-wise', { params }),
  branchWise: (params) => api.get('/api/reports/branch-wise', { params }),
  gst: (params) => api.get('/api/reports/gst', { params }),
  vehicleWise: (params) => api.get('/api/reports/vehicle-wise', { params }),
  driverWise: () => api.get('/api/reports/driver-wise')
}

// ============================================
// SETTINGS API
// ============================================
export const settingsAPI = {
  getAll: (params) => api.get('/api/settings', { params }),
  get: (key) => api.get(`/api/settings/${key}`),
  update: (key, value) => api.put(`/api/settings/${key}`, { value }),
  updateBulk: (data) => api.put('/api/settings', data)
}

// ============================================
// AUDIT LOG API
// ============================================
export const auditAPI = {
  getAll: () => api.get('/api/audit')
}

// ============================================
// PUBLIC TRACKING API (No auth needed)
// ============================================
export const trackAPI = {
  track: (lr_no) => axios.get(`${API_URL}/api/consignments/track?lr_no=${lr_no}`)
}

// ============================================
// EXPORTS
// ============================================
export default api
export { API_URL }
