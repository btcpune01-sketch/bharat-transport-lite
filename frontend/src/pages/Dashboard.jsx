import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import {
  LayoutDashboard, Package, FileText, Users, Truck, TrendingUp,
  DollarSign, AlertCircle, CheckCircle, Clock, MapPin,
  ClipboardList, BarChart3, PieChart, Activity, Zap,
  Briefcase, Shield, Database, Settings, Bell, Search,
  RefreshCw, Plus, Eye, Edit, Trash2, Download, Upload,
  Calculator, Receipt, CreditCard, TrendingDown, Award,
  Target, Layers, Archive, UserCheck, FileCheck, TruckIcon,
  Route, Fuel, Wrench, Calendar, Phone, Mail, Building2,
  UserPlus, LogOut, Menu, X, ChevronRight, Filter
} from 'lucide-react';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentBilties, setRecentBilties] = useState([]);
  const [recentMR, setRecentMR] = useState([]);
  const [recentClaims, setRecentClaims] = useState([]);
  const [topParties, setTopParties] = useState([]);
  const [branchBalances, setBranchBalances] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, recentRes, partiesRes, branchRes] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/dashboard/recent'),
        api.get('/api/dashboard/top-parties'),
        api.get('/api/branch-payments/summary')
      ]);

      if (statsRes.data.success) setStats(statsRes.data);
      if (recentRes.data.success) {
        setRecentBilties(recentRes.data.bilties || []);
        setRecentMR(recentRes.data.receipts || []);
        setRecentClaims(recentRes.data.claims || []);
      }
      if (partiesRes.data.success) setTopParties(partiesRes.data.data || []);
      if (branchRes.data.success) {
        setSummary(branchRes.data.summary);
        setBranchBalances(branchRes.data.branches || []);
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 9 Main Categories with all 46+ functions
  const categories = [
    {
      id: 'overview',
      name: 'Dashboard Overview',
      icon: LayoutDashboard,
      color: 'bg-blue-500',
      description: 'Complete business overview',
      functions: [
        { name: 'Today LR', value: stats?.today_lr || 0, icon: Package },
        { name: 'Month LR', value: stats?.month_lr || 0, icon: Calendar },
        { name: 'Total LR', value: stats?.total_lr || 0, icon: FileText },
        { name: 'Pending LR', value: stats?.pending_lr || 0, icon: Clock },
        { name: 'Paid LR', value: stats?.paid_lr || 0, icon: CheckCircle },
        { name: 'Total Revenue', value: `₹${(stats?.total_revenue || 0).toLocaleString()}`, icon: DollarSign },
        { name: 'Pending Amount', value: `₹${(stats?.pending_amount || 0).toLocaleString()}`, icon: AlertCircle },
        { name: 'Today Revenue', value: `₹${(stats?.today_revenue || 0).toLocaleString()}`, icon: TrendingUp },
        { name: 'Month Revenue', value: `₹${(stats?.month_revenue || 0).toLocaleString()}`, icon: BarChart3 }
      ]
    },
    {
      id: 'consignments',
      name: 'Consignments (Bilty/LR)',
      icon: Package,
      color: 'bg-green-500',
      description: 'LR management & tracking',
      functions: [
        { name: 'Create Bilty', icon: Plus, route: '/consignments/new' },
        { name: 'All Bilties', icon: FileText, route: '/consignments', count: stats?.total_lr },
        { name: 'Track LR', icon: Search, route: '/track' },
        { name: 'Next LR No', icon: Calculator, route: '/consignments/new' },
        { name: 'Pending POD', icon: Clock, route: '/pod', count: stats?.pending_pod },
        { name: 'POD Records', icon: FileCheck, route: '/pod' },
        { name: 'E-Way Bills', icon: FileText, route: '/eway-bills' }
      ]
    },
    {
      id: 'billing',
      name: 'Billing & Payments',
      icon: Receipt,
      color: 'bg-purple-500',
      description: 'Bills, MR & payments',
      functions: [
        { name: 'Create Bill', icon: Plus, route: '/bills/new' },
        { name: 'All Bills', icon: FileText, route: '/bills', count: stats?.total_bills },
        { name: 'Pending Bills', icon: AlertCircle, route: '/bills', count: stats?.pending_bills },
        { name: 'Money Receipts', icon: Receipt, route: '/mr', count: stats?.total_mr },
        { name: 'Create MR', icon: Plus, route: '/mr/new' },
        { name: 'Party Ledger', icon: BookOpen, route: '/ledger' },
        { name: 'Outstanding', icon: AlertCircle, route: '/outstanding' }
      ]
    },
    {
      id: 'branches',
      name: 'Branch Management',
      icon: Building2,
      color: 'bg-orange-500',
      description: 'Branches & branch payments',
      functions: [
        { name: 'All Branches', icon: Building2, route: '/branches', count: stats?.total_branches },
        { name: 'Create Branch', icon: Plus, route: '/branches/new' },
        { name: 'Branch Payments', icon: DollarSign, route: '/branch-payments' },
        { name: 'Branch Summary', icon: BarChart3, route: '/branch-payments' },
        { name: 'Branch Login', icon: UserCheck, route: '/branches' },
        { name: 'Branch Portal', icon: Globe, route: '/branch-portal' }
      ]
    },
    {
      id: 'parties',
      name: 'Parties & Customers',
      icon: Users,
      color: 'bg-pink-500',
      description: 'Parties, customers & ledger',
      functions: [
        { name: 'All Parties', icon: Users, route: '/parties', count: stats?.total_parties },
        { name: 'Create Party', icon: UserPlus, route: '/parties/new' },
        { name: 'Customers', icon: Users, route: '/customers', count: stats?.total_customers },
        { name: 'Create Customer', icon: UserPlus, route: '/customers/new' },
        { name: 'Party Ledger', icon: BookOpen, route: '/ledger' },
        { name: 'Top Parties', icon: Award, route: '/parties', count: topParties?.length }
      ]
    },
    {
      id: 'transport',
      name: 'Transport Operations',
      icon: Truck,
      color: 'bg-teal-500',
      description: 'Drivers, vehicles, trips',
      functions: [
        { name: 'Drivers', icon: UserCheck, route: '/drivers', count: stats?.active_drivers },
        { name: 'Add Driver', icon: UserPlus, route: '/drivers/new' },
        { name: 'Vehicles', icon: Truck, route: '/vehicles', count: stats?.active_vehicles },
        { name: 'Add Vehicle', icon: Plus, route: '/vehicles/new' },
        { name: 'Trips', icon: Route, route: '/trips' },
        { name: 'Create Trip', icon: Plus, route: '/trips/new' },
        { name: 'Manifests', icon: ClipboardList, route: '/manifests' },
        { name: 'Freight Rates', icon: Calculator, route: '/rates' }
      ]
    },
    {
      id: 'documents',
      name: 'Documents & Stock',
      icon: Archive,
      color: 'bg-indigo-500',
      description: 'Gate pass, challan, stock',
      functions: [
        { name: 'Gate Pass', icon: FileCheck, route: '/gate-pass' },
        { name: 'Create Gate Pass', icon: Plus, route: '/gate-pass/new' },
        { name: 'Gadi Challan', icon: TruckIcon, route: '/gadi-challan' },
        { name: 'Create Challan', icon: Plus, route: '/gadi-challan/new' },
        { name: 'Document Stock', icon: Archive, route: '/stock' },
        { name: 'Add Stock', icon: Plus, route: '/stock/add' },
        { name: 'POD Upload', icon: Upload, route: '/pod/upload' }
      ]
    },
    {
      id: 'finance',
      name: 'Finance & Accounts',
      icon: Briefcase,
      color: 'bg-red-500',
      description: 'Expenses, claims, rates',
      functions: [
        { name: 'Expenses', icon: DollarSign, route: '/expenses' },
        { name: 'Add Expense', icon: Plus, route: '/expenses/new' },
        { name: 'Claims', icon: AlertCircle, route: '/claims', count: stats?.open_claims },
        { name: 'Add Claim', icon: Plus, route: '/claims/new' },
        { name: 'Commissions', icon: Percent, route: '/commissions' },
        { name: 'Rate Contracts', icon: Calculator, route: '/rates' },
        { name: 'Accounts Summary', icon: BarChart3, route: '/accounts' },
        { name: 'TDS Register', icon: FileText, route: '/tds' }
      ]
    },
    {
      id: 'settings',
      name: 'Settings & Admin',
      icon: Settings,
      color: 'bg-gray-500',
      description: 'Users, audit, backup',
      functions: [
        { name: 'Users', icon: Users, route: '/users' },
        { name: 'Add User', icon: UserPlus, route: '/users/new' },
        { name: 'Audit Logs', icon: Activity, route: '/audit' },
        { name: 'Backup', icon: Download, route: '/backup' },
        { name: 'Restore', icon: Upload, route: '/backup/restore' },
        { name: 'Materials', icon: Layers, route: '/materials' },
        { name: 'Routes', icon: Route, route: '/routes' },
        { name: 'Reports', icon: BarChart3, route: '/reports' }
      ]
    }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Welcome, {currentUser?.full_name || 'Admin'}!</h1>
              <p className="text-sm text-gray-500">Bharat Transport Company - Complete Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-gray-500">Today</p>
              <p className="text-lg font-semibold text-gray-800">{new Date().toLocaleDateString('en-IN')}</p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="p-2 rounded-lg hover:bg-gray-100"
              title="Refresh"
            >
              <RefreshCw size={20} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Category Tabs */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  activeCategory === cat.id
                    ? `${cat.color} text-white shadow-md`
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <cat.icon size={18} />
                <span className="whitespace-nowrap">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Category Content */}
        {categories.map((cat) => (
          activeCategory === cat.id && (
            <div key={cat.id} className="space-y-6">
              {/* Category Header */}
              <div className={`${cat.color} text-white rounded-xl shadow-md p-6`}>
                <div className="flex items-center gap-4">
                  <cat.icon size={48} />
                  <div>
                    <h2 className="text-3xl font-bold">{cat.name}</h2>
                    <p className="text-white/80">{cat.description}</p>
                  </div>
                </div>
              </div>

              {/* Functions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cat.functions.map((func, idx) => (
                  <button
                    key={idx}
                    onClick={() => func.route && navigate(func.route)}
                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all group text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-lg ${cat.color} text-white group-hover:scale-110 transition-transform`}>
                        <func.icon size={24} />
                      </div>
                      {func.count !== undefined && (
                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-semibold">
                          {func.count}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mt-4">{func.name}</h3>
                    {func.value && (
                      <p className="text-2xl font-bold text-gray-900 mt-2">{func.value}</p>
                    )}
                    {func.route && (
                      <div className="flex items-center gap-1 text-sm text-blue-600 mt-3">
                        <span>Open</span>
                        <ChevronRight size={16} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )
        ))}

        {/* Quick Stats Summary */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-md p-6 mt-8 text-white">
          <h2 className="text-xl font-bold mb-4">Business Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm opacity-75">This Month LR</p>
              <p className="text-3xl font-bold">{stats?.month_lr || 0}</p>
            </div>
            <div>
              <p className="text-sm opacity-75">Month Revenue</p>
              <p className="text-3xl font-bold">₹{(stats?.month_revenue || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm opacity-75">Total Parties</p>
              <p className="text-3xl font-bold">{stats?.total_parties || 0}</p>
            </div>
            <div>
              <p className="text-sm opacity-75">Open Claims</p>
              <p className="text-3xl font-bold">{stats?.open_claims || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
