import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { formatDate } from '../utils/dateFormatter'

const expiryFields = [
  ['RC', 'rc_expiry'],
  ['Insurance', 'insurance_expiry'],
  ['Fitness', 'fitness_expiry'],
  ['Permit', 'permit_expiry']
]

export default function VehicleExpiring() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    api.get('/api/vehicles/expiring')
      .then(({ data }) => {
        if (!cancelled) setVehicles(data.data || [])
      })
      .catch((requestError) => {
        if (cancelled) return
        console.error('Vehicle expiry fetch error:', requestError)
        setError(requestError.response?.data?.error || 'Unable to load vehicle expiry alerts.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Vehicle Document Expiry Alerts</h1>
          <Link to="/vehicles" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
            Vehicle Management
          </Link>
        </div>

        {loading && <p role="status" className="text-slate-600">Loading vehicle expiry alerts...</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}

        {!loading && !error && (
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">Owner</th>
                  {expiryFields.map(([label]) => <th key={label} className="p-3">{label} Expiry</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td className="p-3 font-medium text-slate-900">{vehicle.vehicle_no}</td>
                    <td className="p-3 text-slate-600">{vehicle.owner_name || '-'}</td>
                    {expiryFields.map(([label, field]) => (
                      <td key={field} className="p-3 text-slate-600">
                        {vehicle[field] ? formatDate(vehicle[field]) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
                {vehicles.length === 0 && (
                  <tr><td className="p-4 text-center text-slate-500" colSpan={2 + expiryFields.length}>No documents are expiring soon.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
