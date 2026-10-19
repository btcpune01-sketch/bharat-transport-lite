import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentBilties, setRecentBilties] = useState([]);
  const [recentMR, setRecentMR] = useState([]);
  const [topParties, setTopParties] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, recentRes, topRes] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.recentBilties(),
          dashboardAPI.topParties()
        ]);
        setStats(statsRes.data);
        setRecentBilties(recentRes.data.bilties || []);
        setRecentMR(recentRes.data.receipts || []);
        setTopParties(topRes.data.data || []);
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ========== 8 CATEGORIES WITH ALL FUNCTIONS ==========
  const categories = [
    {
      id: 'bilty',
      name: 'Bilty/LR',
      icon: '🚚',
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:bg-blue-50',
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
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:bg-green-50',
      functions: [
        { name: 'New Bill', icon: '', path: '/bill-entry' },
        { name: 'Bill List', icon: '', path: '/bills' },
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
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'hover:bg-purple-50',
      functions: [
        { name: 'Customers', icon: '👤', path: '/customers' },
        { name: 'Party List', icon: '', path: '/party' },
        { name: 'New Party', icon: '', path: '/party/new' },
        { name: 'Ledger', icon: '📒', path: '/ledger' },
      ]
    },
    {
      id: 'vehicle',
      name: 'Vehicle & Driver',
      icon: '🚛',
      color: 'from-red-500 to-red-600',
      hoverColor: 'hover:bg-red-50',
      functions: [
        { name: 'Drivers', icon: '👨‍️', path: '/drivers' },
        { name: 'Vehicles', icon: '🚗', path: '/vehicles' },
        { name: 'Trips', icon: '️', path: '/trips' },
        { name: 'Transit', icon: '🔄', path: '/transit' },
        { name: 'Gadi Challan', icon: '', path: '/gadi-challan' },
        { name: 'Gadi Print', icon: '🖨️', path: '/gadi-challan-print' },
      ]
    },
    {
      id: 'branch',
      name: 'Branch',
      icon: '🏢',
      color: 'from-teal-500 to-teal-600',
      hoverColor: 'hover:bg-teal-50',
      functions: [
        { name: 'Branches', icon: '🏬', path: '/branches' },
        { name: 'Gate Pass', icon: '🎫', path: '/gate-pass' },
        { name: 'Branch Portal', icon: '🌐', path: '/branch-portal' },
        { name: 'Branch Login', icon: '🔐', path: '/branch-login' },
      ]
    },
    {
      id: 'accounts',
      name: 'Accounts',
      icon: '',
      color: 'from-indigo-500 to-indigo-600',
      hoverColor: 'hover:bg-indigo-50',
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
      color: 'from-orange-500 to-orange-600',
      hoverColor: 'hover:bg-orange-50',
      functions: [
        { name: 'Reports', icon: '📊', path: '/reports' },
        { name: 'Audit Logs', icon: '📋', path: '/audit' },
        { name: 'Analytics', icon: '📉', path: '/reports' },
        { name: 'Backup', icon: '💾', path: '/backup' },
      ]
    },
    {
      id: 'master',
      name: 'Master Data',
      icon: '⚙️',
      color: 'from-pink-500 to-pink-600',
      hoverColor: 'hover:bg-pink-50',
      functions: [
        { name: 'Freight Rates', icon: '💲', path: '/rates' },
        { name: 'Stock Mgmt', icon: '📦', path: '/stock' },
        { name: 'Users', icon: '', path: '/users' },
        { name: 'Settings', icon: '⚙️', path: '/settings' },
      ]
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Professional Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
              <p className="text-sm text-gray-600 mt-1">Consolidated view - LIVE Auto Update</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-sm text-gray-600">
                {currentTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold opacity-90">Today's LR</h3>
                <span className="text-3xl">🚚</span>
              </div>
              <p className="text-5xl font-bold mb-2">{stats.today_lr || 0}</p>
              <div className="text-sm opacity-90 bg-white bg-opacity-20 rounded-lg px-3 py-1 inline-block">
                Month: {stats.month_lr || 0} | Total: {stats.total_lr || 0}
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold opacity-90">Today's Revenue</h3>
                <span className="text-3xl">💰</span>
              </div>
              <p className="text-5xl font-bold mb-2">{(stats.today_revenue || 0).toLocaleString()}</p>
              <div className="text-sm opacity-90 bg-white bg-opacity-20 rounded-lg px-3 py-1 inline-block">
                Month: ₹{(stats.month_revenue || 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold opacity-90">Pending Amount</h3>
                <span className="text-3xl">⏳</span>
              </div>
              <p className="text-5xl font-bold mb-2">₹{(stats.pending_amount || 0).toLocaleString()}</p>
              <div className="text-sm opacity-90 bg-white bg-opacity-20 rounded-lg px-3 py-1 inline-block">
                Pending LR: {stats.pending_lr || 0}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold opacity-90">Total Revenue</h3>
                <span className="text-3xl">📊</span>
              </div>
              <p className="text-5xl font-bold mb-2">₹{(stats.total_revenue || 0).toLocaleString()}</p>
              <div className="text-sm opacity-90 bg-white bg-opacity-20 rounded-lg px-3 py-1 inline-block">
                Paid Bilties: {stats.paid_lr || 0}
              </div>
            </div>
          </div>
        )}

        {/* 8 Category Icons - Single Line */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">🎯</span> Quick Access Modules
          </h2>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-300 ${category.hoverColor} border-2 ${
                  expandedCategory === category.id ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-3xl mb-2">{category.icon}</span>
                <span className="text-xs font-semibold text-gray-700 text-center">{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Expanded Category Functions */}
        {expandedCategory && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 animate-fadeIn">
            {categories.map((category) => {
              if (category.id !== expandedCategory) return null;
              return (
                <div key={category.id}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-xl font-bold text-white bg-gradient-to-r ${category.color} px-4 py-2 rounded-lg`}>
                      {category.icon} {category.name} - Functions
                    </h3>
                    <button
                      onClick={() => setExpandedCategory(null)}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {category.functions.map((func, idx) => (
                      <button
                        key={idx}
                        onClick={() => navigate(func.path)}
                        className="flex flex-col items-center justify-center p-4 rounded-lg bg-gray-50 hover:bg-blue-50 hover:shadow-md transition-all duration-200 border border-gray-200"
                      >
                        <span className="text-2xl mb-2">{func.icon}</span>
                        <span className="text-xs font-medium text-gray-700 text-center">{func.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Monthly Report & Recent Bilties - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Report */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2"></span> Monthly Report Summary
            </h2>
            {stats && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Total Bilties (Month)</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.month_lr || 0}</p>
                  </div>
                  <span className="text-4xl">🚚</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-green-600">₹{(stats.month_revenue || 0).toLocaleString()}</p>
                  </div>
                  <span className="text-4xl">💰</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Pending Amount</p>
                    <p className="text-2xl font-bold text-orange-600">₹{(stats.pending_amount || 0).toLocaleString()}</p>
                  </div>
                  <span className="text-4xl">⏳</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Paid Bilties</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.paid_lr || 0}</p>
                  </div>
                  <span className="text-4xl">✅</span>
                </div>
              </div>
            )}
          </div>

          {/* Recent Bilties */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">📋</span> Recent 5 Bilties - LIVE
            </h2>
            {recentBilties.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-5xl">📭</span>
                <p className="text-gray-500 mt-3">No recent bilties</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBilties.map((bilty) => (
                  <div key={bilty.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-semibold text-blue-600">{bilty.lr_no}</p>
                      <p className="text-xs text-gray-600">{bilty.from_name} → {bilty.to_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{parseInt(bilty.grand_total || 0).toLocaleString()}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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

        {/* Top Parties */}
        {topParties.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">🏆</span> Top 5 Parties by Revenue
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {topParties.map((party, idx) => (
                <div key={idx} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
                  <div className="text-2xl mb-2">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏅'}</div>
                  <p className="font-semibold text-gray-900 text-sm">{party.consignor_name}</p>
                  <p className="text-xs text-gray-600 mt-1">{party.total_bilties} bilties</p>
                  <p className="text-lg font-bold text-orange-600 mt-2">₹{parseInt(party.total_revenue || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Money Receipts */}
        {recentMR.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">💵</span> Recent Money Receipts
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">MR No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Party</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentMR.map((mr) => (
                    <tr key={mr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">{mr.mr_no}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{mr.party_name}</td>
                      <td className="px-4 py-3 text-sm font-bold text-green-600">₹{parseInt(mr.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {mr.payment_mode}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
