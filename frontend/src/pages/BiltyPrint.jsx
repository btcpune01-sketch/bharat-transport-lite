import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../api';

const API_URL = import.meta.env.VITE_API_URL || 'https://bharat-transport-api.onrender.com';

const preferredMeasurement = (primary, legacy) => {
  const primaryNumber = Number(primary);
  const legacyNumber = Number(legacy);
  if (primary !== null && primary !== undefined && primary !== '' && primaryNumber !== 0) return primary;
  if (legacy !== null && legacy !== undefined && legacy !== '' && legacyNumber !== 0) return legacy;
  return primary ?? legacy ?? 0;
};

const BiltyPrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [bilties, setBilties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [includeMR, setIncludeMR] = useState(false);
  const [mrData, setMrData] = useState({ party_name: '', amount: '', payment_mode: 'Cash', remarks: '' });
  const [copies, setCopies] = useState({
    CONSIGNOR_COPY: true,
    CONSIGNEE_COPY: true,
    LORRY_COPY: true,
    HO_COPY: true
  });

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
    if (id) fetchBiltyData();
  }, [id]);

  useEffect(() => {
    if (id) return;
    let active = true;
    setLoading(true);
    api.get('/api/consignments')
      .then(response => {
        if (active) setBilties(response.data?.data || []);
      })
      .catch(err => {
        console.error('Error fetching bilties:', err);
        if (active) setError(err.response?.data?.error || 'Unable to load Bilty records.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  const fetchBiltyData = async () => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/consignments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const bilty = res.data;
      setData({
        ...bilty,
        actual_weight: preferredMeasurement(bilty.actual_weight, bilty.act_wt ?? bilty.actWt),
        charged_weight: preferredMeasurement(bilty.charged_weight, bilty.chg_wt ?? bilty.chgWt),
        no_of_packages: preferredMeasurement(bilty.no_of_packages, bilty.package_count),
        length: preferredMeasurement(bilty.length, bilty.l),
        width: preferredMeasurement(bilty.width, bilty.w),
        height: preferredMeasurement(bilty.height, bilty.h),
        method_of_packing: bilty.method_of_packing || bilty.package_type || '',
        total_cft: preferredMeasurement(bilty.total_cft, bilty.total_cft_cmt ?? bilty.cft_cmt)
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching bilty:', err);
      setError(err.response?.data?.error || 'Unable to load this Bilty.');
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBackToList = () => navigate('/consignments');
  const handleBack = () => navigate('/consignments');

  const handleWhatsAppShare = () => {
    if (!data) return;
    const mrText = includeMR ? `\nMR Party: ${mrData.party_name}\nMR Amount: ₹${mrData.amount} (${mrData.payment_mode})` : '';
    const text = `*🚚 BHARAT TRANSPORT COMPANY - Bilty Details*\n\n📜 LR No: ${data.lr_no}\n📅 Date: ${formatDate(data.lr_date)}\n Consignor: ${data.consignor_name}\n🏁 Consignee: ${data.consignee_name}\n📍 Route: ${data.from_name} → ${data.to_name}\n💰 Total Freight: ₹${data.grand_total || data.freight}\n📦 Status: ${data.status}${mrText}\n\nThank you for choosing us!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (loading) return <div role="status" className="text-center p-10 text-xl font-bold">Loading Bilty Data...</div>;
  if (!id) return (
    <div className="min-h-screen bg-gray-100 p-4">
      <main className="max-w-5xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Select a Bilty to Print</h1>
          <button onClick={handleBack} className="px-4 py-2 bg-gray-600 text-white rounded-lg">← Back</button>
        </div>
        {error && <p role="alert" className="text-red-700 mb-4">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr><th className="p-3">LR No.</th><th className="p-3">Date</th><th className="p-3">Consignor</th><th className="p-3">Consignee</th><th className="p-3">Action</th></tr>
            </thead>
            <tbody>
              {bilties.length === 0 ? (
                <tr><td colSpan="5" className="p-6 text-center text-gray-500">No bilties found.</td></tr>
              ) : bilties.map(bilty => (
                <tr key={bilty.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-semibold">{bilty.lr_no}</td>
                  <td className="p-3">{formatDate(bilty.lr_date)}</td>
                  <td className="p-3">{bilty.consignor_name || '-'}</td>
                  <td className="p-3">{bilty.consignee_name || '-'}</td>
                  <td className="p-3"><Link className="text-blue-700 underline" to={`/bilty-print/${bilty.id}`}>Print</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center bg-white p-6 rounded-lg shadow">
        <p role="alert" className="text-red-700 mb-4">{error || 'Bilty data is unavailable.'}</p>
        <button onClick={handleBackToList} className="px-4 py-2 bg-gray-600 text-white rounded-lg">← Back</button>
      </div>
    </div>
  );

  const total = (parseFloat(data.freight || 0) + parseFloat(data.aoc_percent || 0) + parseFloat(data.material_mgmt_ch || 0) + parseFloat(data.material_charges || 0) + parseFloat(data.collection_charges || 0) + parseFloat(data.door_dly_charges || 0) + parseFloat(data.misc_charges || 0)).toFixed(2);

  const BiltySheet = ({ copyLabel, theme }) => (
    <div className={`bilty-container ${theme} mb-8`} style={{ width: '190mm', minHeight: '250mm', background: '#fff', margin: '10px auto', border: '2px solid #000', padding: '4mm', position: 'relative', pageBreakAfter: 'always' }}>
      <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center opacity-10">
        <span className="text-8xl font-black tracking-widest -rotate-12 select-none">BTC</span>
      </div>

      <div className="relative z-20">
        <div className="text-center border-b-2 border-black p-2" style={{ backgroundColor: 'var(--bg-accent, #f8f9ff)' }}>
          <h1 className="text-2xl font-bold m-0" style={{ color: 'var(--primary-color, #000)' }}>BHARAT TRANSPORT COMPANY</h1>
          <p className="text-xs font-bold m-1">Head Office: Ward No. 17, Purana Falsa, Pilani Road, Rajgarh, Churu, Rajasthan 331023</p>
          <p className="text-xs font-bold m-1">GST NO: 08CMRPP0955N1Z5 | PAN NO: CMRPP0955N</p>
        </div>

        <div className="text-center my-2">
          <div className="border border-black px-5 py-1 font-bold inline-block text-xs" style={{ backgroundColor: 'var(--bg-accent, #f8f9ff)' }}>Goods Carried At Owner's Risk</div>
          <br />
          <div className="border-2 px-6 py-1 font-bold inline-block text-sm min-w-[200px] mt-1" style={{ borderColor: 'var(--primary-color, #000)', color: 'var(--primary-color, #000)' }}>{copyLabel}</div>
        </div>

        <div className="flex border-b-2 border-black">
          <div className="w-[58%] border-r-2 border-black p-2">
            <div className="border border-black p-2 mb-2 bg-white">
              <span className="font-bold text-xs underline block mb-1" style={{ color: 'var(--primary-color, #000)' }}>CONSIGNOR:</span>
              <div className="flex items-start"><span className="font-bold text-xs mt-1 mr-1">M/s.</span><div className="font-bold text-sm uppercase w-full border-b border-dotted border-gray-600">{data.consignor_name}</div></div>
              <div className="text-xs mt-1 w-full border-b border-dotted border-gray-600">{data.consignor_address}</div>
              <div className="text-xs mt-1 w-full border-b border-dotted border-gray-600">GST: {data.consignor_gst}</div>
              <div className="flex gap-4 mt-1 text-xs"><div>Inv No: <span className="font-bold">{data.invoice_no}</span></div><div>Date: <span className="font-bold">{formatDate(data.invoice_date)}</span></div></div>
            </div>
            <div className="border border-black p-2 bg-white">
              <span className="font-bold text-xs underline block mb-1" style={{ color: 'var(--primary-color, #000)' }}>CONSIGNEE:</span>
              <div className="flex items-start"><span className="font-bold text-xs mt-1 mr-1">M/s.</span><div className="font-bold text-sm uppercase w-full border-b border-dotted border-gray-600">{data.consignee_name}</div></div>
              <div className="text-xs mt-1 w-full border-b border-dotted border-gray-600">{data.consignee_address}</div>
              <div className="text-xs mt-1 w-full border-b border-dotted border-gray-600">GST: {data.consignee_gst}</div>
              <div className="mt-1 text-xs">P.O. NO: <span className="font-bold">{data.po_no}</span></div>
            </div>
          </div>

          <div className="w-[42%] p-2 bg-gray-50">
            <div className="border-2 p-2 text-center mb-2 bg-white" style={{ borderColor: 'var(--primary-color, #000)' }}>
              <label className="font-bold text-xs block" style={{ color: 'var(--primary-color, #000)' }}>CONSIGNMENT NO:</label>
              <div className="font-bold text-xl text-center">{data.lr_no}</div>
            </div>
            <div className="flex items-center mb-2"><label className="font-bold text-xs w-24">DATE:</label><div className="border-b border-dotted border-gray-600 flex-1 text-xs font-bold">{formatDate(data.lr_date)}</div></div>
            <div className="flex items-center mb-2"><label className="font-bold text-xs w-24">FROM:</label><div className="border-b border-dotted border-gray-600 flex-1 text-xs font-bold uppercase">{data.from_name}</div></div>
            <div className="flex items-center mb-2"><label className="font-bold text-xs w-24">TO:</label><div className="border-b border-dotted border-gray-600 flex-1 text-xs font-bold uppercase">{data.to_name}</div></div>
            <div className="flex items-center mb-2"><label className="font-bold text-xs w-24">LORRY NO:</label><div className="border-b border-dotted border-gray-600 flex-1 text-xs font-bold uppercase">{data.lorry_no}</div></div>
            <div className="flex items-center mb-2"><label className="font-bold text-xs w-24">DRIVER PH:</label><div className="border-b border-dotted border-gray-600 flex-1 text-xs font-bold">{data.driver_mobile}</div></div>
            <div className="flex items-center mt-2 border-2 p-2 bg-white" style={{ borderColor: 'var(--primary-color, #000)' }}>
              <label className="font-bold text-xs w-24" style={{ color: 'var(--primary-color, #000)' }}>DELIVERY TYPE:</label>
              <div className="font-bold text-xs uppercase">{data.delivery_type || 'GODOWN / DOOR'}</div>
            </div>
          </div>
        </div>

        <table className="w-full border-collapse mt-1">
          <thead><tr style={{ backgroundColor: 'var(--bg-accent, #f8f9ff)' }}>
            <th className="border border-black p-1 text-xs text-center w-[10%]">Pkgs</th>
            <th className="border border-black p-1 text-xs text-center w-[25%]">Method</th>
            <th className="border border-black p-1 text-xs text-center w-[15%]">HSN</th>
            <th className="border border-black p-1 text-xs text-center w-[25%]">Act Wt.</th>
            <th className="border border-black p-1 text-xs text-center w-[25%]">Chg Wt.</th>
          </tr></thead>
          <tbody><tr>
            <td className="border border-black p-1 text-center text-xs font-bold">{data.no_of_packages}</td>
            <td className="border border-black p-1 text-center text-xs font-bold">{data.method_of_packing || data.package_type}</td>
            <td className="border border-black p-1 text-center text-xs font-bold">{data.hsn_code}</td>
            <td className="border border-black p-1 text-center text-xs font-bold">{data.actual_weight || data.act_wt || data.actWt || 0}</td>
            <td className="border border-black p-1 text-center text-xs font-bold">{data.charged_weight || data.chg_wt || data.chgWt || 0}</td>
          </tr></tbody>
        </table>

        <div className="flex border-t-2 border-black mt-1">
          <div className="w-[42%] border-r-2 border-black p-2">
            <div className="border border-black p-2 mb-2 relative bg-white min-h-[50px]">
              <label className="absolute -top-2 left-2 bg-white px-1 font-bold text-[9px]" style={{ color: 'var(--primary-color, #000)' }}>DESCRIPTION</label>
              <div className="text-xs font-bold mt-1">{data.description || data.material_desc}</div>
            </div>
            <div className="border border-black p-2 mb-2 relative bg-white">
              <label className="absolute -top-2 left-2 bg-white px-1 font-bold text-[9px]" style={{ color: 'var(--primary-color, #000)' }}>E-WAY BILL NO.</label>
              <div className="text-xs font-bold mt-1">{data.eway_bill_no}</div>
            </div>
            <div className="border border-black mb-2 bg-white">
              <div className="text-center text-[9px] font-bold p-1 flex justify-around" style={{ backgroundColor: 'var(--bg-accent, #f8f9ff)' }}><span>L</span><span>W</span><span>H</span><span>PACKGE</span></div>
              <table className="w-full border-t border-black"><tbody><tr>
                <td className="border-r border-black p-1 text-center text-xs font-bold">{data.length}</td>
                <td className="border-r border-black p-1 text-center text-xs font-bold">{data.width}</td>
                <td className="border-r border-black p-1 text-center text-xs font-bold">{data.height}</td>
                <td className="p-1 text-center text-xs font-bold">{data.total_cft || data.total_cft_cmt || data.cft_cmt}</td>
              </tr></tbody></table>
            </div>
            <div className="border border-black p-2 mb-2 relative bg-white">
              <label className="absolute -top-2 left-2 bg-white px-1 font-bold text-[9px]" style={{ color: 'var(--primary-color, #000)' }}>VALUATION</label>
              <div className="text-xs font-bold flex items-center mt-1">Value Rs: <span className="text-sm font-black ml-1">{data.declared_value}</span></div>
              {data.gst_through && (
                <div className="text-xs font-bold flex items-center mt-1">
                  GST Through: <span className="text-sm font-black ml-1">{data.gst_through}</span>
                </div>
              )}
            </div>
            <div className="border-2 p-2 bg-white" style={{ borderColor: 'var(--primary-color, #000)' }}>
              <strong className="text-xs block mb-2 underline" style={{ color: 'var(--primary-color, #000)' }}>BASIS OF BOOKING:</strong>
              <div className="flex items-start gap-2 mb-2">
                <span className="text-[10px] font-bold mt-1 whitespace-nowrap">Bill M/s:</span>
                <div className="flex-1 text-xs font-bold border-b border-dotted border-gray-600">{data.billed_at || data.basis_party}</div>
              </div>
              <div className="flex justify-between flex-nowrap text-xs font-black mt-2 border-t border-dashed border-gray-600 pt-2 gap-2">
                <label className="inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"><input type="radio" name={`basis_${copyLabel}`} checked={data.basis_booking === 'TO PAY'} readOnly /> TO PAY</label>
                <label className="inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"><input type="radio" name={`basis_${copyLabel}`} checked={data.basis_booking === 'PAID'} readOnly /> PAID</label>
                <label className="inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"><input type="radio" name={`basis_${copyLabel}`} checked={data.basis_booking === 'TO BB'} readOnly /> TO BB</label>
              </div>
            </div>
          </div>

          <div className="w-[28%] border-r-2 border-black p-2">
            <div className="border border-black p-2 mb-2 relative bg-white">
              <label className="absolute -top-2 left-2 bg-white px-1 font-bold text-[9px]" style={{ color: 'var(--primary-color, #000)' }}>RECEIPT VOUCHER</label>
              <div className="flex justify-between text-[11px] mt-1"><span>No:</span> <span className="font-bold">{data.rv_no}</span></div>
              <div className="flex justify-between text-[11px] mt-1"><span>Dt:</span> <span className="font-bold">{data.rv_dt}</span></div>
              <div className="flex justify-between text-[11px] mt-1"><span>Amt:</span> <span className="font-bold">{data.rv_am}</span></div>
            </div>
            <div className="border border-black p-2 relative bg-white">
              <label className="absolute -top-2 left-2 bg-white px-1 font-bold text-[9px]" style={{ color: 'var(--primary-color, #000)' }}>INSURANCE</label>
              <div className="flex justify-between text-[11px] mt-1"><span>CO:</span> <span className="font-bold">{data.insurance_company}</span></div>
              <div className="flex justify-between text-[11px] mt-1"><span>POL:</span> <span className="font-bold">{data.policy_no}</span></div>
              <div className="flex justify-between text-[11px] mt-1"><span>AMT:</span> <span className="font-bold">{data.insurance_amount}</span></div>
            </div>
            
            {includeMR && (
              <div className="border-2 border-green-600 p-2 mt-2 relative bg-green-50">
                <label className="absolute -top-2 left-2 bg-green-50 px-1 font-bold text-[9px] text-green-800">MONEY RECEIPT (MR)</label>
                <div className="flex justify-between text-[11px] mt-1"><span>Party:</span> <span className="font-bold">{mrData.party_name || 'N/A'}</span></div>
                <div className="flex justify-between text-[11px] mt-1"><span>Amt:</span> <span className="font-bold">₹{mrData.amount || '0'}</span></div>
                <div className="flex justify-between text-[11px] mt-1"><span>Mode:</span> <span className="font-bold">{mrData.payment_mode}</span></div>
                <div className="text-[10px] mt-1 border-t border-green-300 pt-1"><span>Remarks:</span> <span className="font-bold">{mrData.remarks}</span></div>
              </div>
            )}
          </div>

          <div className="w-[30%] p-2 bg-gray-50">
            <div className="flex justify-between items-center mb-2 text-xs font-bold"><label>Freight:</label> <span className="border border-gray-400 bg-white px-2 py-1 rounded w-24 text-right">₹{data.freight}</span></div>
            <div className="flex justify-between items-center mb-2 text-xs font-bold"><label>A.O.C:</label> <span className="border border-gray-400 bg-white px-2 py-1 rounded w-24 text-right">₹{data.aoc_percent}</span></div>
            <div className="flex justify-between items-center mb-2 text-xs font-bold"><label>Handling:</label> <span className="border border-gray-400 bg-white px-2 py-1 rounded w-24 text-right">₹{data.material_mgmt_ch}</span></div>
            <div className="flex justify-between items-center mb-2 text-xs font-bold"><label>Collect:</label> <span className="border border-gray-400 bg-white px-2 py-1 rounded w-24 text-right">₹{data.collection_charges}</span></div>
            <div className="flex justify-between items-center mb-2 text-xs font-bold"><label>Door Del:</label> <span className="border border-gray-400 bg-white px-2 py-1 rounded w-24 text-right">₹{data.door_dly_charges}</span></div>
            <div className="flex justify-between items-center mb-2 text-xs font-bold"><label>Other:</label> <span className="border border-gray-400 bg-white px-2 py-1 rounded w-24 text-right">₹{data.misc_charges}</span></div>
            <hr className="border-black my-2" />
            <div className="flex justify-between items-center text-sm font-black" style={{ color: 'var(--primary-color, #000)' }}>
              <span>TOTAL:</span> <span className="text-lg font-black min-w-24 text-right border-2 border-black px-2 py-1 bg-yellow-100">₹{total}/-</span>
            </div>
            <div className="border border-black mt-4 text-center p-2 bg-white">
              <strong className="text-[10px] block">For BHARAT TRANSPORT COMPANY</strong>
              <br /><br />
              <p className="border-t border-black m-0 pt-1 text-[10px] font-bold">Signature</p>
            </div>
          </div>
        </div>

        <div className="mt-2 pt-1 text-[10px] border-t border-black">
          • Rajgarh (Churu) Jurisdiction. • Owner's risk. • No claim after delivery.
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <style>{`
        .consignor-theme { --primary-color: #0d47a1; --bg-accent: #e3f2fd; }
        .consignee-theme { --primary-color: #b71c1c; --bg-accent: #ffebee; }
        .lorry-theme { --primary-color: #1b5e20; --bg-accent: #e8f5e9; }
        .ho-theme { --primary-color: #e65100; --bg-accent: #fff3e0; }
        @media print {
          .no-print { display: none !important; }
          .bilty-container { margin: 0 !important; border: 2px solid #000 !important; width: 100% !important; page-break-after: always; }
          body { background: #fff !important; }
        }
      `}</style>

      <div className="no-print bg-white p-4 mb-4 rounded shadow flex flex-wrap gap-4 items-center justify-center sticky top-0 z-50">
        <label className="flex items-center gap-2 cursor-pointer font-bold text-sm"><input type="checkbox" checked={copies.CONSIGNOR_COPY} onChange={(e) => setCopies({...copies, CONSIGNOR_COPY: e.target.checked})} /> CONSIGNOR</label>
        <label className="flex items-center gap-2 cursor-pointer font-bold text-sm"><input type="checkbox" checked={copies.CONSIGNEE_COPY} onChange={(e) => setCopies({...copies, CONSIGNEE_COPY: e.target.checked})} /> CONSIGNEE</label>
        <label className="flex items-center gap-2 cursor-pointer font-bold text-sm"><input type="checkbox" checked={copies.LORRY_COPY} onChange={(e) => setCopies({...copies, LORRY_COPY: e.target.checked})} /> LORRY COPY</label>
        <label className="flex items-center gap-2 cursor-pointer font-bold text-sm"><input type="checkbox" checked={copies.HO_COPY} onChange={(e) => setCopies({...copies, HO_COPY: e.target.checked})} /> HO COPY</label>
        
        <div className="border-l pl-4 flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-blue-700 text-sm">
            <input type="checkbox" checked={includeMR} onChange={(e) => setIncludeMR(e.target.checked)} /> ✅ Include MR (Money Receipt)
          </label>
        </div>

        <button onClick={handlePrint} className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 font-bold text-sm">🖨️ SAVE & PRINT</button>
        <button onClick={handleWhatsAppShare} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-bold text-sm">📱 WhatsApp Send</button>
        <button onClick={handleBackToList} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold text-sm">← Back to List</button>
      </div>

      {includeMR && (
        <div className="no-print bg-yellow-50 border-2 border-yellow-400 p-4 mb-4 rounded max-w-4xl mx-auto">
          <h3 className="font-bold text-lg mb-3 text-yellow-800 border-b border-yellow-300 pb-2">💰 Money Receipt (MR) Details - Fill before printing/sending</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input type="text" placeholder="Party Name" value={mrData.party_name} onChange={(e) => setMrData({...mrData, party_name: e.target.value})} className="border border-gray-300 p-2 rounded font-bold" />
            <input type="number" placeholder="Amount (₹)" value={mrData.amount} onChange={(e) => setMrData({...mrData, amount: e.target.value})} className="border border-gray-300 p-2 rounded font-bold" />
            <select value={mrData.payment_mode} onChange={(e) => setMrData({...mrData, payment_mode: e.target.value})} className="border border-gray-300 p-2 rounded font-bold">
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
            <input type="text" placeholder="Remarks (e.g., Advance)" value={mrData.remarks} onChange={(e) => setMrData({...mrData, remarks: e.target.value})} className="border border-gray-300 p-2 rounded font-bold" />
          </div>
        </div>
      )}

      <div id="print-area" className="max-w-4xl mx-auto">
        {copies.CONSIGNOR_COPY && <BiltySheet copyLabel="CONSIGNOR COPY" theme="consignor-theme" />}
        {copies.CONSIGNEE_COPY && <BiltySheet copyLabel="CONSIGNEE COPY" theme="consignee-theme" />}
        {copies.LORRY_COPY && <BiltySheet copyLabel="LORRY COPY" theme="lorry-theme" />}
        {copies.HO_COPY && <BiltySheet copyLabel="HO COPY" theme="ho-theme" />}
      </div>
    </div>
  );
};

export default BiltyPrint;