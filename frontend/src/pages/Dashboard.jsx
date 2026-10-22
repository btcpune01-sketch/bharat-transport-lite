curl -sSL "https://raw.githubusercontent.com/nakshcargo-bot/bharat-transport-lite/main/backend/server.js" > /dev/null && git pull origin main --no-edit 2>/dev/null; cat << 'EOF' > frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, Percent, FileText, Truck, Users, Clock,
  CheckCircle2, AlertTriangle, ShieldCheck, ArrowUpRight, Plus, RefreshCw, Building2,
  Calendar, CreditCard, ChevronRight, ChevronDown, PackageCheck, ReceiptText, Search,
  Layers, MapPin, AlertCircle, Calculator, HardDriveDownload, ShieldAlert, Compass,
  FileSpreadsheet, FileCheck2, UserCheck, LogOut, Navigation, FilePlus, Coins,
  Receipt, Boxes, History, X
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
      else setTrackError(data.error || 'बिल्टी नहीं मिली। कृपया LR नंबर चेक करें।');
    } catch (err) {
      setTrackError('ट्रैकिंग सर्वर से संपर्क नहीं हो सका।');
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
    } catch (err) {}
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navCategories = [
    {
      id: 'dashboard', label: '1. डैशबोर्ड', icon: TrendingUp, color: 'text-blue-600',
      items: [
        { title: 'डैशबोर्ड ओवरव्यू', desc: 'लाइव व्यापार स्थिति व मुख्य मेट्रिक्स', path: '/', icon: TrendingUp },
        { title: 'ब्रांच डेटा रीफ्रेश', desc: 'डेटा तुरंत अपडेट करें', action: fetchDashboardData, icon: RefreshCw }
      ]
    },
    {
      id: 'bilty', label: '2. बिल्टी / बुकिंग', icon: FileText, color: 'text-indigo-600',
      items: [
        { title: 'नई बिल्टी बुकिंग', desc: 'नया LR जनरेट करें', path: '/consignments/new', icon: Plus },
        { title: 'समस्त बिल्टी रजिस्टर', desc: 'सभी बुक की गई बिल्टियों की सूची', path: '/consignments', icon: FileText },
        { title: 'ई-वे बिल (E-Way Bills)', desc: 'ई-वे बिल एक्सपायरी व वाहन अपडेट', path: '/eway-bills', icon: ShieldCheck },
        { title: 'क्विक LR ट्रैकिंग', desc: 'LR स्टेटस तुरंत चेक करें', action: () => document.getElementById('lr-track-input')?.focus(), icon: Search }
      ]
    },
    {
      id: 'fleet', label: '3. वाहन व ड्राइवर', icon: Truck, color: 'text-emerald-600',
      items: [
        { title: 'वाहन प्रबंधन (Vehicles)', desc: 'गाड़ियों का विवरण व आरसी रिकॉर्ड', path: '/vehicles', icon: Truck },
        { title: 'चालक सूची (Drivers)', desc: 'ड्राइवर प्रोफाइल, लाइसेंस व फोन', path: '/drivers', icon: Users },
        { title: 'दस्तावेज़ एक्सपायरी अलर्ट', desc: 'बीमा, फिटनेस व परमिट नवीनीकरण', path: '/vehicles/expiring', icon: ShieldAlert }
      ]
    },
    {
      id: 'operations', label: '4. ऑपरेशन्स', icon: Navigation, color: 'text-amber-600',
      items: [
        { title: 'गाड़ी चालान (Challan)', desc: 'लोरी हायर चालान व एडवांस पेमेंट', path: '/gadi-challan', icon: FileSpreadsheet },
        { title: 'गेट पास (Gate Pass)', desc: 'लोडिंग व अनलोडिंग पास', path: '/gate-pass', icon: FileCheck2 },
        { title: 'मैनिफेस्ट (Manifest)', desc: 'गाड़ी लोडिंग चालान व बिल्टी सूची', path: '/manifests', icon: Layers },
        { title: 'ट्रिप मैनेजमेंट (Trips)', desc: 'रूट, हब व दूरी योजना', path: '/trips', icon: Compass }
      ]
    },
    {
      id: 'pod', label: '5. डिलीवरी / POD', icon: PackageCheck, color: 'text-teal-600',
      items: [
        { title: 'POD रजिस्टर', desc: 'प्राप्त डिलीवरी रसीद व हस्ताक्षर', path: '/pod', icon: PackageCheck },
        { title: 'पब्लिक POD व्यू', desc: 'ग्राहकों के लिए डिलीवरी स्टेटस', path: '/public/pod-view', icon: CheckCircle2 }
      ]
    },
    {
      id: 'parties', label: '6. पार्टी व ग्राहक', icon: Users, color: 'text-cyan-600',
      items: [
        { title: 'कस्टमर डायरेक्टरी', desc: 'नियमित ग्राहक व क्रेडिट सीमा', path: '/customers', icon: Users },
        { title: 'पार्टी मास्टर (Parties)', desc: 'कंसाइनर व कंसाइनी का जीएसटी खाता', path: '/parties', icon: Building2 },
        { title: 'स्मार्ट रेट कॉन्ट्रैक्ट्स', desc: 'पार्टी अनुसार तय दरें', path: '/rates', icon: Coins },
        { title: 'भाड़ा कैलकुलेटर', desc: 'वजन व पैकेज अनुसार तुरंत किराया', action: () => setShowCalculator(true), icon: Calculator }
      ]
    },
    {
      id: 'billing', label: '7. बिलिंग / इनवॉइस', icon: ReceiptText, color: 'text-violet-600',
      items: [
        { title: 'बिल बुक (Bill Book)', desc: 'तैयार किए गए जीएसटी फ्रेट बिल्स', path: '/bills', icon: ReceiptText },
        { title: 'नया बिल बनाएं', desc: 'बिल्टियों को जोड़कर इनवॉइस काटें', path: '/bills/new', icon: Plus }
      ]
    },
    {
      id: 'receipts', label: '8. भुगतान / MR', icon: CreditCard, color: 'text-purple-600',
      items: [
        { title: 'मनी रिसीट (MR)', desc: 'कैश, यूपीआई व बैंक पेमेंट रसीदें', path: '/mr', icon: CreditCard },
        { title: 'पार्टी लेज़र (Ledger)', desc: 'लेन-देन खाता व रनिंग बैलेंस', path: '/ledger', icon: History },
        { title: 'बकाया राशि (Outstanding)', desc: 'पार्टियों से वसूलने योग्य रकम', path: '/outstanding', icon: AlertTriangle }
      ]
    },
    {
      id: 'finance', label: '9. अकाउंट्स व वित्त', icon: DollarSign, color: 'text-rose-600',
      items: [
        { title: 'वित्तीय सारांश (P&L)', desc: 'कुल आमदनी, देनदारी व शुद्ध लाभ', path: '/accounts/summary', icon: DollarSign },
        { title: 'दैनिक खर्चे (Expenses)', desc: 'ऑफिस, डीजल व टोल खर्च रिकॉर्ड', path: '/expenses', icon: Receipt },
        { title: 'टीडीएस रजिस्टर (TDS)', desc: 'गाड़ी चालान से काटा गया टीडीएस', path: '/accounts/tds-register', icon: Percent },
        { title: 'कमीशन व क्लेम्स', desc: 'दलाल कमीशन व क्लेम निपटान', path: '/commissions', icon: ShieldCheck }
      ]
    },
    {
      id: 'admin', label: '10. प्रशासन / स्टॉक', icon: Building2, color: 'text-slate-700',
      items: [
        { title: 'शाखाएं (Branches)', desc: 'ब्रांच नेटवर्क व लॉगिन सेटअप', path: '/branches', icon: Building2 },
        { title: 'ब्रांच लेज़र (Branch Ledger)', desc: 'हेड ऑफिस और ब्रांच के बीच लेन-देन', path: '/branch-payments', icon: Coins },
        { title: 'दस्तावेज़ स्टॉक (Stock)', desc: 'बिल्टी, एमआर, चालान बची हुई कॉपी', path: '/stock', icon: Boxes },
        { title: 'यूज़र्स व ऑपरेटर', desc: 'स्टाफ अकाउंट व अधिकार', path: '/users', icon: UserCheck },
        { title: 'ऑडिट लॉग्स', desc: 'सिस्टम में किए गए बदलावों की हिस्ट्री', path: '/audit', icon: History },
        { title: 'बैकअप व रिस्टोर', desc: 'डेटाबेस बैकअप डाउनलोड व इंपोर्ट', path: '/backup', icon: HardDriveDownload }
      ]
    }
  ];

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
                <h1 className="font-extrabold text-lg text-slate-900 tracking-tight">भारत ट्रांसपोर्ट कंपनी</h1>
                <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">TMS v6.0 Live</span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <span>{new Date().toLocaleDateString('hi-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                <span className="inline-block w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> सिस्टम ऑनलाइन
                </span>
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <form onSubmit={handleQuickTrack} className="relative w-72">
              <input
                id="lr-track-input"
                type="text"
                placeholder="LR / बिल्टी नंबर डालें..."
                value={trackLr}
                onChange={(e) => setTrackLr(e.target.value)}
                className="w-full text-xs bg-slate-100 hover:bg-slate-50 focus:bg-white pl-8 pr-16 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              <button type="submit" disabled={trackLoading} className="absolute right-1 top-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors">
                {trackLoading ? '...' : 'ट्रैक'}
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
                  <option value="all">सभी शाखाएं (All Branches)</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</option>
                  ))}
                </select>
              </div>
            )}

            <button onClick={fetchDashboardData} disabled={refreshing} title="डेटा रीफ्रेश करें" className="p-2 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors">
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
              <button onClick={handleLogout} title="लॉगआउट" className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors">
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
                          <span className="text-[10px] text-blue-600 lowercase">{cat.items.length} विकल्प</span>
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
                <span>तारीख: {trackResult.lr_date}</span>
                <span className="mx-2 text-slate-400">|</span>
                <span>रूट: {trackResult.from_name} ➔ {trackResult.to_name}</span>
                <span className="mx-2 text-slate-400">|</span>
                <span className="font-semibold text-emerald-700">स्थिति: {trackResult.status} ({trackResult.pod_status || 'Pending POD'})</span>
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
                <span className="font-bold">{expiringVehicles.length} वाहनों के दस्तावेज़ (फिटनेस / बीमा / परमिट) 30 दिनों में समाप्त हो रहे हैं!</span>
                <span className="ml-2 text-amber-800 underline cursor-pointer" onClick={() => navigate('/vehicles/expiring')}>
                  यहाँ देखें ➔
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pl-1">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>त्वरित कार्य (Quick Actions):</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/consignments/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors">
              <FilePlus className="w-3.5 h-3.5" />
              <span>+ नई बिल्टी</span>
            </Link>
            <Link to="/bills/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors">
              <ReceiptText className="w-3.5 h-3.5" />
              <span>+ नया बिल</span>
            </Link>
            <Link to="/mr" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors">
              <CreditCard className="w-3.5 h-3.5" />
              <span>+ मनी रिसीट (MR)</span>
            </Link>
            <Link to="/gadi-challan" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors">
              <Truck className="w-3.5 h-3.5" />
              <span>+ गाड़ी चालान</span>
            </Link>
            <button onClick={() => setShowCalculator(!showCalculator)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors border border-slate-300">
              <Calculator className="w-3.5 h-3.5 text-blue-600" />
              <span>किराया कैलकुलेटर</span>
            </button>
          </div>
        </div>

        {showCalculator && (
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-blue-800 pb-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">स्मार्ट किराया कैलकुलेटर (Freight Rate Engine)</h3>
              </div>
              <button onClick={() => setShowCalculator(false)} className="text-blue-300 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCalculateRate} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-[11px] font-medium text-blue-200 block mb-1">कहाँ से (From City):</label>
                <input type="text" required placeholder="उदा. Delhi" value={calcForm.from_city} onChange={(e) => setCalcForm({ ...calcForm, from_city: e.target.value })} className="w-full text-xs bg-blue-950/60 border border-blue-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-blue-200 block mb-1">कहाँ तक (To City):</label>
                <input type="text" required placeholder="उदा. Mumbai" value={calcForm.to_city} onChange={(e) => setCalcForm({ ...calcForm, to_city: e.target.value })} className="w-full text-xs bg-blue-950/60 border border-blue-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-blue-200 block mb-1">वजन (Kg):</label>
                <input type="number" placeholder="उदा. 250" value={calcForm.weight_kg} onChange={(e) => setCalcForm({ ...calcForm, weight_kg: e.target.value })} className="w-full text-xs bg-blue-950/60 border border-blue-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-blue-200 block mb-1">पैकेजेस (Nag):</label>
                <input type="number" placeholder="उदा. 5" value={calcForm.packages} onChange={(e) => setCalcForm({ ...calcForm, packages: e.target.value })} className="w-full text-xs bg-blue-950/60 border border-blue-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400" />
              </div>
              <button type="submit" className="bg-amber-400 hover:bg-amber-300 text-blue-950 font-extrabold text-xs py-2 px-4 rounded-lg transition-colors h-[35px]">भाड़ा निकालें</button>
            </form>
            {calcResult && (
              <div className="mt-3 pt-3 border-t border-blue-800 flex items-center justify-between text-xs">
                {calcResult.found ? (
                  <div className="flex items-center gap-4">
                    <span className="text-emerald-300 font-bold">लागू दर: ₹{calcResult.calculation?.rate_applied}</span>
                    <span className="text-amber-300 font-extrabold text-sm">कुल भाड़ा: ₹{calcResult.freight}</span>
                    {calcResult.calculation?.min_charge && <span className="text-blue-300 text-[11px]">(न्यूनतम चार्ज: ₹{calcResult.calculation?.min_charge})</span>}
                  </div>
                ) : (
                  <span className="text-rose-300">इस रूट के लिए कोई रेट कॉन्ट्रैक्ट नहीं मिला।</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">आज की बुकिंग</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 leading-tight">
              {stats.today_lr} <span className="text-xs font-medium text-slate-500">बिल्टियां</span>
            </div>
            <div className="mt-2 text-xs text-slate-600 flex items-center justify-between pt-2 border-t border-slate-100">
              <span>आज का रेवेन्यू:</span>
              <span className="font-bold text-emerald-600">₹{(stats.today_revenue || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">इस माह की बुकिंग</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 leading-tight">
              {stats.month_lr} <span className="text-xs font-medium text-slate-500">बिल्टियां</span>
            </div>
            <div className="mt-2 text-xs text-slate-600 flex items-center justify-between pt-2 border-t border-slate-100">
              <span>माह का रेवेन्यू:</span>
              <span className="font-bold text-emerald-600">₹{(stats.month_revenue || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">बकाया राशि (Pending)</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-rose-600 leading-tight">
              ₹{(stats.pending_amount || 0).toLocaleString('en-IN')}
            </div>
            <div className="mt-2 text-xs text-slate-600 flex items-center justify-between pt-2 border-t border-slate-100">
              <span>पेंडिंग बिल्टियां:</span>
              <span className="font-bold text-slate-800">{stats.pending_lr} एलआर</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">फ्लीट व नेटवर्क स्थिति</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center justify-between text-slate-900">
              <div>
                <span className="text-xl font-bold">{stats.active_vehicles || 0}</span>
                <span className="text-[11px] text-slate-500 block">सक्रिय गाड़ियां</span>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <span className="text-xl font-bold">{stats.active_drivers || 0}</span>
                <span className="text-[11px] text-slate-500 block">सक्रिय चालक</span>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <span className="text-xl font-bold">{stats.total_branches || 1}</span>
                <span className="text-[11px] text-slate-500 block">शाखाएं</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-600 flex items-center justify-between pt-2 border-t border-slate-100">
              <span>पेंडिंग POD:</span>
              <span className="font-bold text-amber-600">{stats.pending_pod || 0} डिलीवरी</span>
            </div>
          </div>
        </div>

        {stockList.length > 0 && (
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-indigo-600" />
                स्टेशनरी व प्रिंटेड बुक्स स्टॉक (Remaining Stationery Stock):
              </span>
              <Link to="/stock" className="text-[11px] font-semibold text-blue-600 hover:underline">
                स्टॉक प्रबंधन ➔
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
                <h3 className="font-bold text-sm text-slate-900">हालिया बुक की गई बिल्टियां (Recent Bilties)</h3>
              </div>
              <Link to="/consignments" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-0.5">
                <span>सभी देखें</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3.5">LR No.</th>
                    <th className="py-2.5 px-3">दिनांक</th>
                    <th className="py-2.5 px-3">कंसाइनर (भेजने वाला)</th>
                    <th className="py-2.5 px-3">कंसाइनी (पाने वाला)</th>
                    <th className="py-2.5 px-3 text-right">कुल रकम</th>
                    <th className="py-2.5 px-3 text-center">भुगतान</th>
                    <th className="py-2.5 px-3 text-center">स्थिति</th>
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
                        कोई हालिया बिल्टी नहीं मिली। नई बिल्टी बनाने के लिए "+ नई बिल्टी" पर क्लिक करें।
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
                <h3 className="font-bold text-sm text-slate-900">शीर्ष पार्टियां (Top Consignors)</h3>
              </div>
              <Link to="/parties" className="text-xs font-semibold text-blue-600 hover:underline">पार्टी खाता ➔</Link>
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
                          <span>{party.total_bilties} बिल्टियां बुक</span>
                          <span>{percent}% शेयर</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">शीर्ष पार्टियों का डेटा एकत्रित हो रहा है...</div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/70 p-2.5 rounded-lg flex items-center gap-2 text-[11px] text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>सभी लेन-देन PostgreSQL (Neon) एनक्रिप्टेड क्लाउड में सुरक्षित हैं।</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 भारत ट्रांसपोर्ट कंपनी (Bharat Transport Company) - समस्त अधिकार सुरक्षित।</span>
          <div className="flex items-center gap-4 text-slate-600 font-medium">
            <Link to="/branches" className="hover:text-blue-600">शाखाएं</Link>
            <Link to="/stock" className="hover:text-blue-600">स्टॉक</Link>
            <Link to="/audit" className="hover:text-blue-600">ऑडिट</Link>
            <Link to="/backup" className="hover:text-blue-600">बैकअप</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
EOF
git add frontend/src/pages/Dashboard.jsx && git commit -m "Upgrade dashboard: 10 categorized menu bars with complete TMS integration" && git push origin main && echo "🎉 SUCCESS: Complete 10-Category Dashboard pushed to GitHub!"
