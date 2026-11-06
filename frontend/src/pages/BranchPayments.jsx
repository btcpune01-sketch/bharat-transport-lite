import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import api from '../api';
import { canDeleteRecords, confirmRecordDeletion, recordDeletionHeaders } from '../utils/recordDeletion';

export default function BranchPayments() {
  const { currentUser } = useAuth();
  const canDelete = canDeleteRecords(currentUser?.role);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [filterBranch, setFilterBranch] = useState('');
  const [branches, setBranches] = useState([]);

  const [formData, setFormData] = useState({
    branch_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    type: 'given',
    payment_mode: 'Cash',
    notes: ''
  });

  useEffect(() => {
    fetchBranches();
    fetchPayments();
  }, [filterBranch]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches');
      setBranches(res.data?.data || []);
    } catch (err) {
      console.error('Branches fetch error:', err);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterBranch) params.branch_id = filterBranch;
      const res = await api.get('/branch-payments', { params });
      const rows = res.data?.data || [];
      setPayments(rows);
      setTotal(rows.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
    } catch (err) {
      console.error('Payments fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.branch_id || !formData.amount) {
      alert('Branch और Amount ज़रूरी हैं!');
      return;
    }
    try {
      await api.post('/branch-payments', formData);
      alert('Payment सफलतापूर्वक Save हो गई!');
      setFormData({
        branch_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        type: 'given',
        payment_mode: 'Cash',
        notes: ''
      });
      fetchPayments();
    } catch (err) {
      alert(err.response?.data?.error || 'Payment save करने में Error!');
    }
  };

  const handleDelete = async (payment) => {
    if (!confirmRecordDeletion()) return;
    try {
      await api.delete(`/branch-payments/${payment.id}`, { headers: recordDeletionHeaders });
      alert('Payment archived. Its history remains in the database and backups.');
      await fetchPayments();
    } catch (error) {
      alert(error.response?.data?.error || 'Unable to archive payment.');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
        <p className="text-gray-600">Loading Branch Payments...</p>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen w-full bg-[#eef2f7]">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Branch Payments Ledger</h1>

      {/* Summary Card */}
      <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500 mb-6">
        <p className="text-gray-500 text-sm">Total Payments</p>
        <p className="text-3xl font-bold text-gray-800">₹{Number(total).toLocaleString('en-IN')}</p>
        <p className="text-sm text-gray-500 mt-1">{payments.length} transactions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-lg font-semibold mb-4">Record New Payment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-2"
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  required
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.branch_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg p-2"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg p-2"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-2"
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank">Bank</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-2"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="given">Given to branch</option>
                  <option value="received">Received from branch</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Reference</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="UTR / Cheque No. / remarks"
                  maxLength={1000}
                />
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

        {/* Payments Table */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Recent Payments</h2>
              <select
                className="border border-gray-300 rounded-lg p-2 text-sm"
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
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
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Type / Reference</th>
                    {canDelete && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={canDelete ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                        No payments found.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {p.date ? new Date(`${p.date}T00:00:00`).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="px-4 py-3 font-medium">{p.branch_name}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">
                          ₹{Number(p.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            {p.payment_mode || 'Cash'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{p.type} / {p.notes || '—'}</td>
                        {canDelete && <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDelete(p)} className="rounded bg-red-100 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-200">
                            Archive
                          </button>
                        </td>}
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
