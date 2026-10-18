import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDateForInput } from '../utils/dateFormatter'

export default function PODUpload() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    lr_no: '',
    delivery_date: formatDateForInput(new Date()),
    delivered_by: '',
    receiver_name: '',
    receiver_phone: '',
    delivery_remarks: ''
  })
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoBase64, setPhotoBase64] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Compress image before storing in localStorage
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxWidth = 800
        const maxHeight = 800
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
        
        setPhotoBase64(compressedBase64)
        setPhotoPreview(compressedBase64)
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.lr_no) {
      alert('Please enter LR Number!')
      return
    }

    try {
      setLoading(true)
      const apiUrl = 'https://bharat-transport-api.onrender.com'
      
      const payload = {
        ...formData,
        photo_url: photoBase64
      }

      const res = await fetch(`${apiUrl}/api/public/pod-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const result = await res.json()
        setSuccess(true)
        // Save to localStorage as backup
        const podHistory = JSON.parse(localStorage.getItem('pod_history') || '[]')
        podHistory.push({
          lr_no: formData.lr_no,
          uploaded_at: new Date().toISOString(),
          photo_url: photoBase64
        })
        localStorage.setItem('pod_history', JSON.stringify(podHistory))
        
        alert('✅ POD uploaded successfully! LR Number: ' + formData.lr_no)
        setFormData({
          lr_no: '',
          delivery_date: formatDateForInput(new Date()),
          delivered_by: '',
          receiver_name: '',
          receiver_phone: '',
          delivery_remarks: ''
        })
        setPhotoPreview(null)
        setPhotoBase64('')
      } else {
        const err = await res.json()
        alert('Error: ' + (err.error || 'Failed to upload POD'))
      }
    } catch (err) {
      console.error('POD upload error:', err)
      alert('Failed to upload POD')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <nav className="bg-gradient-to-r from-green-700 to-green-900 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="bg-white/20 p-2 rounded-lg hover:bg-white/30">← Back</button>
            <div>
              <h1 className="font-bold text-xl">📦 POD Upload Portal</h1>
              <p className="text-xs text-green-200">Upload Proof of Delivery (No Login Required)</p>
            </div>
          </div>
          <button onClick={() => navigate('/pod-view')} className="bg-white text-green-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-50">
            👁️ View POD
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 p-4 mb-6 rounded-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-3">✅</span>
              <div>
                <p className="font-bold text-green-800">POD Uploaded Successfully!</p>
                <p className="text-sm text-green-700">Party can now view this POD using LR Number</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">📝 Upload POD Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LR Number *</label>
              <input 
                required 
                type="text" 
                name="lr_no" 
                value={formData.lr_no} 
                onChange={handleChange} 
                className="w-full border-2 border-green-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 uppercase" 
                placeholder="e.g., BTC/26/0001" 
              />
              <p className="text-xs text-gray-500 mt-1">Enter the LR/Bilty number</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date *</label>
              <input 
                required 
                type="date" 
                name="delivery_date" 
                value={formData.delivery_date} 
                onChange={handleChange} 
                className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-green-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivered By (Driver/Staff)</label>
              <input 
                type="text" 
                name="delivered_by" 
                value={formData.delivered_by} 
                onChange={handleChange} 
                className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-green-500" 
                placeholder="Driver/Staff name" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Name</label>
              <input 
                type="text" 
                name="receiver_name" 
                value={formData.receiver_name} 
                onChange={handleChange} 
                className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-green-500" 
                placeholder="Who received the goods" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Phone</label>
              <input 
                type="tel" 
                name="receiver_phone" 
                value={formData.receiver_phone} 
                onChange={handleChange} 
                className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-green-500" 
                placeholder="9876543210" 
              />
            </div>
          </div>

          {/* Photo Upload */}
          <div className="bg-green-50 rounded-xl p-4 mb-6">
            <h3 className="font-bold text-green-800 mb-3">📸 POD Photo (Signature/Document)</h3>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              onChange={handlePhotoChange} 
              className="w-full border-2 border-dashed border-green-300 rounded-lg p-4 bg-white cursor-pointer" 
            />
            <p className="text-xs text-gray-500 mt-2">💡 Photo will be compressed and stored locally + on server</p>
            
            {photoPreview && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                <img src={photoPreview} alt="POD Preview" className="max-w-full h-64 object-contain border rounded-lg" />
              </div>
            )}
          </div>

          {/* Remarks */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Remarks</label>
            <textarea 
              name="delivery_remarks" 
              value={formData.delivery_remarks} 
              onChange={handleChange} 
              rows="3" 
              className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-green-500" 
              placeholder="Any special notes about delivery..."
            ></textarea>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button 
              type="button" 
              onClick={() => navigate('/')} 
              className="px-6 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="px-8 py-2.5 bg-green-700 text-white rounded-lg font-bold hover:bg-green-800 shadow disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Uploading...' : '📤 Upload POD'}
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <h4 className="font-bold text-blue-800 mb-2">️ How it works:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Driver/Staff uploads POD photo with LR number</li>
            <li>• Photo is compressed and stored in browser (localStorage)</li>
            <li>• Party can view POD anytime using LR number</li>
            <li>• No login required for upload or view</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
