import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

const Consignments = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [consignments, setConsignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const dateParts = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    const date = dateParts
      ? new Date(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3]))
      : new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  useEffect(() => {
    fetchConsignments();
  }, []);

  const fetchConsignments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token && !localStorage.getItem('branch_session')) {
        setError('Please login first');
        setLoading(false);
        return;
      }

      const response = await api.get('/consignments');
      const dataArray = response.data?.data || response.data || [];
      setConsignments(Array.isArray(dataArray) ? dataArray : []);
      setError('');
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch consignments');
      setConsignments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredConsignments = consignments.filter(c => {
    const matchesSearch = !searchTerm ||
      c.lr_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.consignor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.consignee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.from_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.to_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const date = String(c.lr_date || '').slice(0, 10);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const filter = searchParams.get('filter');
    const matchesDate = filter === 'today'
      ? date === today
      : filter === 'month' ? date.startsWith(today.slice(0, 7)) : true;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleDelete = async (id, lr_no) => {
    if (!window.confirm(`Delete Bilty ${lr_no}?`)) return;

    try {
      await api.delete(`/consignments/${id}`);
      toast.success('Deleted');
      await fetchConsignments();
    } catch (err) {
      console.error('Delete consignment error:', err);
      toast.error(err.response?.data?.error || 'Failed to delete consignment');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'In-Transit': return 'bg-blue-100 text-blue-800';
      case 'Booked': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Consignments (Bilty)</h1>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="self-start rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50 sm:self-auto"
        >
          ← Back to Dashboard
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={fetchConsignments} className="ml-4 underline">Retry</button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by LR no, consignor, consignee, from, to..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2"
        >
          <option value="all">All Status</option>
          <option value="Booked">Booked</option>
          <option value="In-Transit">In-Transit</option>
          <option value="Delivered">Delivered</option>
        </select>
        <button
          type="button"
          onClick={() => navigate('/consignments/new')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition whitespace-nowrap flex items-center justify-center gap-2"
        >
          <Truck size={18} aria-hidden="true" />
          Bilty Banao
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">LR No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Consignor</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Consignee</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">From → To</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Weight</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredConsignments.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                    {error ? 'Consignment data is unavailable. Retry to load the list.' : 'No consignments found'}
                  </td>
                </tr>
              ) : (
                filteredConsignments.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">{c.lr_no}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(c.lr_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.consignor_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.consignee_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.from_name} → {c.to_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{Number(c.actual_weight) > 0 ? c.actual_weight : Number(c.act_wt ?? c.actWt) > 0 ? c.act_wt ?? c.actWt : Number(c.charged_weight) > 0 ? c.charged_weight : Number(c.chg_wt ?? c.chgWt) > 0 ? c.chg_wt ?? c.chgWt : c.weight || '-'} kg</td>
                    <td className="px-4 py-3 text-sm text-gray-700">₹{Number(c.grand_total ?? c.freight ?? 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.payment_status || 'Unpaid'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 justify-start">
                        <button
                          type="button"
                          onClick={() => navigate(`/bilty-print/${c.id}`)}
                          className="text-blue-600 hover:text-blue-800 p-1 transition"
                          title="Print Bilty"
                        >
                          🖨️
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/consignments/${c.id}/edit`)}
                          className="text-green-600 hover:text-green-800 p-1 transition"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id, c.lr_no)}
                          className="text-red-600 hover:text-red-800 p-1 transition"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!error && <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white shadow-md rounded-lg p-4">
          <h3 className="text-sm text-gray-600">Total Consignments</h3>
          <p className="text-2xl font-bold text-gray-800">{consignments.length}</p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-4">
          <h3 className="text-sm text-gray-600">Booked</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {consignments.filter(c => c.status === 'Booked').length}
          </p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-4">
          <h3 className="text-sm text-gray-600">In Transit</h3>
          <p className="text-2xl font-bold text-blue-600">
            {consignments.filter(c => c.status === 'In-Transit').length}
          </p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-4">
          <h3 className="text-sm text-gray-600">Delivered</h3>
          <p className="text-2xl font-bold text-green-600">
            {consignments.filter(c => c.status === 'Delivered').length}
          </p>
        </div>
      </div>}
    </div>
  );
};

export default Consignments;
