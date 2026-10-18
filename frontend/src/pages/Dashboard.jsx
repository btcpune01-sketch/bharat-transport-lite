import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ todaysLR:0, monthLR:0, totalLR:0, todaysRevenue:0, monthRevenue:0, pendingAmount:0, pendingLR:0, totalRevenue:0, paidBilties:0 })
  const [recentBilties, setRecentBilties] = useState([])
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [branches, setBranches] = useState([])
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const unsubBranches = onSnapshot(collection(db, 'branches'), (snap) => {
      setBranches(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, () => setBranches([]))

    const todayStr = currentTime.toISOString().split('T')[0]
    const firstDayMonth = new Date(currentTime.getFullYear(), currentTime.getMonth(), 1)
    const baseCol = collection(db, 'consignments')
    const q = selectedBranch === 'all' ? baseCol : query(baseCol, where('branch', '==', selectedBranch))

    const unsub = onSnapshot(q, (snapshot) => {
      let todaysLR=0, monthLR=0, totalLR=snapshot.size, todaysRevenue=0, monthRevenue=0, pendingAmount=0, pendingLR=0, totalRevenue=0, paidBilties=0
      let recents = []
      snapshot.forEach(doc => {
        const d = { id: doc.id, ...doc.data() }
        const createdDate = d.createdAt?.toDate ? d.createdAt.toDate() : (d.date ? new Date(d.date) : new Date())
        const createdStr = createdDate.toISOString().split('T')[0]
        const amount = Number(d.totalAmount || d.freight || d.grandTotal || 0)
        const isPaid = (d.paymentStatus || d.status || '').toLowerCase() === 'paid'
        if(createdStr===todayStr){todaysLR++; todaysRevenue+=amount}
        if(createdDate>=firstDayMonth){monthLR++; monthRevenue+=amount}
        if(!isPaid){pendingAmount+=amount; pendingLR++} else {totalRevenue+=amount; paidBilties++}
        recents.push(d)
      })
      recents.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0))
      setRecentBilties(recents.slice(0,5))
      setStats({ todaysLR, monthLR, totalLR, todaysRevenue, monthRevenue, pendingAmount, pendingLR, totalRevenue, paidBilties })
      setLoading(false)
    }, (err) => { console.error(err); setLoading(false) })

    return () => { 
      unsub()
      if (unsubBranches) unsubBranches() 
    }
  }, [selectedBranch, currentTime])

  const timeString = currentTime.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true })
  const dateString = currentTime.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })

  const cards = [
    { title:"Today's LR", value:stats.todaysLR, sub:`Month: ${stats.monthLR} | Total: ${stats.totalLR}`, gradient:"from-[#3f37c9] to-[#6c63ff]" },
    { title:"Today's Revenue", value:`₹${stats.todaysRevenue.toLocaleString('en-IN')}`, sub:`Month: ₹${stats.monthRevenue.toLocaleString('en-IN')}`, gradient:"from-[#1d4e89] to-[#2bb5a6]" },
    { title:"Pending Amount", value:`₹${stats.pendingAmount.toLocaleString('en-IN')}`, sub:`Pending LR: ${stats.pendingLR}`, gradient:"from-[#4a3f8a] to-[#f0a500]" },
    { title:"Total Revenue", value:`₹${stats.totalRevenue.toLocaleString('en-IN')}`, sub:`Paid Bilties: ${stats.paidBilties}`, gradient:"from-[#2c3e8a] to-[#6c63ff]" }
  ]

  if(loading) return <div className="p-10 text-center font-bold">Loading LIVE data...</div>

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-6">
      <div className="flex justify-between mb-6">
        <div><h1 className="text-[26px] font-bold">Dashboard Overview</h1><p className="text-[14px] text-[#64748b]">Consolidated view - LIVE Auto Update</p></div>
        <div className="text-right"><div className="text-[28px] font-bold">{timeString}</div><div className="text-[13px] text-[#94a3b8]">{dateString}</div></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex gap-3 items-center">
        <span className="text-[14px] font-semibold">🏢 Filter by Branch:</span>
        <select value={selectedBranch} onChange={e=>setSelectedBranch(e.target.value)} className="border rounded-lg px-3 py-2 text-[13px] min-w-[260px]">
          <option value="all">🌐 All Branches (Consolidated)</option>
          {branches.map(b=> <option key={b.id} value={b.code||b.name}>{b.name||b.code}</option>)}
        </select>
        <span className="ml-auto text-[11px] bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-bold animate-pulse">● LIVE - Main Data Connected</span>
      </div>
      <div className="grid grid-cols-4 gap-5 mb-8">
        {cards.map((c,i)=><div key={i} className={`bg-gradient-to-br ${c.gradient} rounded-xl p-5 text-white shadow-lg`}><div className="text-[13px] opacity-90">{c.title}</div><div className="text-[32px] font-bold mt-1">{c.value}</div><div className="text-[11px] bg-white/20 px-2 py-1 rounded inline-block mt-3">{c.sub}</div></div>)}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <h2 className="font-bold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              {l:'New Bilty',p:'/consignments/new',c:'bg-[#2c5cc5]'},{l:'New Bill',p:'/bill/new',c:'bg-[#1a9e6e]'},{l:'Money Receipt',p:'/mr/create',c:'bg-[#e67e22]'},{l:'Gadi Challan',p:'/gadi-challan',c:'bg-[#34495e]'},{l:'E-Way Bill',p:'/eway',c:'bg-[#16a085]'},{l:'Manifest',p:'/transit',c:'bg-[#2c5cc5]'},{l:'Branches',p:'/branches',c:'bg-[#d4880f]'},{l:'Stock Mgmt',p:'/stock',c:'bg-[#2c3e50]'}
            ].map(a=><button key={a.l} onClick={()=>navigate(a.p)} className={`${a.c} rounded-xl p-4 text-white text-[12px] font-semibold min-h-[90px]`}>{a.l}</button>)}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-bold text-[14px] mb-3">Recent 5 Bilties - LIVE</h3>
          {recentBilties.length===0 ? <p className="text-[12px] text-gray-400">No data</p> :
            recentBilties.map(r=><div key={r.id} className="flex justify-between py-2 border-b text-[12px]"><span>{r.biltyNo||r.lrNo||r.id.slice(0,6)}</span><span className="font-bold">₹{Number(r.totalAmount||r.freight||0).toLocaleString()}</span><span className={r.paymentStatus==='Paid'?'text-green-600':'text-orange-500'}>{r.paymentStatus||'Pending'}</span></div>)
          }
        </div>
      </div>
    </div>
  )
}
