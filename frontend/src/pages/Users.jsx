import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import api from '../api'

const EMPTY_FORM = {
  username: '',
  email: '',
  full_name: '',
  password: '',
  role: 'operator',
  branch_id: ''
}

export default function Users() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (user.role !== 'admin') return

    let active = true
    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [usersResponse, branchesResponse] = await Promise.all([
          api.get('/api/users'),
          api.get('/api/branches')
        ])
        if (active) {
          setUsers(usersResponse.data?.data || [])
          setBranches(branchesResponse.data?.data || [])
        }
      } catch (err) {
        if (active) setError(err.response?.data?.error || 'Unable to load users and branches.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()
    return () => { active = false }
  }, [user.role])

  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />

  async function handleCreate(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const response = await api.post('/api/users', {
        ...form,
        branch_id: form.branch_id || null
      })
      setUsers((current) => [response.data.data, ...current])
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to create this user.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleUserStatus(targetUser) {
    setError('')
    try {
      const response = await api.put(`/api/users/${targetUser.id}`, {
        full_name: targetUser.full_name,
        email: targetUser.email,
        role: targetUser.role,
        branch_id: targetUser.branch_id,
        is_active: !targetUser.is_active
      })
      setUsers((current) => current.map((item) => (
        item.id === targetUser.id ? { ...item, ...response.data.data } : item
      )))
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update this user.')
    }
  }

  const needsBranch = form.role !== 'admin'

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">User Management</h1>
            <p className="mt-1 text-gray-500">Manage accounts with access to the transport system.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="rounded-lg bg-gray-600 px-4 py-2 text-white transition hover:bg-gray-700"
          >
            ← Back to Dashboard
          </button>
        </header>

        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl bg-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-gray-50 p-4">
            <h2 className="text-lg font-bold text-gray-800">System users ({users.length})</h2>
            <button
              type="button"
              onClick={() => { setError(''); setShowForm((visible) => !visible) }}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
            >
              {showForm ? 'Cancel' : '➕ Add New User'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="grid gap-4 border-b p-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-medium text-gray-700">
                Full name
                <input
                  required
                  value={form.full_name}
                  onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                  className="mt-1 w-full rounded-lg border p-2.5"
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Username
                <input
                  required
                  value={form.username}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                  autoComplete="username"
                  className="mt-1 w-full rounded-lg border p-2.5"
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Email (optional)
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  autoComplete="email"
                  className="mt-1 w-full rounded-lg border p-2.5"
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Temporary password
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-lg border p-2.5"
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Role
                <select
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value, branch_id: '' })}
                  className="mt-1 w-full rounded-lg border bg-white p-2.5"
                >
                  <option value="operator">Operator</option>
                  <option value="accountant">Accountant</option>
                  <option value="admin">Administrator</option>
                </select>
              </label>
              {needsBranch && (
                <label className="text-sm font-medium text-gray-700">
                  Assigned branch
                  <select
                    required
                    value={form.branch_id}
                    onChange={(event) => setForm({ ...form, branch_id: event.target.value })}
                    className="mt-1 w-full rounded-lg border bg-white p-2.5"
                  >
                    <option value="">Select a branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.branch_name}</option>
                    ))}
                  </select>
                </label>
              )}
              <div className="sm:col-span-2 lg:col-span-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Creating user...' : 'Create User'}
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Username / Email</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Branch</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading users...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-gray-500">No users found.</td></tr>
                ) : users.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{item.full_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="font-mono">{item.username}</div>
                      {item.email && <div>{item.email}</div>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-gray-700">{item.role}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{item.branch_name || 'All branches'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        disabled={item.id === user.id}
                        onClick={() => toggleUserStatus(item)}
                        className="rounded px-3 py-1 text-sm font-medium text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-gray-400"
                      >
                        {item.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
