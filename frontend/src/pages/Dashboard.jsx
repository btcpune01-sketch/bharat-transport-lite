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
        setStats(statsRes.data);
        setRecentBilties(recentRes.data.bilties || []);
        setRecentMR(recentRes.data.receipts || []);
        setTopParties(topRes.data.data || []);
        setBranches(branchesRes.data || []);
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

  // ========== 8 CATEGORIES WITH ALL FUNCTIONS ==========
  const categories = [
    {
      id: 'bilty',
      name: 'Bilty/LR Management',
      icon: '🚚',
      gradient: 'from-blue-500 to-blue-700',
      bgLight: 'bg-blue-50',
      borderColor: 'border-blue-200',
      functions: [
        { name: 'New Bilty', icon: '📝', path: '/consignments/new', color: 'bg-blue-100 text-blue-700' },
        { name: 'Bilty List', icon: '📋', path: '/consignments', color: 'bg-blue-100 text-blue-700' },
        { name: 'Bilty Print', icon: '️', path: '/bilty-print', color: 'bg-blue-100 text-blue-700' },
        { name: 'Track Bilty', icon: '📍', path: '/track', color: 'bg-blue-100 text-blue-700' },
        { name: 'POD', icon: '✅', path: '/pod', color: 'bg-blue-100 text-blue-700' },
        { name: 'POD Upload', icon: '📤', path: '/pod-upload', color: 'bg-blue-100 text-blue-700' },
      ]
    },
    {
      id: 'billing',
      name: 'Billing & Payments',
      icon: '💰',
      gradient: 'from-emerald-500 to-emerald-700',
      bgLight: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      functions: [
        { name: 'New Bill', icon: '', path: '/bill-entry', color: 'bg-emerald-100 text-emerald-700' },
        { name: 'Bill List', icon: '', path: '/bills', color: 'bg-emerald-100 text-emerald-700' },
        { name: 'Bill Print', icon: '🖨️', path: '/bill-print', color: 'bg-emerald-100 text-emerald-700' },
        { name: 'Money Receipt', icon: '💵', path: '/mr', color: 'bg-emerald-100 text-emerald-700' },
        { name: 'Create MR', icon: '', path: '/mr/create', color: 'bg-emerald-100 text-emerald-700' },
        { name: 'MR Print', icon: '🧾', path: '/mr-print', color: 'bg-emerald-100 text-emerald-700' },
        { name: 'Outstanding', icon: '', path: '/outstanding', color: 'bg-emerald-100 text-emerald-700' },
        { name: 'Payments', icon: '💸', path: '/branch-payments', color: 'bg-emerald-100 text-emerald-700' },
      ]
    },
    {
      id: 'party',
      name: 'Parties & Customers',
      icon: '👥',
      gradient: 'from-purple-500 to-purple-700',
      bgLight: 'bg-purple-50',
      borderColor: 'border-purple-200',
      functions: [
        { name: 'Customers', icon: '👤', path: '/customers', color: 'bg-purple-100 text-purple-700' },
        { name: 'Party List', icon: '', path: '/party', color: 'bg-purple-100 text-purple-700' },
        { name: 'New Party', icon: '', path: '/party/new', color: 'bg-purple-100 text-purple-700' },
        { name: 'Ledger', icon: '📒', path: '/ledger', color: 'bg-purple-100 text-purple-700' },
      ]
    },
    {
      id: 'vehicle',
      name: 'Vehicle & Driver',
      icon: '',
      gradient: 'from-red-500 to-red-700',
      bgLight: 'bg-red-50',
      borderColor: 'border-red-200',
      functions: [
        { name: 'Drivers', icon: '👨‍️', path: '/drivers', color: 'bg-red-100 text-red-700' },
        { name: 'Vehicles', icon: '🚗', path: '/vehicles', color: 'bg-red-100 text-red-700' },
        { name: 'Trips', icon: '️', path: '/trips', color: 'bg-red-100 text-red-700' },
        { name: 'Transit', icon: '🔄', path: '/transit', color: 'bg-red-100 text-red-700' },
        { name: 'Gadi Challan', icon: '', path: '/gadi-challan', color: 'bg-red-100 text-red-700' },
        { name: 'Gadi Print', icon: '🖨️', path: '/gadi-challan-print', color: 'bg-red-100 text-red-700' },
      ]
    },
    {
      id: 'branch',
      name: 'Branch Operations',
      icon: '🏢',
      gradient: 'from-teal-500 to-teal-700',
      bgLight: 'bg-teal-50',
      borderColor: 'border-teal-200',
      functions: [
        { name: 'Branches', icon: '🏬', path: '/branches', color: 'bg-teal-100 text-teal-700' },
        { name: 'Gate Pass', icon: '🎫', path: '/gate-pass', color: 'bg-teal-100 text-teal-700' },
        { name: 'Branch Portal', icon: '🌐', path: '/branch-portal', color: 'bg-teal-100 text-teal-700' },
        { name: 'Branch Login', icon: '🔐', path: '/branch-login', color: 'bg-teal-100 text-teal-700' },
      ]
    },
    {
      id: 'accounts',
      name: 'Accounts & Finance',
      icon: '',
      gradient: 'from-indigo-500 to-indigo-700',
      bgLight: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      functions: [
        { name: 'Accounts', icon: '💼', path: '/accounts', color: 'bg-indigo-100 text-indigo-700' },
        { name: 'Expenses', icon: '💰', path: '/expenses', color: 'bg-indigo-100 text-indigo-700' },
        { name: 'Commissions', icon: '💵', path: '/commissions', color: 'bg-indigo-100 text-indigo-700' },
        { name: 'Claims', icon: '📑', path: '/claims', color: 'bg-indigo-100 text-indigo-700' },
        { name: 'E-Way Bill', icon: '🧾', path: '/eway', color: 'bg-indigo-100 text-indigo-700' },
      ]
    },
    {
      id: 'reports',
      name: 'Reports & Analytics',
      icon: '📈',
      gradient: 'from-orange-500 to-orange-700',
      bgLight: 'bg-orange-50',
      borderColor: 'border-orange-200',
      functions: [
        { name: 'Reports', icon: '📊', path: '/reports', color: 'bg-orange-100 text-orange-700' },
        { name: 'Audit Logs', icon: '', path: '/audit', color: 'bg-orange-100 text-orange-700' },
        { name: 'Analytics', icon: '📉', path: '/reports', color: 'bg-orange-100 text-orange-700' },
        { name: 'Backup', icon: '💾', path: '/backup', color: 'bg-orange-100 text-orange-700' },
      ]
    },
    {
      id: 'master',
      name: 'Master Data & Settings',
      icon: '⚙️',
      gradient: 'from-pink-500 to-pink-700',
      bgLight: 'bg-pink-50',
      borderColor: 'border-pink-200',
      functions: [
        { name: 'Freight Rates', icon: '💲', path: '/rates', color: 'bg-pink-100 text-pink-700' },
        { name: 'Stock Mgmt', icon: '', path: '/stock', color: 'bg-pink-100 text-pink-700' },
        { name: 'Users', icon: '', path: '/users', color: 'bg-pink-100 text-pink-700' },
        { name: 'Settings', icon: '⚙️', path: '/settings', color: 'bg-pink-100 text-pink-700' },
      ]
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-6 text-xl text-white font-medium">Loading Dashboard...</p>
          <p className="text-sm text-gray-400 mt-2">Bharat Transport Company</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ===== PROFESSIONAL HEADER ===== */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-2xl border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: BTC Logo + Company Name */}
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-3 shadow-lg">
                <span className="text-3xl font-bold text-white">BTC</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-wide">Bharat Transport Company</h1>
                <p className="text-xs text-blue-300 font-medium tracking-widest">SMART LOGISTICS • QUANTUM SUPPLY CHAIN</p>
              </div>
            </div>

            {/* Right: Branch Selector + User + Logout */}
            <div className="flex items-center space-x-4">
              {/* Branch Selector */}
              <div className="flex items-center space-x-2 bg-slate-700 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-300"></span>
                <select
                  value={selectedBranch}
                  onChange={handleBranchChange}
                  className="bg-transparent text-white text-sm font-medium outline-none cursor-pointer"
                >
                  <option value="all" className="text-gray-900">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id} className="text-gray-900">
                      {branch.branch_name} ({branch.branch_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* User Info */}
              {user && (
                <div className="flex items-center space-x-2 bg-slate-700 rounded-lg px-3 py-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{(user.username || 'U')[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{user.username || 'User'}</p>
                    <p className="text-xs text-gray-400 capitalize">{user.role || 'operator'}</p>
                  </div>
                </div>
              )}

              {/* Logout Button */}
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
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold opacity-95">Today's LR</h3>
                <span className="text-4xl"></span>
              </div>
              <p className="text-5xl font-bold mb-3">{stats.today_lr || 0}</p>
              <div className="text-sm opacity-90 bg-white bg-opacity-20 rounded-lg px-3 py-1.5 inline-block backdrop-blur-sm">
                Month: {stats.month_lr || 0} | Total: {stats.total_lr || 0}
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold opacity-95">Today's Revenue</h3>
                <span className="text-4xl">💰</span>
              </div>
              <p className="text-5xl font-bold mb-3">₹{(stats.today_revenue || 0).toLocaleString()}</p>
              <div className="text-sm opacity-90 bg-white bg-opacity-20 rounded-lg px-3 py-1.5 inline-block backdrop-blur-sm">
                Month: ₹{(stats.month_revenue || 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-2xl p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold opacity-95">Pending Amount</h3>
                <span className="text-4xl"></span>
              </div>
              <p className="text-5xl font-bold mb-3">₹{(stats.pending_amount || 0).toLocaleString()}</p>
              <div className="text-sm opacity-90 bg-white bg-opacity-20 rounded-lg px-3 py-1.5 inline-block backdrop-blur-sm">
                Pending LR: {stats.pending_lr || 0}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 rounded-2xl p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold opacity-95">Total Revenue</h3>
                <span className="text-4xl">📊</span>
              </div>
              <p className="text-5xl font-bold mb-3">₹{(stats.total_revenue || 0).toLocaleString()}</p>
              <div className="text-sm opacity-90 bg-white bg-opacity-20 rounded-lg px-3 py-1.5 inline-block backdrop-blur-sm">
                Paid Bilties: {stats.paid_lr || 0}
              </div>
            </div>
          </div>
        )}

        {/* ===== QUICK ACCESS MODULES - ALWAYS VISIBLE ===== */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <span className="mr-2">🎯</span> Quick Access Modules
              </h2>
              <p className="text-sm text-gray-500 mt-1">All 45+ features organized by category</p>
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

          {/* All Categories with Functions - Always Visible */}
          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Category Header */}
                <div className={`bg-gradient-to-r ${category.gradient} px-6 py-3 flex items-center justify-between`}>
                  <h3 className="text-white font-bold text-lg flex items-center">
                    <span className="mr-2 text-2xl">{category.icon}</span>
                    {category.name}
                  </h3>
                  <span className="text-white text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                    {category.functions.length} features
                  </span>
                </div>
                {/* Functions Grid */}
                <div className="p-4 bg-gray-50">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {category.functions.map((func, idx) => (
                      <button
                        key={idx}
                        onClick={() => navigate(func.path)}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl ${func.color} hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 border border-transparent hover:border-gray-300`}
                      >
                        <span className="text-2xl mb-2">{func.icon}</span>
                        <span className="text-xs font-semibold text-center">{func.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== MONTHLY REPORT + RECENT BILTIES ===== */}
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
            {recentBilties.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl"></span>
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
                      <p className="font-bold text-gray-900 text-lg">₹{parseInt(bilty.grand_total || 0).toLocaleString()}</p>
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

        {/* ===== TOP PARTIES ===== */}
        {topParties.length > 0 && (
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

        {/* ===== RECENT MONEY RECEIPTS ===== */}
        {recentMR.length > 0 && (
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
                      <td className="px-4 py-3 text-sm font-bold text-green-600 text-lg">₹{parseInt(mr.amount || 0).toLocaleString()}</td>
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
