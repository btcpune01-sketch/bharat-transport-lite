import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export default function BranchDashboard() {
  const { branchCode } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({ 
    todaysLR: 0, monthLR: 0, totalLR: 0, 
    todaysRevenue: 0, monthRevenue: 0, 
    pendingAmount: 0, pendingLR: 0, 
    totalRevenue: 0, paidBilties: 0 
  });
  const [recentBilties, setRecentBilties] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!branchCode) return;
    const todayStr = currentTime.toISOString().split('T')[0];
    const firstDayMonth = new Date(currentTime.getFullYear(), currentTime.getMonth(), 1);
    const q = query(collection(db, 'consignments'), where('branch', '==', branchCode));

    const unsub = onSnapshot(q, (snapshot) => {
      let todaysLR=0, monthLR=0, totalLR=snapshot.size, todaysRevenue=0, monthRevenue=0, pendingAmount=0, pendingLR=0, totalRevenue=0, paidBilties=0;
      let recents = [];
      snapshot.forEach(doc => {
        const d = { id: doc.id, ...doc.data() };
        const createdDate = d.createdAt?.toDate ? d.createdAt.toDate() : (d.date ? new Date(d.date) : new Date());
        const createdStr = createdDate.toISOString().split('T')[0];
        const amount = Number(d.totalAmount || d.freight || d.grandTotal || 0);
        const isPaid = (d.paymentStatus || d.status || '').toLowerCase() === 'paid';
        if(createdStr===todayStr){todaysLR++; todaysRevenue+=amount;}
        if(createdDate>=firstDayMonth){monthLR++; monthRevenue+=amount;}
        if(!isPaid){pendingAmount+=amount; pendingLR++;} else {totalRevenue+=amount; paidBilties++;}
        recents.push(d);
      });
      recents.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
      setRecentBilties(recents.slice(0,5));
      setStats({ todaysLR, monthLR, totalLR, todaysRevenue, monthRevenue, pendingAmount, pendingLR, totalRevenue, paidBilties });
      setLoading(false);
    }, (error) => {
      console.error("Branch Dashboard Error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [branchCode, currentTime]);

  const timeString = currentTime.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true });
  const dateString = currentTime.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  const toSlug = (s) => s.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-');

  const cards = [
    { title:"Today's LR", value:stats.todaysLR, sub:`Month: ${stats.monthLR} | Total: ${stats.totalLR}`, gradient:"from-[#3f37c9] to-[#6c63ff]" },
    { title:"Today's Revenue", value:`₹${stats.todaysRevenue.toLocaleString('en-IN')}`, sub:`Month: ₹${stats.monthRevenue.toLocaleString('en-IN')}`, gradient:"from-[#1d4e89] to-[#2bb5a6]" },
    { title:"Pending Amount", value:`₹${stats.pendingAmount.toLocaleString('en-IN')}`, sub:`Pending LR: ${stats.pendingLR}`, gradient:"from-[#4a3f8a] to-[#f0a500]" },
    { title:"Total Revenue", value:`₹${stats.totalRevenue.toLocaleString('en-IN')}`, sub:`Paid: ${stats.paidBilties}`, gradient:"from-[#2c3e8a] to-[#6c63ff]" }
  ];

  const quickActions = [
    { label:'Bilty Entry', slug:'bilty-entry', color:'bg-[#2c5cc5]' },
    { label:'Consignments', slug:'consignments', color:'bg-[#1a9e6e]' },
    { label:'Bill Entry', slug:'bill-entry', color:'bg-[#e67e22]' },
    { label:'Money Receipt', slug:'money-receipt', color:'bg-[#34495e]' },
    { label:'Gadi Challan', slug:'gadi-challan', color:'bg-[#16a085]' },
    { label:'Gate Pass', slug:'gate-pass', color:'bg-[#2c5cc5]' },
    { label:'POD', slug:'pod', color:'bg-[#d4880f]' },
    { label:'Stock Report', slug:'stock-report', color:'bg-[#2c3e50]' },
  ];

  const allModules = {
    'BOOKING & BILTY': ['Bilty Entry', 'Consignments', 'Bilty Print', 'Gadi Challan', 'Gate Pass', 'Branch Transfer', 'Vehicle Tracking'],
    'BILLING & PAYMENT': ['Bill Entry', 'Bill List', 'Bill Print', 'Money Receipt', 'Payment Entry', 'To-Pay Report', 'Outstanding', 'Challan Payment', 'Profit Loss'],
    'POD & STOCK': ['POD', 'POD List', 'Stock Report', 'Stock Entry', 'Diesel Entry', 'Diesel Report'],
    'COMMISSION & REPORT': ['Commission', 'Commission Report', 'Cash Book', 'Ledger', 'GST', 'TDS', 'Expense', 'Income'],
    'MASTERS': ['Customer Master', 'Supplier', 'Driver', 'Vehicle', 'Tyre', 'Rate Master', 'City Master', 'Notification', 'Support']
  };

  if(loading) return <div className="p-10 text-center font-bold">Loading LIVE Branch Data for {branchCode}...</div>;

  return (
    <div className="min-h-screen bg-[#f5f7fb] -m-6 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[26px] font-bold text-[#1e293b]">Dashboard Overview - {branchCode}</h1>
          <p className="text-[14px] text-[#64748b]">Branch view - {branchCode} | LIVE Auto Update on Add/Delete/Edit</p>
        </div>
        <div className="text-right">
          <div className="text-[28px] font-bold text-[#1e293b]">{timeString} <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded-full ml-2 animate-pulse">LIVE</span></div>
          <div className="text-[13px] text-[#94a3b8]">{dateString}</div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex items-center gap-3">
        <div className="text-[14px] font-semibold text-[#334155]">🏢 Filter by Branch:</div>
        <div className="bg-[#f1f5f9] border rounded-lg px-3 py-1.5 text-[13px] font-medium">📍 {branchCode} (Current - LIVE Connected)</div>
        <div className="ml-auto flex gap-2">
          <span className="text-[11px] bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">Today LR: {stats.todaysLR}</span>
          <span className="text-[11px] bg-green-100 text-green-700 px-2.5 py-1 rounded-full">Total: {stats.totalLR}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {cards.map((c,i) => (
          <div key={i} className={`bg-gradient-to-br ${c.gradient} rounded-xl p-5 text-white shadow-lg hover:scale-[1.02] transition`}>
            <div className="text-[13px] opacity-90 font-medium">{c.title}</div>
            <div className="text-[32px] font-bold mt-2">{c.value}</div>
            <div className="text-[11px] opacity-80 mt-3 bg-white/20 inline-block px-2 py-1 rounded">{c.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="col-span-2">
          <h2 className="text-[16px] font-bold text-[#1e293b] mb-4">Quick Actions - {branchCode}</h2>
          <div className="grid grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <button key={action.slug} onClick={() => navigate(`/branch/${branchCode}/${action.slug}`)} className={`${action.color} rounded-xl p-4 text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition text-center min-h-[90px] text-[12px] font-semibold`}>{action.label}</button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <h3 className="font-bold text-[14px] mb-3">Recent 5 Bilties - LIVE ({branchCode})</h3>
          {recentBilties.length===0 ? <p className="text-[12px] text-gray-400">No bilty for this branch</p> :
            recentBilties.map(r => (
              <div key={r.id} className="flex justify-between py-2 border-b text-[12px]">
                <span className="font-medium">{r.biltyNo||r.lrNo||r.id.slice(0,6)}</span>
                <span className="font-bold">₹{Number(r.totalAmount||r.freight||0).toLocaleString()}</span>
                <span className={(r.paymentStatus||'').toLowerCase()==='paid'?'text-green-600':'text-orange-500'}>{r.paymentStatus||'Pending'}</span>
              </div>
            ))
          }
        </div>
      </div>
      <div className="space-y-5">
        {Object.entries(allModules).map(([catTitle, modules]) => (
          <div key={catTitle} className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-4 py-3 bg-[#f8fafc] border-b flex justify-between">
              <h3 className="text-[13px] font-bold text-[#475569]">{catTitle} ({modules.length})</h3>
              <span className="text-[11px] text-[#94a3b8]">LIVE - Delete/Edit pe auto update</span>
            </div>
            <div className="p-4 grid grid-cols-5 gap-3">
              {modules.map((mod) => (
                <button key={mod} onClick={() => navigate(`/branch/${branchCode}/${toSlug(mod)}`)} className="text-left p-3 border border-[#e2e8f0] rounded-lg hover:border-blue-400 hover:bg-blue-50 transition group">
                  <div className="text-[13px] font-medium group-hover:text-blue-600">{mod}</div>
                  <div className="text-[10px] text-[#94a3b8] mt-1">/{toSlug(mod)}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
