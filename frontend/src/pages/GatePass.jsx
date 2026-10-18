import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate, formatDateLong } from '../utils/dateFormatter'

export default function GatePass() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    lr_no: '',
    vehicle_no: '',
    driver_name: '',
    driver_mobile: '',
    material_desc: '',
    quantity: '',
    weight: '',
    valid_until: '',
    issued_by: ''
  })
  const [gatePass, setGatePass] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${'https://bharat-transport-api.onrender.com'}/api/gate-pass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      const data = await response.json()
      setGatePass(data)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-red-700 text-white p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">BHARAT TRANSPORT COMPANY</h1>
          <button onClick={() => navigate('/')} className="bg-white text-red-700 px-4 py-2 rounded font-bold">
            ← Back to Home
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {!gatePass ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Generate Gate Pass / Challan</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input type="text" placeholder="LR Number" value={formData.lr_no} onChange={(e) => setFormData({...formData, lr_no: e.target.value})} className="border p-2 rounded" required />
                <input type="text" placeholder="Vehicle Number" value={formData.vehicle_no} onChange={(e) => setFormData({...formData, vehicle_no: e.target.value})} className="border p-2 rounded" required />
                <input type="text" placeholder="Driver Name" value={formData.driver_name} onChange={(e) => setFormData({...formData, driver_name: e.target.value})} className="border p-2 rounded" required />
                <input type="text" placeholder="Driver Mobile" value={formData.driver_mobile} onChange={(e) => setFormData({...formData, driver_mobile: e.target.value})} className="border p-2 rounded" required />
                <textarea placeholder="Material Description" value={formData.material_desc} onChange={(e) => setFormData({...formData, material_desc: e.target.value})} className="border p-2 rounded md:col-span-2" required />
                <input type="text" placeholder="Quantity" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} className="border p-2 rounded" />
                <input type="text" placeholder="Weight (kg)" value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} className="border p-2 rounded" />
                <input type="date" placeholder="Valid Until" value={formData.valid_until} onChange={(e) => setFormData({...formData, valid_until: e.target.value})} className="border p-2 rounded" required />
                <input type="text" placeholder="Issued By" value={formData.issued_by} onChange={(e) => setFormData({...formData, issued_by: e.target.value})} className="border p-2 rounded" required />
              </div>
              <button type="submit" disabled={loading} className="bg-red-700 text-white px-6 py-2 rounded font-bold hover:bg-red-800 disabled:bg-gray-400">
                {loading ? 'Generating...' : 'Generate Gate Pass'}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6 print:shadow-none">
            <div className="border-2 border-gray-300 p-6 rounded">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-red-700">BHARAT TRANSPORT COMPANY</h2>
                <p className="text-gray-600">GATE PASS / CHALLAN</p>
                <p className="text-sm">Pass No: <span className="font-bold">{gatePass.pass_no}</span></p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>LR Number:</strong> {gatePass.lr_no}</p>
                  <p><strong>Vehicle No:</strong> {gatePass.vehicle_no}</p>
                  <p><strong>Driver:</strong> {gatePass.driver_name}</p>
                  <p><strong>Mobile:</strong> {gatePass.driver_mobile}</p>
                </div>
                <div>
                  <p><strong>Material:</strong> {gatePass.material_desc}</p>
                  <p><strong>Quantity:</strong> {gatePass.quantity}</p>
                  <p><strong>Weight:</strong> {gatePass.weight} kg</p>
                  <p><strong>Valid Until:</strong> {formatDate(gatePass.valid_until)}</p>
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">QR Code: {gatePass.qr_code.substring(0, 30)}...</p>
              </div>

              <div className="mt-6 flex justify-between">
                <div>
                  <p className="text-sm">Issued By: {gatePass.issued_by}</p>
                  <p className="text-xs text-gray-500">{formatDateLong(gatePass.issued_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">Authorized Signature</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2 print:hidden">
              <button onClick={handlePrint} className="bg-blue-700 text-white px-4 py-2 rounded font-bold hover:bg-blue-800">
                ️ Print Gate Pass
              </button>
              <button onClick={() => setGatePass(null)} className="bg-gray-700 text-white px-4 py-2 rounded font-bold hover:bg-gray-800">
                New Gate Pass
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
