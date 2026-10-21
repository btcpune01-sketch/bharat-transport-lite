import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import api from '../api';

export default function BranchPayments() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    branch_id: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    type: 'given', // 'given' or 'received'
    payment_mode: 'Cash',
    notes: ''
  });

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, [selectedBranch]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Summary & Branches
      const summaryRes = await api.get('/api/branch-payments/summary');
      if (summaryRes.data.success) {
        setSummary(summaryRes.data.summary);
        setBranches(summaryRes.data.branches);
      }

      // Fetch Transactions
      const params = {};
      if (selectedBranch) params.branch_id = selectedBranch;
      
      const txRes = await api.get('/api/branch-payments', { params });
      if (txRes.data.success) {
        setTransactions(txRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching branch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.branch_id || !formData.amount) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const res = await api.post('/api/branch-payments', formData);
      if (res.data.success) {
        alert('Payment saved successfully!');
        setFormData({
          branch_id: '',
          date: new Date().toISOString().split('T')[0],
          amount: '',
          type: 'given',
          payment_mode: 'Cash',
          notes: ''
        });
        fetchData(); // Refresh data
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save payment');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading Branch Payments...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Branch Payments Ledger</h1>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm">Total Given</p>
            <p className="text-2xl font-bold text-gray-800">₹{Number(summary.total_given).toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
            <p className="text-gray-500 text-sm">Total Received</p>
            <p className="text-2xl font-bold text-gray-800">₹{Number(summary.total_received).toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500">
            <p className="text-gray-500 text-sm">Net Pending Balance</p>
            <p className="text-2xl font-bold text-gray-800">₹{Number(summary.current_balance).toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-lg font-semibold mb-4">Record Payment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2"
                  value={formData.branch_id}
                  onChange={(e) => setFormData({...formData, branch_id: e.target.value})}
                  required
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.branch_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg p-2"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    disabled={!isAdmin}
                  >
                    <option value="given">Given to Branch</option>
                    <option value="received">Received from Branch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-lg p-2"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg p-2"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2"
                  value={formData.payment_mode}
                  onChange={(e) => setFormData({...formData, payment_mode: e.target.value})}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea 
                  className="w-full border border-gray-300 rounded-lg p-2"
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Optional remarks..."
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium transition"
              >
                Save Payment
              </button>
            </form>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Recent Transactions</h2>
              <select 
                className="border border-gray-300 rounded-lg p-2 text-sm"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.branch_name}</option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-700 uppercase">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">No transactions found.</td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{tx.date}</td>
                        <td className="px-4 py-3 font-medium">{tx.branch_name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            tx.type === 'given' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {tx.type === 'given' ? 'Given' : 'Received'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${
                          tx.type === 'given' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {tx.type === 'given' ? '-' : '+'}₹{Number(tx.amount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800">
                          ₹{Number(tx.balance_after_transaction).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{tx.payment_mode}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
