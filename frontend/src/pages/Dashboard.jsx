import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  FileText,
  Truck,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Plus,
  RefreshCw,
  Building,
  Calendar,
  CreditCard,
  ChevronRight,
  ChevronDown,
  Search,
  Layers,
  AlertCircle,
  Calculator,
  Download,
  Compass,
  Table,
  UserCheck,
  LogOut,
  Receipt,
  Package,
  History,
  X
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const menuTimeoutRef = useRef(null);

  const [user, setUser] = useState({
    username: 'User',
    role: 'operator',
    branch_name: '',
    branch_code: ''
  });

  const [stats, setStats] = useState({
    today_lr: 0,
    month_lr: 0,
    total_lr: 0,
    pending_lr: 0,
    paid_lr: 0,
    total_bills: 0,
    pending_bills: 0,
    total_mr: 0,
    total_parties: 0,
    total_customers: 0,
    total_revenue: 0,
    pending_amount: 0,
    pending_pod: 0,
    active_drivers: 0,
    active_vehicles: 0,
    today_expenses: 0,
    total_branches: 0,
    today_revenue: 0,
    month_revenue: 0,
    is_admin: false
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
    } catch (e) {
      console.error(e);
    }
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
      else setTrackError(data.error || 'बिल्टी नहीं मिली।');
    } catch (err) {
      setTrackError('ट्रैकिंग सर्वर एरर।');
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
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // 10 MAIN CATEGORIES CONFIGURATION (COMPATIBLE ICONS ONLY)
  const navCategories = [
    {
      id: 'dashboard',
      label: '1. डैशबोर्ड',
      icon: TrendingUp,
      color: 'text-blue-600',
      items: [
        { title: 'डैशबोर्ड ओवरव्यू', desc: 'लाइव व्यापार स्थिति', path: '/', icon: TrendingUp },
        { title: 'डेटा रीफ्रेश', desc: 'तुरंत अपडेट करें', action: fetchDashboardData, icon: RefreshCw }
      ]
    },
    {
      id: 'bilty',
      label: '2. बिल्टी / बुकिंग',
      icon: FileText,
      color: 'text-indigo-600',
      items: [
        { title: 'नई बिल्टी बुकिंग', desc: 'नया LR बनाएं', path: '/consignments/new', icon: Plus },
        { title: 'समस्त बिल्टी रजिस्टर', desc: 'सभी बिल्टियों की सूची', path: '/consignments', icon: FileText },
        { title: 'ई-वे बिल', desc: 'ई-वे बिल स्टेटस', path: '/eway-bills', icon: ShieldCheck }
      ]
    },
    {
      id: 'fleet',
      label: '3. वाहन व ड्राइवर',
      icon: Truck,
      color: 'text-emerald-600',
      items: [
        { title: 'वाहन प्रबंधन', desc: 'गाड़ियों का विवरण', path: '/vehicles', icon: Truck },
        { title: 'चालक सूची', desc: 'ड्राइवर प्रोफाइल', path: '/drivers', icon: Users },
        { title: 'एक्सपायरी अलर्ट', desc: 'बीमा, फिटनेस व परमिट', path: '/vehicles/expiring', icon: AlertTriangle }
      ]
    },
    {
      id: 'operations',
      label: '4. ऑपरेशन्स',
      icon: Compass,
      color: 'text-amber-600',
      items: [
        { title: 'गाड़ी चालान', desc: 'चालान व एडवांस पेमेंट', path: '/gadi-challan', icon: Table },
        { title: 'गेट पास', desc: 'लोडिंग गेट पास', path: '/gate-pass', icon: FileText },
        { title: 'मैनिफेस्ट', desc: 'गाड़ी लोडिंग चालान', path: '/manifests', icon: Layers },
        { title: 'ट्रिप मैनेजमेंट', desc: 'रूट व ट्रिप', path: '/trips', icon: Compass }
      ]
    },
    {
      id: 'pod',
      label: '5. डिलीवरी / POD',
      icon: CheckCircle2,
      color: 'text-teal-600',
      items: [
        { title: 'POD रजिस्टर', desc: 'डिलीवरी रसीदें', path: '/pod', icon: CheckCircle2 },
        { title: 'पब्लिक POD व्यू', desc: 'ग्राहक ट्रैकिंग पेज', path: '/public/pod-view', icon: CheckCircle2 }
      ]
    },
    {
      id: 'parties',
      label: '6. पार्टी व ग्राहक',
      icon: Users,
      color: 'text-cyan-600',
      items: [
        { title: 'कस्टमर डायरेक्टरी', desc: 'नियमित ग्राहक', path: '/customers', icon: Users },
        { title: 'पार्टी मास्टर', desc: 'कंसाइनर व कंसाइनी', path: '/parties', icon: Building },
        { title: 'स्मार्ट रेट्स', desc: 'तय दरें', path: '/rates', icon: DollarSign },
        { title: 'किराया कैलकुलेटर', desc: 'तुरंत भाड़ा निकालें', action: () => setShowCalculator(true), icon: Calculator }
      ]
    },
    {
      id: 'billing',
      label: '7. बिलिंग',
      icon: FileText,
      color: 'text-violet-600',
      items: [
        { title: 'बिल बुक', desc: 'जीएसटी फ्रेट बिल्स', path: '/bills', icon: FileText },
        { title: 'नया बिल बनाएं', desc: 'नया इनवॉइस', path: '/bills/new', icon: Plus }
      ]
    },
    {
      id: 'receipts',
      label: '8. भुगतान / MR',
      icon: CreditCard,
      color: 'text-purple-600',
      items: [
        { title: 'मनी रिसीट (MR)', desc: 'पेमेंट रसीदें', path: '/mr', icon: CreditCard },
        { title: 'पार्टी लेज़र', desc: 'लेन-देन खाता', path: '/ledger', icon: History },
        { title: 'बकाया राशि', desc: 'पेंडिंग पेमेंट', path: '/outstanding', icon: AlertTriangle }
      ]
    },
    {
      id: 'finance',
      label: '9. अकाउंट्स',
      icon: DollarSign,
      color: 'text-rose-600',
      items: [
        { title: 'वित्तीय सारांश (P&L)', desc: 'कुल आमदनी व खर्च', path: '/accounts/summary', icon: DollarSign },
        { title: 'दैनिक खर्चे', desc: 'खर्च रिकॉर्ड', path: '/expenses', icon: Receipt },
        { title: 'टीडीएस रजिस्टर', desc: 'टीडीएस कटौती', path: '/accounts/tds-register', icon: Percent },
        { title: 'कमीशन व क्लेम्स', desc: 'दलाल कमीशन', path: '/commissions', icon: ShieldCheck }
      ]
    },
    {
      id: 'admin',
      label: '10. प्रशासन',
      icon: Building,
      color: 'text-slate-700',
      items: [
        { title: 'शाखाएं (Branches)', desc: 'ब्रांच नेटवर्क', path: '/branches', icon: Building },
        { title: 'ब्रांच लेज़र', desc: 'ब्रांच लेन-देन', path: '/branch-payments', icon: DollarSign },
        { title: 'दस्तावेज़ स्टॉक', desc: 'बिल्टी, एमआर स्टॉक', path: '/stock', icon: Package },
        { title: 'यूज़र्स', desc: 'स्टाफ अधिकार', path: '/users', icon: UserCheck },
        { title: 'ऑडिट लॉग्स', desc: 'सिस्टम हिस्ट्री', path: '/audit', icon: History },
        { title: 'बैकअप व रिस्टोर', desc: 'डेटा डाउनलोड', path: '/backup', icon: Download }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
              BTC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg text-slate-900 tracking-tight">भारत ट्रांसपोर्ट कंपनी</h1>
                <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">TMS v6.0</span>
              </div>
              <p className="text-xs text-slate-500">
                {new Date().toLocaleDateString('hi-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <form onSubmit={handleQuickTrack} className="relative w-64">
              <input
                type="text"
                placeholder="LR नंबर डालें..."
                value={trackLr}
                onChange={(e) => setTrackLr(e.target.value)}
                className="w-full text-xs bg-slate-100 pl-8 pr-14 py-2 rounded-lg border border-slate-200 focus:outline-none focus:bg-white"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              <button type="submit" disabled={trackLoading} className="absolute right-1 top-1 bg-blue-600 text-white text-[11px] font-semibold px-2 py-1 rounded">
                {trackLoading ? '...' : 'ट्रैक'}
              </button>
            </form>

            {stats.is_admin && branches.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
                <Building className="w-4 h-4 text-slate-500" />
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">सभी शाखाएं</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.branch_name}</option>
                  ))}
                </select>
              </div>
            )}

            <button onClick={fetchDashboardData} disabled={refreshing} title="रीफ्रेश" className="p-2 text-slate-600 bg-slate-100 hover:bg-blue-50 rounded-lg border border-slate-200">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <button onClick={handleLogout} title="लॉगआउट" className="p-2 text-slate-400 hover:text-rose-600 bg-slate-100 rounded-lg">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50">
          <div className="max-w-[1600px] mx-auto px-4 flex items-center justify-between overflow-x-auto py-1">
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
                        isOpen ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white hover:text-blue-700'
                      }`}
                    >
                      <IconComponent className={`w-3.5 h-3.5 ${isOpen ? 'text-white' : cat.color}`} />
                      <span className="whitespace-nowrap">{cat.label}</span>
                      <ChevronDown className={`w-3 h-3 ${isOpen ? 'rotate-180 text-white' : 'text-slate-400'}`} />
                    </button>

                    {isOpen && (
                      <div className="absolute left-0 mt-1 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                        <div className="px-3.5 py-1 text-[11px] font-extrabold uppercase text-slate-400 border-b border-slate-100 mb-1">
                          {cat.label}
                        </div>
                        {cat.items.map((item, idx) => {
                          const SubIcon = item.icon || FileText;
                          if (item.action) {
                            return (
                              <button
                                key={idx}
                                onClick={() => { setActiveMenu(null); item.action(); }}
                                className="w-full text-left px-3.5 py-2 hover:bg-blue-50 flex items-start gap-2.5 transition-colors"
                              >
                                <SubIcon className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                                <div>
                                  <div className="text-xs font-bold text-slate-800">{item.title}</div>
                                  <div className="text-[11px] text-slate-500">{item.desc}</div>
                                </div>
                              </button>
                            );
                          }
                          return (
                            <Link
                              key={idx}
                              to={item.path}
                              onClick={() => setActiveMenu(null)}
                              className="px-3.5 py-2 hover:bg-blue-50 flex items-start gap-2.5 transition-colors block"
                            >
                              <SubIcon className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                              <div>
                                <div className="text-xs font-bold text-slate-800">{item.title}</div>
                                <div className="text-[11px] text-slate-500">{item.desc}</div>
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
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-950">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-sm">LR: {trackResult.lr_no}</span>
                <span className="mx-2 text-slate-400">|</span>
                <span>तारीख: {trackResult.lr_date}</span>
                <span className="mx-2 text-slate-400">|</span>
                <span>रूट: {trackResult.from_name} ➔ {trackResult.to_name}</span>
                <span className="mx-2 text-slate-400">|</span>
                <span className="font-semibold text-emerald-700">स्थिति: {trackResult.status}</span>
              </div>
            </div>
            <button onClick={() => setTrackResult(null)} className="p-1 text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {trackError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-rose-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{trackError}</span>
            </div>
            <button onClick={() => setTrackError('')} className="p-1 text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>त्वरित कार्य:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/consignments/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold">
              <Plus className="w-3.5 h-3.5" />
              <span>+ नई बिल्टी</span>
            </Link>
            <Link to="/bills/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold">
              <FileText className="w-3.5 h-3.5" />
              <span>+ नया बिल</span>
            </Link>
            <Link to="/mr" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold">
              <CreditCard className="w-3.5 h-3.5" />
              <span>+ मनी रिसीट (MR)</span>
            </Link>
            <Link to="/gadi-challan" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold">
              <Truck className="w-3.5 h-3.5" />
              <span>+ गाड़ी चालान</span>
            </Link>
            <button onClick={() => setShowCalculator(!showCalculator)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold border border-slate-300">
              <Calculator className="w-3.5 h-3.5 text-blue-600" />
              <span>किराया कैलकुलेटर</span>
            </button>
          </div>
        </div>

        {showCalculator && (
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-blue-800 pb-2">
              <h3 className="font-bold text-sm">स्मार्ट किराया कैलकुलेटर</h3>
              <button onClick={() => setShowCalculator(false)} className="text-blue-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCalculateRate} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-[11px] block mb-1">कहाँ से (From):</label>
                <input type="text" required placeholder="उदा. Delhi" value={calcForm.from_city} onChange={(e) => setCalcForm({ ...calcForm, from_city: e.target.value })} className="w-full text-xs bg-blue-950/60 border border-blue-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="text-[11px] block mb-1">कहाँ तक (To):</label>
                <input type="text" required placeholder="उदा. Mumbai" value={calcForm.to_city} onChange={(e) => setCalcForm({ ...calcForm, to_city: e.target.value })} className="w-full text-xs bg-blue-950/60 border border-blue-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="text-[11px] block mb-1">वजन (Kg):</label>
                <input type="number" placeholder="उदा. 250" value={calcForm.weight_kg} onChange={(e) => setCalcForm({ ...calcForm, weight_kg: e.target.value })} className="w-full text-xs bg-blue-950/60 border border-blue-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="text-[11px] block mb-1">पैकेजेस (Nag):</label>
                <input type="number" placeholder="उदा. 5" value={calcForm.packages} onChange={(e) => setCalcForm({ ...calcForm, packages: e.target.value })} className="w-full text-xs bg-blue-950/60 border border-blue-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <button type="submit" className="bg-amber-400 hover:bg-amber-300 text-blue-950 font-bold text-xs py-2 px-4 rounded-lg h-[35px]">भाड़ा निकालें</button>
            </form>
            {calcResult && (
              <div className="mt-3 pt-3 border-t border-blue-800 text-xs">
                {calcResult.found ? (
                  <span className="text-amber-300 font-bold">लागू दर: ₹{calcResult.calculation?.rate_applied} | कुल भाड़ा: ₹{calcResult.freight}</span>
                ) : (
                  <span className="text-rose-300">रेट कॉन्ट्रैक्ट नहीं मिला।</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase">आज की बुकिंग</span>
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.today_lr} बिल्टियां</div>
            <div className="mt-2 text-xs text-slate-600 flex justify-between border-t pt-2">
              <span>आज का रेवेन्यू:</span>
              <span className="font-bold text-emerald-600">₹{(stats.today_revenue || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase">इस माह की बुकिंग</span>
              <Calendar className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.month_lr} बिल्टियां</div>
            <div className="mt-2 text-xs text-slate-600 flex justify-between border-t pt-2">
              <span>माह का रेवेन्यू:</span>
              <span className="font-bold text-emerald-600">₹{(stats.month_revenue || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase">बकाया राशि</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-extrabold text-rose-600">₹{(stats.pending_amount || 0).toLocaleString('en-IN')}</div>
            <div className="mt-2 text-xs text-slate-600 flex justify-between border-t pt-2">
              <span>पेंडिंग बिल्टियां:</span>
              <span className="font-bold text-slate-800">{stats.pending_lr} एलआर</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase">नेटवर्क स्थिति</span>
              <Truck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex justify-between text-slate-900">
              <div>
                <span className="text-lg font-bold">{stats.active_vehicles || 0}</span>
                <span className="text-[10px] text-slate-500 block">गाड़ियां</span>
              </div>
              <div>
                <span className="text-lg font-bold">{stats.active_drivers || 0}</span>
                <span className="text-[10px] text-slate-500 block">ड्राइवर</span>
              </div>
              <div>
                <span className="text-lg font-bold">{stats.total_branches || 1}</span>
                <span className="text-[10px] text-slate-500 block">शाखाएं</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-600 flex justify-between border-t pt-2">
              <span>पेंडिंग POD:</span>
              <span className="font-bold text-amber-600">{stats.pending_pod || 0}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-slate-900">हालिया बिल्टियां</h3>
              <Link to="/consignments" className="text-xs text-blue-600 font-semibold hover:underline">सभी देखें ➔</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="p-2">LR No.</th>
                    <th className="p-2">दिनांक</th>
                    <th className="p-2">कंसाइनर</th>
                    <th className="p-2">कंसाइनी</th>
                    <th className="p-2 text-right">रकम</th>
                    <th className="p-2 text-center">स्थिति</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentData.bilties && recentData.bilties.length > 0 ? (
                    recentData.bilties.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-bold text-blue-700">{b.lr_no}</td>
                        <td className="p-2">{b.lr_date}</td>
                        <td className="p-2 truncate max-w-[120px]">{b.consignor_name}</td>
                        <td className="p-2 truncate max-w-[120px]">{b.consignee_name}</td>
                        <td className="p-2 text-right font-bold">₹{Number(b.grand_total || 0).toLocaleString('en-IN')}</td>
                        <td className="p-2 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100">{b.status}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" className="p-4 text-center text-slate-400">कोई डेटा नहीं मिला</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <h3 className="font-bold text-sm text-slate-900 mb-3">शीर्ष पार्टियां (Top Consignors)</h3>
            <div className="space-y-3">
              {topParties.length > 0 ? (
                topParties.map((p, idx) => (
                  <div key={idx} className="text-xs border-b pb-2">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{idx + 1}. {p.consignor_name}</span>
                      <span>₹{Number(p.total_revenue).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">{p.total_bilties} बिल्टियां</div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 py-4 text-xs">डेटा लोड हो रहा है...</div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        © 2026 भारत ट्रांसपोर्ट कंपनी (Bharat Transport Company) - समस्त अधिकार सुरक्षित।
      </footer>
    </div>
  );
}
