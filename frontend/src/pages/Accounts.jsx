import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '../utils/dateFormatter'

export default function Accounts() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [tdsData, setTdsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      const headers = { 'Authorization': `Bearer ${token}` }

      const resSummary = await fetch(`${apiUrl}/api/accounts/summary`, { headers })
      if (resSummary.ok) {
        const data = await resSummary.json()
        setSummary(data.data)
      }

      const resTds = await fetch(`${apiUrl}/api/accounts/tds-register`, { headers })
      if (resTds.ok) {
        const data = await resTds.json()
        setTdsData(data.data || [])
      }
    } catch (err) {
      console.error('Accounts fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return '₹' + parseFloat(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
          <p className="mt-4 text-gray-500">Loading Accounts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-emerald-700 to-emerald-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="bg-white/20 p-2 rounded-lg hover:bg-white/30">← Back</button>
            <div>
              <h1 className="font-bold text-xl">🏦 Advanced Accounting & Finance</h1>
              <p className="text-xs text-emerald-200">Ledger, TDS, P&L, and Balance Sheet Overview</p>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-3 font-bold text-sm rounded-t-lg transition-colors ${activeTab === 'dashboard' ? 'bg-white text-emerald-700 border-t border-l border-r border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📊 Financial Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('tds')}
            className={`px-6 py-3 font-bold text-sm rounded-t-lg transition-colors ${activeTab === 'tds' ? 'bg-white text-emerald-700 border-t border-l border-r border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📑 TDS Register
          </button>
        </div>

        {activeTab === 'dashboard' && summary && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow p-6 border-l-4 border-red-500">
                <div className="text-gray-500 text-sm font-medium mb-1">Total Receivable (Unpaid)</div>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.total_receivable)}</div>
                <div className="text-xs text-gray-400 mt-2">From Consignments</div>
              </div>
              <div className="bg-white rounded-xl shadow p-6 border-l-4 border-orange-500">
                <div className="text-gray-500 text-sm font-medium mb-1">Total Payable (Pending)</div>
                <div className="text-2xl font-bold text-orange-600">{formatCurrency(summary.total_payable)}</div>
                <div className="text-xs text-gray-400 mt-2">To Vendors/Drivers</div>
              </div>
              <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
                <div className="text-gray-500 text-sm font-medium mb-1">Total Revenue (Paid)</div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_revenue)}</div>
                <div className="text-xs text-gray-400 mt-2">Realized Income</div>
              </div>
              <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
                <div className="text-gray-500 text-sm font-medium mb-1">Net Profit (Est.)</div>
                <div className={`text-2xl font-bold ${summary.net_profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.net_profit)}
                </div>
                <div className="text-xs text-gray-400 mt-2">Revenue - Expenses</div>
              </div>
            </div>

            {/* Secondary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">💰 Expense Overview</h3>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Total Expenses Incurred</span>
                  <span className="font-bold text-gray-800">{formatCurrency(summary.total_expenses)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">TDS Pending Deduction</span>
                  <span className="font-bold text-purple-600">{formatCurrency(summary.tds_pending)}</span>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-6 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">📈</div>
                  <p className="font-bold text-gray-700">Full Balance Sheet & P&L</p>
                  <p className="text-sm text-gray-500 mt-1">Available in Reports Module</p>
                  <button onClick={() => navigate('/reports')} className="mt-4 px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-bold hover:bg-emerald-800">
                    Go to Reports
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tds' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">📑 TDS Deduction Register</h2>
              <div className="text-sm text-gray-500">Total Entries: {tdsData.length}</div>
            </div>

            {tdsData.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <div className="text-4xl mb-3">📑</div>
                <p className="font-medium">No TDS deductions recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 text-left font-bold text-gray-600">Challan No</th>
                      <th className="p-4 text-left font-bold text-gray-600">Date</th>
                      <th className="p-4 text-left font-bold text-gray-600">Broker / Vendor</th>
                      <th className="p-4 text-right font-bold text-gray-600">Freight Amount</th>
                      <th className="p-4 text-right font-bold text-gray-600">TDS Deducted</th>
                      <th className="p-4 text-right font-bold text-gray-600">Net Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tdsData.map((row, idx) => (
                      <tr key={idx} className="border-t hover:bg-emerald-50/30 transition-colors">
                        <td className="p-4 font-bold text-emerald-700">{row.challan_no}</td>
                        <td className="p-4">{row.issue_date ? formatDate(row.issue_date) : '-'}</td>
                        <td className="p-4 font-medium">{row.broker_name || 'N/A'}</td>
                        <td className="p-4 text-right">{formatCurrency(row.freight_amount)}</td>
                        <td className="p-4 text-right font-bold text-purple-600">{formatCurrency(row.tds_deduction)}</td>
                        <td className="p-4 text-right font-bold text-gray-800">{formatCurrency(row.net_payable)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
