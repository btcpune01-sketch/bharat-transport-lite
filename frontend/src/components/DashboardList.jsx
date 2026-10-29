// frontend/src/components/DashboardList.jsx
import React, { useState, useEffect } from 'react';

function DashboardList({ type }) {
    const [data, setData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    const apiUrl = type === 'bilty' ? '/api/bilty-list' : '/api/bill-list';

    useEffect(() => {
        fetchData();
    }, [currentPage]);

    async function fetchData() {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${apiUrl}?page=${currentPage}&limit=10`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            
            if (result.success) {
                setData(result.data);
                setTotalPages(result.pagination.totalPages);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ padding: '20px', marginBottom: '30px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff' }}>
            <h2 style={{ marginBottom: '15px', color: '#1e293b' }}>
                {type === 'bilty' ? 'बिल्टी लिस्ट' : 'बिल लिस्ट'}
            </h2>
            
            {loading ? (
                <p style={{ textAlign: 'center', color: '#64748b' }}>Loading...</p>
            ) : data.length === 0 ? (
                <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>
                    कोई {type === 'bilty' ? 'बिल्टी' : 'बिल'} नहीं मिला। नई entry बनाएं!
                </p>
            ) : (
                <>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9' }}>
                                    <th style={{ border: '1px solid #e2e8f0', padding: '10px', textAlign: 'left' }}>
                                        {type === 'bilty' ? 'LR Number' : 'Bill Number'}
                                    </th>
                                    <th style={{ border: '1px solid #e2e8f0', padding: '10px', textAlign: 'left' }}>Date</th>
                                    <th style={{ border: '1px solid #e2e8f0', padding: '10px', textAlign: 'left' }}>
                                        {type === 'bilty' ? 'Consignor' : 'Party Name'}
                                    </th>
                                    <th style={{ border: '1px solid #e2e8f0', padding: '10px', textAlign: 'left' }}>Amount</th>
                                    <th style={{ border: '1px solid #e2e8f0', padding: '10px', textAlign: 'left' }}>Branch</th>
                                    <th style={{ border: '1px solid #e2e8f0', padding: '10px', textAlign: 'left' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item, index) => (
                                    <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                        <td style={{ border: '1px solid #e2e8f0', padding: '10px' }}>
                                            {type === 'bilty' ? item.lr_no : item.bill_no}
                                        </td>
                                        <td style={{ border: '1px solid #e2e8f0', padding: '10px' }}>
                                            {item.lr_date || item.bill_date ? new Date(item.lr_date || item.bill_date).toLocaleDateString('hi-IN') : '-'}
                                        </td>
                                        <td style={{ border: '1px solid #e2e8f0', padding: '10px' }}>
                                            {type === 'bilty' ? (item.consignor_name || '-') : (item.party_name || '-')}
                                        </td>
                                        <td style={{ border: '1px solid #e2e8f0', padding: '10px' }}>
                                            ₹{item.grand_total || 0}
                                        </td>
                                        <td style={{ border: '1px solid #e2e8f0', padding: '10px' }}>
                                            {item.branch_name || item.branch_code || 'Admin'}
                                        </td>
                                        <td style={{ border: '1px solid #e2e8f0', padding: '10px' }}>
                                            <span style={{ 
                                                padding: '4px 8px', 
                                                borderRadius: '4px', 
                                                backgroundColor: item.payment_status === 'Paid' ? '#dcfce7' : '#fef3c7',
                                                color: item.payment_status === 'Paid' ? '#166534' : '#92400e',
                                                fontSize: '12px',
                                                fontWeight: '600'
                                            }}>
                                                {item.payment_status || item.status || 'Pending'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{ 
                                padding: '8px 16px', 
                                margin: '0 5px', 
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                opacity: currentPage === 1 ? 0.5 : 1,
                                backgroundColor: '#3b82f6',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px'
                            }}
                        >
                            Previous
                        </button>
                        
                        <span style={{ margin: '0 10px', color: '#475569' }}>
                            Page {currentPage} of {totalPages || 1}
                        </span>
                        
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            style={{ 
                                padding: '8px 16px', 
                                margin: '0 5px', 
                                cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
                                opacity: (currentPage === totalPages || totalPages === 0) ? 0.5 : 1,
                                backgroundColor: '#3b82f6',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px'
                            }}
                        >
                            Next
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default DashboardList;
