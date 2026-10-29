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
        <div style={{ padding: '20px', marginBottom: '30px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h2 style={{ marginBottom: '15px' }}>{type === 'bilty' ? 'बिल्टी लिस्ट' : 'बिल लिस्ट'}</h2>
            
            {loading ? (
                <p>Loading...</p>
            ) : data.length === 0 ? (
                <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
                    कोई {type === 'bilty' ? 'बिल्टी' : 'बिल'} नहीं मिला। नई entry बनाएं!
                </p>
            ) : (
                <>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f4f4f4' }}>
                                    <th style={{ border: '1px solid #ddd', padding: '10px' }}>
                                        {type === 'bilty' ? 'LR Number' : 'Bill Number'}
                                    </th>
                                    <th style={{ border: '1px solid #ddd', padding: '10px' }}>Date</th>
                                    <th style={{ border: '1px solid #ddd', padding: '10px' }}>
                                        {type === 'bilty' ? 'Sender' : 'Client'}
                                    </th>
                                    <th style={{ border: '1px solid #ddd', padding: '10px' }}>Amount</th>
                                    <th style={{ border: '1px solid #ddd', padding: '10px' }}>Branch</th>
                                    <th style={{ border: '1px solid #ddd', padding: '10px' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item, index) => (
                                    <tr key={index}>
                                        <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                                            {type === 'bilty' ? item.lr_number : item.bill_number}
                                        </td>
                                        <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                                            {new Date(item.date).toLocaleDateString('hi-IN')}
                                        </td>
                                        <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                                            {type === 'bilty' ? item.sender_name : item.client_name}
                                        </td>
                                        <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                                            ₹{item.amount}
                                        </td>
                                        <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                                            {item.branch_name || 'Admin'}
                                        </td>
                                        <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                                            {item.status}
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
                            style={{ padding: '8px 16px', margin: '0 5px', cursor: 'pointer' }}
                        >
                            Previous
                        </button>
                        
                        <span style={{ margin: '0 10px' }}>
                            Page {currentPage} of {totalPages}
                        </span>
                        
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            style={{ padding: '8px 16px', margin: '0 5px', cursor: 'pointer' }}
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
