import React from 'react';
import { Outlet, Link, useParams } from 'react-router-dom';

export default function BranchLayout() {
  const { branchCode } = useParams();
  const toSlug = (s) => s.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-');
  const menuGroups = [
    { title: 'BOOKING & BILTY', items: ['Dashboard', 'Bilty Entry', 'Consignments', 'Bilty Print', 'Gadi Challan', 'Gate Pass', 'Branch Transfer', 'Vehicle Tracking'] },
    { title: 'BILLING & PAYMENT', items: ['Bill Entry', 'Bill List', 'Bill Print', 'Money Receipt', 'Payment Entry', 'To-Pay Report', 'Outstanding', 'Challan Payment', 'Profit Loss'] },
    { title: 'POD & STOCK', items: ['POD', 'POD List', 'Stock Report', 'Stock Entry', 'Diesel Entry', 'Diesel Report'] },
    { title: 'COMMISSION & REPORT', items: ['Commission', 'Commission Report', 'Cash Book', 'Ledger', 'GST', 'TDS', 'Expense', 'Income'] },
    { title: 'MASTERS', items: ['Customer Master', 'Supplier', 'Driver', 'Vehicle', 'Tyre', 'Rate Master', 'City Master', 'Notification', 'Support'] }
  ];
  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      <div className="w-64 bg-[#111827] text-white flex flex-col fixed h-full overflow-y-auto">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-lg font-bold">Bharat Transport</h1>
          <p className="text-xs text-yellow-400 mt-1">BRANCH: {branchCode}</p>
        </div>
        <div className="flex-1 p-3">
          {menuGroups.map((group) => (
            <div key={group.title} className="mb-5">
              <h3 className="text-[10px] font-bold text-gray-400 tracking-wider mb-2">{group.title}</h3>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <Link key={item} to={`/branch/${branchCode}/${toSlug(item)}`} className="block text-[13px] py-1.5 px-2.5 rounded hover:bg-gray-800 text-gray-300 hover:text-white transition">{item}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-gray-800">
          <Link to="/" className="block text-xs text-center py-2 bg-gray-800 rounded hover:bg-gray-700">← Back to Admin</Link>
        </div>
      </div>
      <div className="flex-1 ml-64">
        <div className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="font-semibold text-gray-800">Branch Dashboard - {branchCode}</h2>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Active</span>
        </div>
        <div className="p-6"><Outlet /></div>
      </div>
    </div>
  );
}
