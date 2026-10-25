import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import api from '../api'

export default function BranchUserManagement() {
  let user = {}
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}')
  } catch (error) {
    console.error('Unable to read the current user:', error)
  }

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user.role !== 'branch' && user.role !== 'branch_user') {
      setLoading(false)
      return undefined
    }

    let active = true
    api.get('/branch/users')
      .then((response) => {
        if (active) setUsers(Array.isArray(response.data?.data) ? response.data.data : [])
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.error || 'Unable to load branch users.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [user.role])

  if (user.role !== 'branch' && user.role !== 'branch_user') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <section className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 p-5">
          <h1 className="text-xl font-bold text-slate-900">Branch User Management</h1>
          <p className="mt-1 text-sm text-slate-600">View staff assigned to this branch.</p>
        </header>
        {error && <p role="alert" className="m-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading ? (
          <p className="p-5 text-sm text-slate-600">Loading branch users…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Username</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((branchUser) => (
                  <tr key={branchUser.id}>
                    <td className="px-5 py-3 font-medium text-slate-800">{branchUser.full_name || '—'}</td>
                    <td className="px-5 py-3 text-slate-600">{branchUser.username}</td>
                    <td className="px-5 py-3 capitalize text-slate-600">{branchUser.role}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${branchUser.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {branchUser.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!users.length && (
                  <tr><td className="px-5 py-6 text-center text-slate-500" colSpan="4">No branch users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
