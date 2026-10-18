import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'

export default function Audit() {
  const navigate = useNavigate()
  
  // 🔒 ADMIN ONLY CHECK
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const [logs] = useState([
    { id: 1, action: 'User Login', user: 'admin', branch: 'All', time: '2026-10-11 10:30 AM', status: 'Success' },
    { id: 2, action: 'Created New Bilty', user: 'incharge_ahmedabad', branch: 'Ahmedabad', time: '2026-10-11 11:15 AM', status: 'Success' },
    { id: 3, action: 'Failed Login Attempt', user: 'unknown', branch: 'N/A', time: '2026-10-11 09:00 AM', status: 'Failed' },
    { id: 4, action: 'Updated Branch Details', user: 'admin', branch: 'All', time: '2026-10-10 04:20 PM', status: 'Success' }
  ])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🔍 Audit & CA Logs</h1>
            <p className="text-gray-500 mt-1">Track all system activities and user actions</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
            ← Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800">Recent Activity Logs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Performed By</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Branch</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Timestamp</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.action}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{log.user}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.branch}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${log.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
