import { useNavigate, Navigate } from 'react-router-dom'

export default function Backup() {
  const navigate = useNavigate()
  
  // 🔒 ADMIN ONLY CHECK
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const handleBackup = () => {
    alert('✅ Backup process initiated! (This will connect to your backend API)')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">💾 Backup & Restore</h1>
            <p className="text-gray-500 mt-1">Secure your business data</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
            ← Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
            <h2 className="text-xl font-bold text-gray-800 mb-2">📥 Create Backup</h2>
            <p className="text-gray-600 mb-4">Download a complete snapshot of your database, including bilties, parties, and financial records.</p>
            <button onClick={handleBackup} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition">
              Download Backup Now
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-orange-500">
            <h2 className="text-xl font-bold text-gray-800 mb-2">📤 Restore Data</h2>
            <p className="text-gray-600 mb-4">Upload a previously downloaded backup file to restore your system state.</p>
            <button onClick={() => alert('Restore feature will open file picker')} className="w-full py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition">
              Upload Backup File
            </button>
          </div>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-bold text-yellow-800">Important Note</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Restoring data will overwrite existing records. Always create a fresh backup before performing a restore operation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
