import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TrendingUp, FileText, Truck, Users, Clock, CheckCircle2, AlertTriangle,
  ShieldCheck, Plus, RefreshCw, Building2, Calendar, CreditCard, ChevronRight,
  ChevronDown, Package, Search, Layers, MapPin, AlertCircle, Calculator,
  Download, ShieldAlert, Compass, User, LogOut, Navigation, FilePlus, Coins,
  History, X, DollarSign, Percent, Receipt, Boxes, Activity, BarChart3
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const menuTimeoutRef = useRef(null);

  const [user, setUser] = useState({ username: 'User', role: 'operator', branch_name: '', branch_code: '' });
  const [stats, setStats] = useState({
    today_lr: 0, month_lr: 0, total_lr: 0, pending_lr: 0, paid_lr: 0, total_bills: 0,
    pending_bills: 0, total_mr: 0, total_parties: 0, total_customers: 0, total_revenue: 0,
    pending_amount: 0, pending_pod: 0, active_drivers: 0, active_vehicles: 0,
    today_expenses: 0, total_branches: 0, today_revenue: 0, month_revenue: 0, is_admin: false
  });

  const [recentData, setRecentData] = useState({ bilties: [], receipts: [], claims: [] });
  const [topParties, setTopParties] = useState([]);
  const [branches, setBranches] = useState([]);
  const [stockList, setStockList] = useState([]);
  const [expiringVehicles, setExpiringVehicles] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');

  const [trackLr, setTrackLr] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  const [showCalculator, setShowCalculator] = useState(false);
  const [calcForm, setCalcForm] = useState({ from_city: '', to_city: '', weight_kg: '', packages: '' });
  const [calcResult, setCalcResult] = useState(null);

  const API_BASE = 'https://bharat-transport-lite-iemb.vercel.app';

  const getHeaders = () => {
    const token = localStorage.getItem('token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
    };
  };

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch (e) {}
    fetchDashboardData();
  }, [selectedBranch]);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const branchQuery = selectedBranch !== 'all' ? `?branch_id=${selectedBranch}` : '';

      const [statsRes, recentRes, topPartiesRes, stockRes, expiringRes, branchesRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/dashboard/stats${branchQuery}`, { headers: getHeaders() }),
        fetch(`${API_BASE}/api/dashboard/recent${branchQuery}`, { headers: getHeaders() }),
        fetch(`${API_BASE}/api/dashboard/top-parties${branchQuery}`, { headers: getHeaders() }),
        fetch(`${API_BASE}/api/stock`, { headers: getHeaders() }),
        fetch(`${API_BASE}/api/vehicles/expiring`, { headers: getHeaders() }),
        fetch(`${API_BASE}/api/branches`, { headers: getHeaders() })
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const d = await statsRes.value.json();
        if (d.success) setStats(prev => ({ ...prev, ...d }));
      }
      if (recentRes.status === 'fulfilled' && recentRes.value.ok) {
        const d = await recentRes.value.json();
        if (d.success) setRecentData(d);
      }
      if (topPartiesRes.status === 'fulfilled' && topPartiesRes.value.ok) {
        const d = await topPartiesRes.value.json();
        if (d.success && Array.isArray(d.data)) setTopParties(d.data);
      }
      if (stockRes.status === 'fulfilled' && stockRes.value.ok) {
        const d = await stockRes.value.json();
        if (Array.isArray(d.data)) setStockList(d.data);
      }
      if (expiringRes.status === 'fulfilled' && expiringRes.value.ok) {
        const d = await expiringRes.value.json();
        if (Array.isArray(d.data)) setExpiringVehicles(d.data);
      }
      if (branchesRes.status === 'fulfilled' && branchesRes.value.ok) {
        const d = await branchesRes.value.json();
        if (Array.isArray(d.data)) setBranches(d.data);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleQuickTrack = async (e) => {
    e.preventDefault();
    if (!trackLr.trim()) return;
    setTrackLoading(true);
    setTrackError('');
    setTrackResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/consignments/track?lr_no=${encodeURIComponent(trackLr.trim())}`);
      const data = await res.json();
      if (res.ok && !data.error) setTrackResult(data);
      else setTrackError(data.error || 'Bilty not found. Please check the LR number.');
    } catch (err) {
      setTrackError('Could not connect to tracking server.');
    } finally {
      setTrackLoading(false);
    }
  };

  const handleCalculateRate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/rates/calculate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(calcForm)
      });
      const data = await res.json();
      setCalcResult(data);
    } catch (err) {
      console.error('Rate calculation error:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navCategories = [
    {
      id: 'dashboard', label: 'Dashboard', icon: TrendingUp, color: 'text-blue-600',
      items: [
        { title: 'Dashboard Overview', desc: 'Live business status and key metrics', path: '/', icon: TrendingUp },
        { title: 'Refresh Branch Data', desc: 'Update data instantly', action: fetchDashboardData, icon: RefreshCw }
      ]
    },
    {
      id: 'bilty', label: 'Bookings', icon: FileText, color: 'text-indigo-600',
      items: [
        { title: 'New Bilty Booking', desc: 'Generate new LR', path: '/consignments/new', icon: Plus },
        { title: 'All Bilty Register', desc: 'List of all booked bilties', path: '/consignments', icon: FileText },
        { title: 'E-Way Bills', desc: 'E-way bill expiry and vehicle updates', path: '/eway-bills', icon: ShieldCheck },
        { title: 'Quick LR Tracking', desc: 'Check LR status instantly', action: () => document.getElementById('lr-track-input')?.focus(), icon: Search }
      ]
    },
    {
      id: 'fleet', label: 'Fleet & Drivers', icon: Truck, color: 'text-emerald-600',
      items: [
        { title: 'Vehicle Management', desc: 'Vehicle details and RC records', path: '/vehicles', icon: Truck },
        { title: 'Driver List', desc: 'Driver profiles, licenses, and phones', path: '/drivers', icon: Users },
        { title: 'Document Expiry Alerts', desc: 'Insurance, fitness, and permit renewals', path: '/vehicles/expiring', icon: ShieldAlert }
      ]
    },
    {
      id: 'operations', label: 'Operations', icon: Navigation, color: 'text-amber-600',
      items: [
        { title: 'Vehicle Challan', desc: 'Lorry hire challan and advance payments', path: '/gadi-challan', icon: FileText },
        { title: 'Gate Pass', desc: 'Loading and unloading passes', path: '/gate-pass', icon: CheckCircle2 },
        { title: 'Manifest / Transit', desc: 'Vehicle loading challan and bilty list', path: '/manifests', icon: Layers },
        { title: 'Trip Management', desc: 'Route, hub, and distance planning', path: '/trips', icon: Compass }
      ]
    },
    {
      id: 'pod', label: 'Delivery', icon: Package, color: 'text-teal-600',
      items: [
        { title: 'POD Register', desc: 'Received delivery receipts and signatures', path: '/pod', icon: Package },
        { title: 'Public POD View', desc: 'Delivery status for customers', path: '/public/pod-view', icon: CheckCircle2 }
      ]
    },
    {
      id: 'parties', label: 'Customers & Parties', icon: Users, color: 'text-cyan-600',
      items: [
        { title: 'Customer Directory', desc: 'Regular customers and credit limits', path: '/customers', icon: Users },
        { title: 'Party Master', desc: 'Consignor and consignee GST accounts', path: '/parties', icon: Building2 },
        { title: 'Smart Rate Contracts', desc: 'Fixed rates per party', path: '/rates', icon: Coins },
        { title: 'Freight Calculator', desc: 'Instant freight calculation by weight/packages', action: () => setShowCalculator(true), icon: Calculator }
      ]
    },
    {
      id: 'billing', label: 'Billing & Invoices', icon: FileText, color: 'text-violet-600',
      items: [
        { title: 'Bill Book', desc: 'Generated GST freight bills', path: '/bills', icon: FileText },
        { title: 'Create New Bill', desc: 'Generate invoice by linking bilties', path: '/bills/new', icon: Plus }
      ]
    },
    {
      id: 'receipts', label: 'Payments', icon: CreditCard, color: 'text-purple-600',
      items: [
        { title: 'Money Receipt (MR)', desc: 'Cash, UPI, and bank payment receipts', path: '/mr', icon: CreditCard },
        { title: 'Party Ledger', desc: 'Transaction account and running balance', path: '/ledger', icon: History },
        { title: 'Outstanding Amounts', desc: 'Recoverable amounts from parties', path: '/outstanding', icon: AlertTriangle }
      ]
    },
    {
      id: 'finance', label: 'Accounts & Finance', icon: DollarSign, color: 'text-rose-600',
      items: [
        { title: 'Financial Summary (P&L)', desc: 'Total income, liabilities, and net profit', path: '/accounts/summary', icon: DollarSign },
        { title: 'Daily Expenses', desc: 'Office, diesel, and toll expense records', path: '/expenses', icon: Receipt },
        { title: 'TDS Register', desc: 'TDS deducted from vehicle challans', path: '/accounts/tds-register', icon: Percent },
        { title: 'Commissions & Claims', desc: 'Broker commissions and claim settlements', path: '/commissions', icon: ShieldCheck }
      ]
    },
    {
      id: 'admin', label: 'Administration', icon: Building2, color: 'text-slate-700',
      items: [
        { title: 'Branches', desc: 'Branch network and login setup', path: '/branches', icon: Building2 },
        { title: 'Branch Ledger', desc: 'Transactions between head office and branches', path: '/branch-payments/summary', icon: Coins },
        { title: 'Document Stock', desc: 'Remaining bilty, MR, and challan copies', path: '/stock', icon: Boxes },
        { title: 'Users & Operators', desc: 'Staff accounts and permissions', path: '/users', icon: User },
        { title: 'Audit Logs', desc: 'History of system changes', path: '/audit', icon: History },
        { title: 'Backup & Restore', desc: 'Database backup download and import', path: '/backup', icon: Download }
      ]
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-slate-600 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-500/20">
              BTC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg text-slate-900 tracking-tight">Bharat Transport Company</h1>
                <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">TMS v6.0 Live</span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                <span className="inline-block w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> System Online
                </span>
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <form onSubmit={handleQuickTrack} className="relative w-72">
              <input
                id="lr-track-input"
                type="text"
                placeholder="Enter LR / Bilty Number..."
                value={trackLr}
                onChange={(e) => setTrackLr(e.target.value)}
                className="w-full text-xs bg-slate-100 hover:bg-slate-50 focus:bg-white pl-8 pr-16 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              <button type="submit" disabled={trackLoading} className="absolute right-1 top-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors">
                {trackLoading ? '...' : 'Track'}
              </button>
            </form>

            {stats.is_admin && branches.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
                <Building2 className="w-4 h-4 text-slate-500" />
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>
                  ))}
                </select>
              </div>
            )}

            <button onClick={fetchDashboardData} disabled={refreshing} title="Refresh Data" className="p-2 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                {user.username ? user.username.slice(0, 2) : 'US'}
              </div>
              <div className="text-left hidden xl:block">
                <div className="text-xs font-bold text-slate-900 leading-tight">{user.username}</div>
                <div className="text-[10px] text-slate-500 font-medium capitalize">{user.role}</div>
              </div>
              <button onClick={handleLogout} title="Logout" className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/90 backdrop-blur-md">
          <div className="max-w-[1600px] mx-auto px-4 flex items-center justify-between overflow-x-auto no-scrollbar py-1">
            <div className="flex items-center gap-1 w-full justify-between min-w-[1100px]">
              {navCategories.map((cat) => {
                const IconComponent = cat.icon;
                const isOpen = activeMenu === cat.id;

                return (
                  <div
                    key={cat.id}
                    className="relative"
                    onMouseEnter={() => {
                      if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
                      setActiveMenu(cat.id);
                    }}
                    onMouseLeave={() => {
                      menuTimeoutRef.current = setTimeout(() => setActiveMenu(null), 180);
                    }}
                  >
                    <button
                      onClick={() => setActiveMenu(isOpen ? null : cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isOpen ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white hover:text-blue-700 hover:shadow-xs'
                      }`}
                    >
                      <IconComponent className={`w-3.5 h-3.5 ${isOpen ? 'text-white' : cat.color}`} />
                      <span className="whitespace-nowrap">{cat.label}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180 text-white' : 'text-slate-400'}`} />
                    </button>

                    {isOpen && (
                      <div className="absolute left-0 mt-1 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                        <div className="px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
                          <span>{cat.label}</span>
                          <span className="text-[10px] text-blue-600 lowercase">{cat.items.length} options</span>
                        </div>
                        {cat.items.map((item, idx) => {
                          const SubIcon = item.icon || FileText;
                          if (item.action) {
                            return (
                              <button
                                key={idx}
                                onClick={() => { setActiveMenu(null); item.action(); }}
                                className="w-full text-left px-3.5 py-2 hover:bg-blue-50 flex items-start gap-2.5 group transition-colors"
                              >
                                <SubIcon className="w-4 h-4 text-blue-600 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                                <div>
                                  <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">{item.title}</div>
                                  <div className="text-[11px] text-slate-500 leading-tight">{item.desc}</div>
                                </div>
                              </button>
                            );
                          }
                          return (
                            <Link
                              key={idx}
                              to={item.path}
                              onClick={() => setActiveMenu(null)}
                              className="px-3.5 py-2 hover:bg-blue-50 flex items-start gap-2.5 group transition-colors block"
                            >
                              <SubIcon className="w-4 h-4 text-slate-600 group-hover:text-blue-600 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                              <div>
                                <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">{item.title}</div>
                                <div className="text-[11px] text-slate-500 leading-tight">{item.desc}</div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] w-full mx-auto px-4 py-5 flex-1 flex flex-col gap-5">
        {trackResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-950 shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-sm">LR: {trackResult.lr_no}</span>
                <span className="mx-2 text-slate-400">|</span>
                <span>Date: {trackResult.lr_date}</span>
                <span className="mx-2 text-slate-400">|</span>
                <span>Route: {trackResult.from_name} ➔ {trackResult.to_name}</span>
                <span className="mx-2 text-slate-400">|</span>
                <span className="font-semibold text-emerald-700">Status: {trackResult.status} ({trackResult.pod_status || 'Pending POD'})</span>
              </div>
            </div>
            <button onClick={() => setTrackResult(null)} className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {trackError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-rose-900 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{trackError}</span>
            </div>
            <button onClick={() => setTrackError('')} className="p-1 hover:bg-rose-100 rounded-lg text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {expiringVehicles.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900 shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">{expiringVehicles.length} vehicles have documents (Fitness / Insurance / Permit) expiring within 30 days!</span>
                <span className="ml-2 text-amber-800 underline cursor-pointer" onClick={() => navigate('/vehicles/expiring')}>
                  View Here ➔
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pl-1">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Quick Actions:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/consignments/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors">
              <FilePlus className="w-3.5 h-3.5" />
              <span>+ New Bilty</span>
            </Link>
            <Link to="/bills/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors">
              <FileText className="w-3.5 h-3.5" />
              <span>+ New Bill</span>
            </Link>
            <Link to="/mr" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors">
              <CreditCard className="w-3.5 h-3.5" />
              <span>+ Money Receipt</span>
            </Link>
            <Link to="/gadi-challan" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors">
              <Truck className="w-3.5 h-3.5" />
              <span>+ Vehicle Challan</span>
            </Link>
            <button onClick={() => setShowCalculator(!showCalculator)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors border border-slate-300">
              <Calculator className="w-3.5 h-3.5 text-blue-600" />
              <span>Freight Calculator</span>
            </button>
          </div>
        </div>

        {showCalculator && (
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-blue-800 pb-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Smart Freight Rate Calculator</h3>
              </div>
              <button onClick={() => setShowCalculator(false)} className="text-blue-300 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCalculateRate} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-[11px] font-medium text-blue-200 block mb-1">From City:</label>
                <input type="text" required placeholder="e.g., Delhi" value={calcForm.from_city} onChange={(e) => setCalcForm({ ...calcForm, from_city: e.target.value })} className="w-full text-xs bg-blue-950/60 border border-blue-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-blue-200 block mb-1">To City:</label>
                <input type="text" required placeholder="e.g., Mumbai" value={calcForm.to_city} onChange={(e) => setCalcForm({ ...calcForm, to_city: e.target.value })} className="w-full text-xs bg-blue-950/60 border border-blue-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-blue-200 block mb-1">Weight (Kg):</label>
                <input type="number" placeholder="e.g., 250" value={calcForm.weight_kg} onChange={(e) => setCalcForm({ ...calcForm, weight_kg: e.target.value })} className="w-full text-xs bg-blue-950/60 border border-blue-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-blue-200 block mb-1">Packages:</label>
                <input type="number" placeholder="e.g., 5" value={calcForm.packages} onChange={(e) => setCalcForm({ ...calcForm, packages: e.target.value })} className="w-full text-xs bg-blue-950/60 border border-blue-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400" />
              </div>
              <button type="submit" className="bg-amber-400 hover:bg-amber-300 text-blue-950 font-extrabold text-xs py-2 px-4 rounded-lg transition-colors h-[35px]">Calculate Freight</button>
            </form>
            {calcResult && (
              <div className="mt-3 pt-3 border-t border-blue-800 flex items-center justify-between text-xs">
                {calcResult.found ? (
                  <div className="flex items-center gap-4">
                    <span className="text-emerald-300 font-bold">Applied Rate: ₹{calcResult.calculation?.rate_applied}</span>
                    <span className="text-amber-300 font-extrabold text-sm">Total Freight: ₹{calcResult.freight}</span>
                    {calcResult.calculation?.min_charge && <span className="text-blue-300 text-[11px]">(Min Charge: ₹{calcResult.calculation?.min_charge})</span>}
                  </div>
                ) : (
                  <span className="text-rose-300">No rate contract found for this route.</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Booking</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 leading-tight">
              {stats.today_lr} <span className="text-xs font-medium text-slate-500">Bilties</span>
            </div>
            <div className="mt-2 text-xs text-slate-600 flex items-center justify-between pt-2 border-t border-slate-100">
              <span>Today's Revenue:</span>
              <span className="font-bold text-emerald-600">₹{(stats.today_revenue || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">This Month's Booking</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 leading-tight">
              {stats.month_lr} <span className="text-xs font-medium text-slate-500">Bilties</span>
            </div>
            <div className="mt-2 text-xs text-slate-600 flex items-center justify-between pt-2 border-t border-slate-100">
              <span>Month's Revenue:</span>
              <span className="font-bold text-emerald-600">₹{(stats.month_revenue || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Amount</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-rose-600 leading-tight">
              ₹{(stats.pending_amount || 0).toLocaleString('en-IN')}
            </div>
            <div className="mt-2 text-xs text-slate-600 flex items-center justify-between pt-2 border-t border-slate-100">
              <span>Pending Bilties:</span>
              <span className="font-bold text-slate-800">{stats.pending_lr} LR</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fleet & Network Status</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center justify-between text-slate-900">
              <div>
                <span className="text-xl font-bold">{stats.active_vehicles || 0}</span>
                <span className="text-[11px] text-slate-500 block">Active Vehicles</span>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <span className="text-xl font-bold">{stats.active_drivers || 0}</span>
                <span className="text-[11px] text-slate-500 block">Active Drivers</span>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <span className="text-xl font-bold">{stats.total_branches || 1}</span>
                <span className="text-[11px] text-slate-500 block">Branches</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-600 flex items-center justify-between pt-2 border-t border-slate-100">
              <span>Pending POD:</span>
              <span className="font-bold text-amber-600">{stats.pending_pod || 0} Deliveries</span>
            </div>
          </div>
        </div>

        {stockList.length > 0 && (
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-indigo-600" />
                Stationery & Printed Books Stock (Remaining):
              </span>
              <Link to="/stock" className="text-[11px] font-semibold text-blue-600 hover:underline">
                Stock Management ➔
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {stockList.map((stk, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-2 border border-slate-200/80 text-center">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">{stk.document_type}</div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    {stk.remaining_count} <span className="text-[10px] text-slate-400 font-normal">/ {stk.total_stock}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={`h-full ${stk.remaining_count < 50 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, (stk.remaining_count / (stk.total_stock || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Recent Booked Bilties</h3>
              </div>
              <Link to="/consignments" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-0.5">
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3.5">LR No.</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Consignor</th>
                    <th className="py-2.5 px-3">Consignee</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                    <th className="py-2.5 px-3 text-center">Payment</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentData.bilties && recentData.bilties.length > 0 ? (
                    recentData.bilties.map((bilty, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3.5 font-bold text-blue-700">
                          <Link to={`/consignments/${bilty.lr_no}`}>{bilty.lr_no}</Link>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">{bilty.lr_date}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[140px] truncate" title={bilty.consignor_name}>
                          {bilty.consignor_name || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[140px] truncate" title={bilty.consignee_name}>
                          {bilty.consignee_name || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                          ₹{Number(bilty.grand_total || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            bilty.payment_status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {bilty.payment_status || 'Unpaid'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {bilty.status || 'Booked'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">
                        No recent bilties found. Click "+ New Bilty" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Top Consignors</h3>
              </div>
              <Link to="/parties" className="text-xs font-semibold text-blue-600 hover:underline">Party Account ➔</Link>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3.5">
                {topParties.length > 0 ? (
                  topParties.map((party, idx) => {
                    const maxRevenue = topParties[0]?.total_revenue || 1;
                    const percent = Math.min(100, Math.round((Number(party.total_revenue) / maxRevenue) * 100));

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 truncate max-w-[180px]" title={party.consignor_name}>
                            {idx + 1}. {party.consignor_name}
                          </span>
                          <span className="font-extrabold text-slate-900">₹{Number(party.total_revenue).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{party.total_bilties} bilties booked</span>
                          <span>{percent}% share</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">Gathering top party data...</div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 p-2.5 rounded-lg flex items-center gap-2 text-[11px] text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All transactions are secured in PostgreSQL (Neon) encrypted cloud.</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 Bharat Transport Company - All Rights Reserved.</span>
          <div className="flex items-center gap-4 text-slate-600 font-medium">
            <Link to="/branches" className="hover:text-blue-600">Branches</Link>
            <Link to="/stock" className="hover:text-blue-600">Stock</Link>
            <Link to="/audit" className="hover:text-blue-600">Audit</Link>
            <Link to="/backup" className="hover:text-blue-600">Backup</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
