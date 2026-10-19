import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentBilties, setRecentBilties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, recentRes] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.recentBilties()
        ]);
        setStats(statsRes.data);
        setRecentBilties(recentRes.data.bilties || []);
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ========== ALL 45+ FEATURES ORGANIZED BY CATEGORY ==========
  const dashboardCategories = [
    {
      name: '📊 Dashboard & Reports',
      color: 'from-blue-600 to-blue-700',
      features: [
        { name: 'Dashboard', icon: '', path: '/dashboard' },
        { name: 'Reports', icon: '📈', path: '/reports' },
        { name: 'Audit Logs', icon: '📋', path: '/audit' },
        { name: 'Accounts', icon: '', path: '/accounts' },
        { name: 'Analytics', icon: '📉', path: '/reports' },
      ]
    },
    {
      name: ' Bilty/LR Management',
      color: 'from-green-600 to-green-700',
      features: [
        { name: 'New Bilty', icon: '', path: '/consignments/new' },
        { name: 'Bilty List', icon: '📄', path: '/consignments' },
        { name: 'Bilty Print', icon: '🖨️', path: '/bilty-print' },
        { name: 'Track Bilty', icon: '', path: '/track' },
        { name: 'POD', icon: '✅', path: '/pod' },
        { name: 'POD Upload', icon: '📤', path: '/pod-upload' },
      ]
    },
    {
      name: '💰 Billing & Payments',
      color: 'from-orange-600 to-orange-700',
      features: [
        { name: 'New Bill', icon: '', path: '/bill-entry' },
        { name: 'Bill List', icon: '📋', path: '/bills' },
        { name: 'Bill Print', icon: '🖨️', path: '/bill-print' },
        { name: 'Money Receipt', icon: '💵', path: '/mr' },
        { name: 'Create MR', icon: '', path: '/mr/create' },
        { name: 'MR Print', icon: '🖨️', path: '/mr-print' },
        { name: 'Outstanding', icon: '⏳', path: '/outstanding' },
        { name: 'Branch Payments', icon: '💸', path: '/branch-payments' },
      ]
    },
    {
      name: '👥 Party & Customer',
      color: 'from-purple-600 to-purple-700',
      features: [
        { name: 'Customers', icon: '', path: '/customers' },
        { name: 'Party List', icon: '', path: '/party' },
        { name: 'New Party', icon: '', path: '/party/new' },
        { name: 'Ledger', icon: '📒', path: '/ledger' },
      ]
    },
    {
      name: ' Vehicle & Driver',
      color: 'from-red-600 to-red-700',
      features: [
        { name: 'Drivers', icon: '👨‍️', path: '/drivers' },
        { name: 'Vehicles', icon: '', path: '/vehicles' },
        { name: 'Trips', icon: '️', path: '/trips' },
        { name: 'Transit', icon: '🔄', path: '/transit' },
        { name: 'Gadi Challan', icon: '📄', path: '/gadi-challan' },
        { name: 'Gadi Print', icon: '🖨️', path: '/gadi-challan-print' },
      ]
    },
    {
      name: ' Branch Operations',
      color: 'from-teal-600 to-teal-700',
      features: [
        { name: 'Branches', icon: '🏢', path: '/branches' },
        { name: 'Gate Pass', icon: '🎫', path: '/gate-pass' },
        { name: 'Branch Portal', icon: '🌐', path: '/branch-portal' },
        { name: 'Branch Login', icon: '', path: '/branch-login' },
      ]
    },
    {
      name: '💵 Accounts & Finance',
      color: 'from-indigo-600 to-indigo-700',
      features: [
        { name: 'Expenses', icon: '💰', path: '/expenses' },
        { name: 'Commissions', icon: '💵', path: '/commissions' },
        { name: 'Claims', icon: '📑', path: '/claims' },
        { name: 'E-Way Bill', icon: '🧾', path: '/eway' },
        { name: 'Backup', icon: '💾', path: '/backup' },
      ]
    },
    {
      name: '⚙️ Master Data',
      color: 'from-pink-600 to-pink-700',
      features: [
        { name: 'Freight Rates', icon: '💲', path: '/rates' },
        { name: 'Stock Mgmt', icon: '📦', path: '/stock' },
        { name: 'Users', icon: '👤', path: '/users' },
        { name: 'Settings', icon: '⚙️', path: '/settings' },
      ]
    }
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="text-xl">Loading...</div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard Overview</h1>
          <p className="text-sm text-gray-600 mt-1">Consolidated view - LIVE Auto Update</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Today's LR</h3>
              <p className="text-4xl font-bold">{stats.today_lr || 0}</p>
              <div className="mt-3 text-sm opacity-90">
                Month: {stats.month_lr || 0} | Total: {stats.total_lr || 0}
              </div>
            </div>
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Today's Revenue</h3>
              <p className="text-4xl font-bold">₹{stats.today_revenue?.toLocaleString() || 0}</p>
              <div className="mt-3 text-sm opacity-90">Month: ₹{(stats.month_revenue || 0).toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Pending Amount</h3>
              <p className="text-4xl font-bold">₹{stats.pending_amount?.toLocaleString() || 0}</p>
              <div className="mt-3 text-sm opacity-90">Pending LR: {stats.pending_lr || 0}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Total Revenue</h3>
              <p className="text-4xl font-bold">₹{stats.total_revenue?.toLocaleString() || 0}</p>
              <div className="mt-3 text-sm opacity-90">Paid Bilties: {stats.paid_lr || 0}</div>
            </div>
          </div>

          {/* ALL 45+ FEATURES IN CATEGORIES - ONE LINE PER CATEGORY */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">All Modules & Features</h2>
            <div className="space-y-4">
              {dashboardCategories.map((category, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className={`bg-gradient-to-r ${category.color} px-6 py-3`}>
                    <h3 className="text-white font-bold text-lg">{category.name}</h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {category.features.map((feature, fIdx) => (
                        <button
                          key={fIdx}
                          onClick={() => navigate(feature.path)}
                          className="flex flex-col items-center justify-center p-3 rounded-lg bg-gray-50 hover:bg-blue-50 hover:shadow-md transition-all duration-200 border border-gray-200"
                        >
                          <span className="text-2xl mb-1">{feature.icon}</span>
                          <span className="text-xs font-medium text-gray-700 text-center">{feature.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Bilties */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Recent 5 Bilties - LIVE</h2>
            {recentBilties.length === 0 ? (
              <p className="text-gray-500">No data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">LR No</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">From</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">To</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Amount</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentBilties.map((bilty) => (
                      <tr key={bilty.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-blue-600">{bilty.lr_no}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{bilty.from_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{bilty.to_name}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{parseInt(bilty.grand_total || 0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            bilty.status === 'Booked' ? 'bg-green-100 text-green-800' :
                            bilty.status === 'In-Transit' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {bilty.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
