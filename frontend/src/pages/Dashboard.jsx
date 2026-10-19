import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, branchAPI } from '../api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentBilties, setRecentBilties] = useState([]);
  const [recentMR, setRecentMR] = useState([]);
  const [topParties, setTopParties] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [user, setUser] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch(e) {}
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, recentRes, topRes, branchesRes] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.recentBilties(),
          dashboardAPI.topParties(),
          branchAPI.getAll().catch(() => ({ data: [] }))
        ]);
        
        setStats(statsRes?.data || null);
        setRecentBilties(Array.isArray(recentRes?.data?.bilties) ? recentRes.data.bilties : []);
        setRecentMR(Array.isArray(recentRes?.data?.receipts) ? recentRes.data.receipts : []);
        setTopParties(Array.isArray(topRes?.data?.data) ? topRes.data.data : []);
        setBranches(Array.isArray(branchesRes?.data) ? branchesRes.data : []);
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedBranch]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleBranchChange = (e) => {
    setSelectedBranch(e.target.value);
  };

  const toggleCategory = (id) => {
    setExpandedCategory(expandedCategory === id ? null : id);
  };

  const categories = [
    {
      id: 'bilty',
      name: 'Bilty/LR',
      icon: '',
      gradient: 'from-blue-500 to-blue-700',
      functions: [
        { name: 'New Bilty', icon: '📝', path: '/consignments/new' },
        { name: 'Bilty List', icon: '📋', path: '/consignments' },
        { name: 'Bilty Print', icon: '🖨️', path: '/bilty-print' },
        { name: 'Track Bilty', icon: '📍', path: '/track' },
        { name: 'POD', icon: '✅', path: '/pod' },
        { name: 'POD Upload', icon: '📤', path: '/pod-upload' },
      ]
    },
    {
      id: 'billing',
      name: 'Billing',
      icon: '💰',
      gradient: 'from-emerald-500 to-emerald-700',
      functions: [
        { name: 'New Bill', icon: '', path: '/bill-entry' },
        { name: 'Bill List', icon: '📑', path: '/bills' },
        { name: 'Bill Print', icon: '🖨️', path: '/bill-print' },
        { name: 'Money Receipt', icon: '💵', path: '/mr' },
        { name: 'Create MR', icon: '➕', path: '/mr/create' },
        { name: 'MR Print', icon: '🧾', path: '/mr-print' },
        { name: 'Outstanding', icon: '⏳', path: '/outstanding' },
        { name: 'Payments', icon: '💸', path: '/branch-payments' },
      ]
    },
    {
      id: 'party',
      name: 'Parties',
      icon: '👥',
      gradient: 'from-purple-500 to-purple-700',
      functions: [
        { name: 'Customers', icon: '👤', path: '/customers' },
        { name: 'Party List', icon: '📇', path: '/party' },
        { name: 'New Party', icon: '➕', path: '/party/new' },
        { name: 'Ledger', icon: '📒', path: '/ledger' },
      ]
    },
    {
      id: 'vehicle',
      name: 'Vehicle & Driver',
      icon: '🚛',
      gradient: 'from-red-500 to-red-700',
      functions: [
        { name: 'Drivers', icon: '👨‍️', path: '/drivers' },
        { name: 'Vehicles', icon: '🚗', path: '/vehicles' },
        { name: 'Trips', icon: '🗺️', path: '/trips' },
        { name: 'Transit', icon: '🔄', path: '/transit' },
        { name: 'Gadi Challan', icon: '📄', path: '/gadi-challan' },
        { name: 'Gadi Print', icon: '️', path: '/gadi-challan-print' },
      ]
    },
    {
      id: 'branch',
      name: 'Branch',
      icon: '🏢',
      gradient: 'from-teal-500 to-teal-700',
      functions: [
        { name: 'Branches', icon: '🏬', path: '/branches' },
        { name: 'Gate Pass', icon: '', path: '/gate-pass' },
        { name: 'Branch Portal', icon: '🌐', path: '/branch-portal' },
        { name: 'Branch Login', icon: '🔐', path: '/branch-login' },
      ]
    },
    {
      id: 'accounts',
      name: 'Accounts',
      icon: '💼',
      gradient: 'from-indigo-500 to-indigo-700',
      functions: [
        { name: 'Accounts', icon: '💼', path: '/accounts' },
        { name: 'Expenses', icon: '💰', path: '/expenses' },
        { name: 'Commissions', icon: '💵', path: '/commissions' },
        { name: 'Claims', icon: '📑', path: '/claims' },
        { name: 'E-Way Bill', icon: '🧾', path: '/eway' },
      ]
    },
    {
      id: 'reports',
      name: 'Reports',
      icon: '📈',
      gradient: 'from-orange-500 to-orange-700',
      functions: [
        { name: 'Reports', icon: '', path: '/reports' },
        { name: 'Audit Logs', icon: '📋', path: '/audit' },
        { name: 'Analytics', icon: '📉', path: '/reports' },
        { name: 'Backup', icon: '💾', path: '/backup' },
      ]
    },
    {
      id: 'master',
      name: 'Master Data',
      icon: '⚙️',
      gradient: 'from-pink-500 to-pink-700',
      functions: [
        { name: 'Freight Rates', icon: '', path: '/rates' },
        { name: 'Stock Mgmt', icon: '📦', path: '/stock' },
        { name: 'Users', icon: '👤', path: '/users' },
        { name: 'Settings', icon: '⚙️', path: '/settings' },
      ]
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-6 text-xl text-white font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ===== PROFESSIONAL HEADER ===== */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-2xl border-b-4 border-blue-600 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-3 shadow-lg border-2 border-blue-400">
                <span className="text-3xl font-bold text-white">BTC</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-wide">Bharat Transport Company</h1>
                <p className="text-xs text-blue-300 font-medium tracking-widest">SMART LOGISTICS • QUANTUM SUPPLY CHAIN</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-slate-700 rounded-lg px-3 py-2 border border-slate-600">
                <span className="text-sm"></span>
                <select
                  value={selectedBranch}
                  onChange={handleBranchChange}
                  className="bg-transparent text-white text-sm font-medium outline-none cursor-pointer"
                >
                  <option value="all" className="text-gray-900">All Branches</option>
                  {Array.isArray(branches) && branches.map((branch) => (
                    <option key={branch.id} value={branch.id} className="text-gray-900">
                      {branch.branch_name} ({branch.branch_code})
                    </option>
                  ))}
                </select>
              </div>

              {user && (
                <div className="flex items-center space-x-2 bg-slate-700 rounded-lg px-3 py-2 border border-slate-600">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{(user.username || 'U')[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{user.username || 'User'}</p>
                    <p className="text-xs text-gray-400 capitalize">{user.role || 'operator'}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        
        {/* ===== 1. QUICK ACCESS MODULES - SABSE UPER ===== */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <span className="mr-2">🎯</span> Quick Access Modules
              </h2>
              <p className="text-sm text-gray-500 mt-1">Click any category to view functions</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-sm text-gray-500">
                {currentTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* 8 Buttons in Single Line */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => toggleCategory(category.id)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-300 transform hover:-translate-y-1 ${
                  expandedCategory === category.id
                    ? `bg-gradient-to-br ${category.gradient} text-white shadow-2xl scale-105`
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-3xl mb-2">{category.icon}</span>
                <span className="text-xs font-bold text-center">{category.name}</span>
                <span className={`text-xs mt-1 ${expandedCategory === category.id ? 'text-white' : 'text-gray-500'}`}>
                  {Array.isArray(category.functions) ? category.functions.length : 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ===== EXPANDED CATEGORY FUNCTIONS - 8 ICONS KE NICHE ===== */}
        {expandedCategory && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-2 border-blue-200">
            {categories.map((category) => {
              if (category.id !== expandedCategory) return null;
              return (
                <div key={category.id}>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className={`text-2xl font-bold text-white bg-gradient-to-r ${category.gradient} px-5 py-3 rounded-xl shadow-lg flex items-center`}>
                      <span className="mr-2 text-3xl">{category.icon}</span>
                      {category.name} - Functions
                    </h3>
                    <button
                      onClick={() => setExpandedCategory(null)}
                      className="bg-red-500 hover:bg-red-600 text-white w-10 h-10 rounded-full text-xl font-bold shadow-lg transition-all"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {Array.isArray(category.functions) && category.functions.map((func, idx) => (
                      <button
                        key={idx}
                        onClick={() => navigate(func.path)}
                        className="flex flex-col items-center justify-center p-5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 border-2 border-gray-200 hover:border-blue-400"
                      >
                        <span className="text-3xl mb-2">{func.icon}</span>
                        <span className="text-sm font-bold text-center text-gray-700">{func.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== 2. STATS CARDS ===== */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold opacity-95">Today's LR</h3>
                <span className="text-4xl">🚚</span>
              </div>
              <p className="text-5xl font-bold mb-3">{stats.today_lr || 0}</p>
              <div className="text-sm opacity-90 bg-white bg-opacity-20 rounded-lg px-3 py-1.5 inline-block">
                Month: {stats.month_lr || 0} | Total: {stats.total_lr || 0}
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold opacity-95">Today's Revenue</h3>
                <span className="text-4xl">💰</span>
              </div>
              <p className="text-5xl font-bold mb-3">₹{(stats.today_revenue || 0).toLocaleString()}</p>
              <div className="text-sm opacity-90 bg-white bg-opacity-20 rounded-lg px-3 py-1.5 inline-block">
                Month: ₹{(stats.month_revenue || 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-2xl p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold opacity-95">Pending Amount</h3>
                <span className="text-4xl">⏳</span>
              </div>
              <p className="text-5xl font-bold mb-3">₹{(stats.pending_amount || 0).toLocaleString()}</p>
              <div className="text-sm opacity-90 bg-white bg-opacity-20 rounded-lg px-3 py-1.5 inline-block">
                Pending LR: {stats.pending_lr || 0}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 rounded-2xl p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold opacity-95">Total Revenue</h3>
                <span className="text-4xl"></span>
              </div>
              <p className="text-5xl font-bold mb-3">₹{(stats.total_revenue || 0).toLocaleString()}</p>
              <div className="text-sm opacity-90 bg-white bg-opacity-20 rounded-lg px-3 py-1.5 inline-block">
                Paid Bilties: {stats.paid_lr || 0}
              </div>
            </div>
          </div>
        )}

        {/* ===== 3. MONTHLY REPORT + RECENT BILTIES ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Report */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
              <span className="mr-2">📊</span> Monthly Report Summary
            </h2>
            {stats && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-l-4 border-blue-500">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Bilties (Month)</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.month_lr || 0}</p>
                  </div>
                  <span className="text-5xl opacity-80"></span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl border-l-4 border-emerald-500">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Monthly Revenue</p>
                    <p className="text-3xl font-bold text-emerald-600">₹{(stats.month_revenue || 0).toLocaleString()}</p>
                  </div>
                  <span className="text-5xl opacity-80">💰</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border-l-4 border-orange-500">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Pending Amount</p>
                    <p className="text-3xl font-bold text-orange-600">₹{(stats.pending_amount || 0).toLocaleString()}</p>
                  </div>
                  <span className="text-5xl opacity-80">⏳</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border-l-4 border-purple-500">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Paid Bilties</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.paid_lr || 0}</p>
                  </div>
                  <span className="text-5xl opacity-80">✅</span>
                </div>
              </div>
            )}
          </div>

          {/* Recent Bilties */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
              <span className="mr-2">📋</span> Recent 5 Bilties - LIVE
            </h2>
            {!Array.isArray(recentBilties) || recentBilties.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl">📭</span>
                <p className="text-gray-500 mt-4 text-lg">No recent bilties</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBilties.map((bilty) => (
                  <div key={bilty.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all border border-gray-200">
                    <div className="flex-1">
                      <p className="font-bold text-blue-600 text-lg">{bilty.lr_no}</p>
                      <p className="text-sm text-gray-600">{bilty.from_name} → {bilty.to_name}</p>
                      <p className="text-xs text-gray-500 mt-1">{bilty.consignor_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-lg">{parseInt(bilty.grand_total || 0).toLocaleString()}</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        bilty.status === 'Booked' ? 'bg-green-100 text-green-800' :
                        bilty.status === 'In-Transit' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {bilty.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== 4. TOP PARTIES ===== */}
        {Array.isArray(topParties) && topParties.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
              <span className="mr-2">🏆</span> Top 5 Parties by Revenue
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {topParties.map((party, idx) => (
                <div key={idx} className={`rounded-xl p-4 border-2 ${
                  idx === 0 ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300' :
                  idx === 1 ? 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300' :
                  idx === 2 ? 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300' :
                  'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'
                }`}>
                  <div className="text-3xl mb-2">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏅'}</div>
                  <p className="font-bold text-gray-900 text-sm truncate">{party.consignor_name}</p>
                  <p className="text-xs text-gray-600 mt-1">{party.total_bilties} bilties</p>
                  <p className="text-lg font-bold text-orange-600 mt-2">₹{parseInt(party.total_revenue || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== 5. RECENT MONEY RECEIPTS ===== */}
        {Array.isArray(recentMR) && recentMR.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
              <span className="mr-2">💵</span> Recent Money Receipts
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">MR No</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Party</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Mode</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentMR.map((mr) => (
                    <tr key={mr.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-bold text-blue-600">{mr.mr_no}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium">{mr.party_name}</td>
                      <td className="px-4 py-3 text-sm font-bold text-green-600 text-lg">{parseInt(mr.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                          {mr.payment_mode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{mr.mr_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 pb-4">
          <p className="text-sm text-gray-500">© 2026 Bharat Transport Company. All rights reserved.</p>
          <p className="text-xs text-gray-400 mt-1">Powered by BTC TMS v6.0</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
