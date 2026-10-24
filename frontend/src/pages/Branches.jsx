import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import toast from 'react-hot-toast'
import { getLocalDrafts, isDatabaseUnavailable, saveLocalDraft } from '../utils/offlineDrafts'

const emptyBranchForm = {
  branch_name: '', branch_code: '', city: '', state: '', address: '', phone: '', email: '',
  incharge_name: '', url_slug: '', username: '', password: '', branch_login_enabled: true
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function Branches() {
  const navigate = useNavigate()
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showEdit, setShowEdit] = useState(null)
  const [showBranchLoginSetup, setShowBranchLoginSetup] = useState(null)
  const [branchLoginForm, setBranchLoginForm] = useState({ username: '', password: '' })
  const [branchLoginSaving, setBranchLoginSaving] = useState(false)
  const [newBranchCredentials, setNewBranchCredentials] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [filterStatus, setFilterStatus] = useState('all')
  const [form, setForm] = useState(emptyBranchForm)
  const [editForm, setEditForm] = useState({})

  const addLocalBranch = () => {
    const slug = form.url_slug || slugify(form.branch_name)
    const safeForm = { ...form }
    delete safeForm.password
    const branch = saveLocalDraft('branch', {
      ...safeForm,
      branch_code: form.branch_code || slug.toUpperCase().slice(0, 6),
      url_slug: slug,
      is_active: true,
      branch_login_enabled: false,
      local: true
    })
    setBranches(current => [branch, ...current])
    setForm(emptyBranchForm)
    setShowForm(false)
    toast.success('Branch created locally')
  }

  const loadBranches = async () => {
    try {
      setLoading(true)
      const res = await api.get('/branches')
      setBranches([...getLocalDrafts('branch'), ...(res.data.data || [])])
    } catch (err) {
      console.error('Unable to load branches:', err)
      if (isDatabaseUnavailable(err)) {
        try {
          setBranches(getLocalDrafts('branch'))
        } catch (storageError) {
          console.error('Unable to load locally saved branches:', storageError)
          toast.error(`Unable to load branches: ${storageError.message}`)
        }
      } else {
        toast.error('Failed to load branches: ' + (err.response?.data?.error || err.message))
      }
    }
    setLoading(false)
  }

  useEffect(() => { loadBranches() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.branch_name || !form.city || !form.incharge_name || !form.url_slug) {
      alert('Please fill Branch Name, City, Incharge Name, and Branch Slug.')
      return
    }
    if (form.branch_login_enabled && (!form.username.trim() || form.password.length < 12)) {
      alert('Set a branch username and a password of at least 12 characters, or turn branch login off.')
      return
    }
    try {
      const res = await api.post('/branches/create', form)
      if (res.data.success) {
        if (res.data.local) {
          addLocalBranch()
          return
        }
        setForm(emptyBranchForm)
        setShowForm(false)
        await loadBranches()
        alert('Branch created. Share its login URL and credentials securely with branch staff.')
      }
    } catch (err) {
      if (isDatabaseUnavailable(err)) {
        try {
          addLocalBranch()
        } catch (storageError) {
          console.error('Unable to save the branch locally:', storageError)
          toast.error(`Branch could not be saved: ${storageError.message}`)
        }
      } else {
        toast.error('❌ Error: ' + (err.response?.data?.error || err.message))
      }
    }
  }

  const handleEdit = (branch) => {
    setEditForm({
      branch_name: branch.branch_name || '', city: branch.city || '', state: branch.state || '',
      address: branch.address || '', phone: branch.phone || '', email: branch.email || '', incharge_name: branch.incharge_name || '',
      url_slug: branch.url_slug || slugify(branch.branch_name || ''),
      username: branch.branch_login_username || branch.url_slug || slugify(branch.branch_name || ''),
      password: '', branch_login_enabled: branch.branch_login_enabled !== false
    })
    setShowEdit(branch)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    const originalUsername = showEdit.branch_login_username || ''
    const credentialsChanged = editForm.password.length > 0 ||
      (Boolean(originalUsername) && editForm.username.trim() !== originalUsername) ||
      (editForm.branch_login_enabled && !originalUsername)
    if (editForm.branch_login_enabled && (!editForm.username.trim() || (!originalUsername && !editForm.password))) {
      alert('Enter a branch username and set a password of at least 12 characters before enabling login.')
      return
    }
    if (credentialsChanged && editForm.password.length < 12) {
      alert('A changed username requires a new password of at least 12 characters.')
      return
    }
    try {
      const { username, password, ...branchChanges } = editForm
      await api.put(`/branches/${showEdit.id}`, branchChanges)
      if (credentialsChanged) {
        await api.post(`/branches/${showEdit.id}/branch-login`, {
          username: username.trim(),
          password,
          url_slug: branchChanges.url_slug,
          branch_login_enabled: branchChanges.branch_login_enabled
        })
      }
      alert('✅ Branch updated successfully!')
      setShowEdit(null)
      loadBranches()
    } catch (err) {
      alert('❌ Update failed: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? Ye action undo nahi hoga!`)) return
    try {
      await api.delete(`/branches/${id}`)
      alert('✅ Branch deleted!')
      loadBranches()
    } catch (err) {
      alert('❌ Delete failed: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleToggleStatus = async (branch) => {
    const newStatus = !branch.is_active
    if (!window.confirm(`${newStatus ? 'Activate' : 'Deactivate'} "${branch.branch_name}"?`)) return
    try {
      await api.put(`/branches/${branch.id}`, { is_active: newStatus })
      alert(`✅ Branch ${newStatus ? 'activated' : 'deactivated'}!`)
      loadBranches()
    } catch (err) {
      alert('❌ Failed: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleBranchLoginSetup = async (e) => {
    e.preventDefault()
    if (!showBranchLoginSetup) return
    setBranchLoginSaving(true)
    try {
      const response = await api.post(
        `/branches/${showBranchLoginSetup.id}/branch-login`,
        branchLoginForm
      )
      setNewBranchCredentials({
        branch_name: response.data.branch.branch_name,
        portal_url: response.data.portal_url,
        ...response.data.credentials
      })
      setShowBranchLoginSetup(null)
      setBranchLoginForm({ username: '', password: '' })
      await loadBranches()
    } catch (err) {
      alert('Branch login setup failed: ' + (err.response?.data?.error || err.message))
    } finally {
      setBranchLoginSaving(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => alert('✅ Copied: ' + text))
      .catch((err) => alert('Could not copy the value: ' + err.message))
  }

  const exportToCSV = () => {
    if (filteredBranches.length === 0) { alert('⚠️ No branches to export!'); return }
    const headers = ['Branch Name', 'Code', 'City', 'State', 'Incharge', 'Username', 'Phone', 'Email', 'Status', 'Login URL']
    const rows = filteredBranches.map(b => [b.branch_name, b.branch_code, b.city, b.state, b.incharge_name, b.branch_login_username, b.phone, b.email, b.is_active ? 'Active' : 'Inactive', `${window.location.origin}${window.location.pathname}#/branch-login/${b.url_slug}`])
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `branches_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    alert('✅ CSV exported!')
  }

  const filteredBranches = branches
    .filter(b => {
      if (filterStatus === 'active' && !b.is_active) return false
      if (filterStatus === 'inactive' && b.is_active) return false
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return b.branch_name?.toLowerCase().includes(q) || b.city?.toLowerCase().includes(q) || b.incharge_name?.toLowerCase().includes(q) || b.branch_login_username?.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.branch_name || '').localeCompare(b.branch_name || '')
      if (sortBy === 'city') return (a.city || '').localeCompare(b.city || '')
      if (sortBy === 'date') return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      return 0
    })

  const activeCount = branches.filter(b => b.is_active).length
  const inactiveCount = branches.length - activeCount
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🏢 Branch Management</h1>
            <p className="text-gray-500 mt-1">Total: <span className="font-bold text-blue-600">{branches.length}</span> | Active: <span className="font-bold text-green-600">{activeCount}</span> | Inactive: <span className="font-bold text-red-600">{inactiveCount}</span></p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">← Dashboard</button>
            <button onClick={exportToCSV} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">📥 Export CSV</button>
            <button onClick={() => { setShowForm(!showForm); setForm(emptyBranchForm) }} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg">
              {showForm ? '✖ Close' : '➕ Add New Branch'}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-2 border-blue-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">➕ Add New Branch</h2>
            <p className="text-sm text-gray-600 mb-4">Choose a unique URL slug and set a strong branch password. Passwords are stored only as hashes.</p>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Branch Name *</label><input type="text" required value={form.branch_name} onChange={(e) => { const name = e.target.value; const previousSlug = slugify(form.branch_name); const slug = slugify(name); setForm(current => ({...current, branch_name: name, url_slug: current.url_slug === previousSlug ? slug : current.url_slug, username: current.username === previousSlug || !current.username ? slug : current.username})) }} className="w-full p-2.5 border border-gray-300 rounded-lg" placeholder="e.g., Mumbai Branch" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Branch Code</label><input type="text" value={form.branch_code} onChange={(e) => setForm({...form, branch_code: e.target.value.toUpperCase()})} className="w-full p-2.5 border border-gray-300 rounded-lg" placeholder="Auto-generated from city if blank" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Branch Slug *</label><input type="text" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.url_slug} onChange={(e) => { const slug = e.target.value.toLowerCase(); setForm(current => ({...current, url_slug: slug, username: current.username === slugify(current.branch_name) ? slug : current.username})) }} className="w-full p-2.5 border border-gray-300 rounded-lg" placeholder="branch-url-slug" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Branch Username {form.branch_login_enabled ? '*' : ''}</label><input type="text" required={form.branch_login_enabled} maxLength={100} value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Branch Password *</label><input type="password" autoComplete="new-password" required={form.branch_login_enabled} minLength={12} maxLength={72} value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg" placeholder="At least 12 characters" /></div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={form.branch_login_enabled} onChange={(e) => setForm({...form, branch_login_enabled: e.target.checked})} />Branch login enabled</label>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">City *</label><input type="text" required value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg" placeholder="e.g., Mumbai" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">State</label><input type="text" value={form.state} onChange={(e) => setForm({...form, state: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg" placeholder="e.g., Maharashtra" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Incharge Name *</label><input type="text" required value={form.incharge_name} onChange={(e) => setForm({...form, incharge_name: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg" placeholder="Full Name" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg" placeholder="e.g., 9876543210" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg" placeholder="e.g., mumbai@btc.com" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><textarea value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg" rows="2" placeholder="Full address" /></div>
              <div className="md:col-span-2 flex gap-3 mt-2">
                <button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md">💾 Create Branch</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-8 py-3 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-bold">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" placeholder="Search by name, city, incharge, username..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-2">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex-1 p-2.5 border border-gray-300 rounded-lg">
                <option value="all">All Status</option>
                <option value="active">✅ Active Only</option>
                <option value="inactive">❌ Inactive Only</option>
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="flex-1 p-2.5 border border-gray-300 rounded-lg">
                <option value="name">Sort: Name</option>
                <option value="city">Sort: City</option>
                <option value="date">Sort: Newest</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading branches...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800"> All Branches ({filteredBranches.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Branch</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Incharge</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Login URL</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBranches.length === 0 ? (
                    <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">{branches.length === 0 ? 'No branches yet.' : 'No branches match your search.'}</td></tr>
                  ) : (
                    filteredBranches.map((branch) => (
                      <tr key={branch.localDraftId || branch.id} className="hover:bg-blue-50">
                        <td className="px-4 py-4">
                          <div className="font-bold text-gray-900">{branch.branch_name}</div>
                          <div className="text-sm text-gray-500">{branch.city}{branch.state ? ', ' + branch.state : ''}</div>
                          <div className="text-xs text-gray-400 font-mono">Code: {branch.branch_code}</div>
                          {branch.local && <div className="mt-1 text-xs font-semibold text-amber-700">Local draft — login setup is available after sync</div>}
                          <div className={`mt-1 text-xs font-semibold ${branch.branch_login_enabled ? 'text-green-700' : 'text-gray-400'}`}>
                            Branch login {branch.branch_login_enabled ? 'enabled' : 'not configured'}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium">{branch.incharge_name || 'N/A'}</div>
                          <div className="text-xs text-gray-500 font-mono">{branch.branch_login_username || 'Login not configured'}</div>
                          {branch.phone && <div className="text-xs text-gray-500">📞 {branch.phone}</div>}
                        </td>
                        <td className="px-4 py-4">
                          {branch.url_slug ? (
                            <button onClick={() => copyToClipboard(`${window.location.origin}${window.location.pathname}#/branch-login/${branch.url_slug}`)} className="text-xs text-blue-600 hover:text-blue-800 underline font-mono text-left">/branch-login/{branch.url_slug}</button>
                          ) : (<span className="text-xs text-gray-400">Not set</span>)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button onClick={() => handleToggleStatus(branch)} className={`px-3 py-1 rounded-full text-xs font-bold transition ${branch.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                            {branch.is_active ? '✅ Active' : '❌ Inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <button
                              onClick={() => {
                                setShowBranchLoginSetup(branch)
                                setBranchLoginForm({ username: branch.branch_login_username || branch.url_slug || '', password: '' })
                              }}
                              disabled={branch.local}
                              className="px-2 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs hover:bg-purple-200 disabled:opacity-50"
                              title={branch.branch_login_username ? 'Reset branch login' : 'Set branch login credentials'}
                            >
                              {branch.branch_login_username ? '🔄 Reset Login' : '🔐 Setup Login'}
                            </button>
                            <button onClick={() => handleEdit(branch)} disabled={branch.local} className="px-2 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200 disabled:opacity-50" title="Edit branch">✏️ Edit</button>
                            <button onClick={() => handleDelete(branch.id, branch.branch_name)} disabled={branch.local} className="px-2 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200 disabled:opacity-50" title="Delete branch">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-800">✏️ Edit Branch</h2>
              <button onClick={() => setShowEdit(null)} className="text-gray-400 hover:text-gray-600 text-2xl">✖</button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-700"><strong>Code:</strong> {showEdit.branch_code} | <strong>Login:</strong> {showEdit.branch_login_username || 'Not configured'}</p>
              <p className="text-xs text-blue-600 mt-1">Changing the username requires setting a new password.</p>
            </div>
            <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Branch Name *</label><input type="text" required value={editForm.branch_name} onChange={(e) => { const name = e.target.value; const previousSlug = slugify(editForm.branch_name); const slug = slugify(name); setEditForm(current => ({...current, branch_name: name, url_slug: current.url_slug === previousSlug ? slug : current.url_slug, username: current.username === (showEdit.branch_login_username || previousSlug) ? slug : current.username})) }} className="w-full p-2.5 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Branch Slug *</label><input type="text" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={editForm.url_slug} onChange={(e) => setEditForm({...editForm, url_slug: e.target.value.toLowerCase()})} className="w-full p-2.5 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Branch Username *</label><input type="text" required maxLength={100} value={editForm.username} onChange={(e) => setEditForm({...editForm, username: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">New Password {editForm.branch_login_enabled && !showEdit.branch_login_username ? '*' : ''}</label><input type="password" autoComplete="new-password" required={editForm.branch_login_enabled && !showEdit.branch_login_username} minLength={12} maxLength={72} value={editForm.password} onChange={(e) => setEditForm({...editForm, password: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg" placeholder="Leave blank to keep current password" /></div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={editForm.branch_login_enabled} onChange={(e) => setEditForm({...editForm, branch_login_enabled: e.target.checked})} />Branch login enabled</label>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">City *</label><input type="text" required value={editForm.city} onChange={(e) => setEditForm({...editForm, city: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">State</label><input type="text" value={editForm.state} onChange={(e) => setEditForm({...editForm, state: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Incharge Name *</label><input type="text" required value={editForm.incharge_name} onChange={(e) => setEditForm({...editForm, incharge_name: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="tel" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><textarea value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg" rows="2" /></div>
              <div className="md:col-span-2 flex gap-3 mt-2">
                <button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md">💾 Save Changes</button>
                <button type="button" onClick={() => setShowEdit(null)} className="px-8 py-3 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-bold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {showBranchLoginSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                {showBranchLoginSetup.branch_login_enabled ? 'Reset Branch Login' : 'Setup Branch Login'}
              </h2>
              <button
                type="button"
                onClick={() => setShowBranchLoginSetup(null)}
                className="text-2xl text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                ✖
              </button>
            </div>
            <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              {showBranchLoginSetup.branch_name}
            </p>
            <form onSubmit={handleBranchLoginSetup} className="space-y-4">
              <div>
                <label htmlFor="branch-login-username" className="mb-1 block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  id="branch-login-username"
                  type="text"
                  autoComplete="off"
                  value={branchLoginForm.username}
                  onChange={(event) => setBranchLoginForm({ ...branchLoginForm, username: event.target.value })}
                  required
                  maxLength={100}
                  disabled={branchLoginSaving}
                  className="w-full rounded-lg border border-gray-300 p-2.5"
                />
              </div>
              <div>
                <label htmlFor="branch-login-password" className="mb-1 block text-sm font-medium text-gray-700">
                  {showBranchLoginSetup.branch_login_enabled ? 'New password' : 'Password'}
                </label>
                <input
                  id="branch-login-password"
                  type="password"
                  autoComplete="new-password"
                  value={branchLoginForm.password}
                  onChange={(event) => setBranchLoginForm({ ...branchLoginForm, password: event.target.value })}
                  required
                  minLength={12}
                  maxLength={72}
                  disabled={branchLoginSaving}
                  className="w-full rounded-lg border border-gray-300 p-2.5"
                />
                <p className="mt-1 text-xs text-gray-500">Use at least 12 characters. The password is shown only after saving.</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={branchLoginSaving}
                  className="flex-1 rounded-lg bg-purple-700 py-3 font-bold text-white hover:bg-purple-800 disabled:bg-purple-400"
                >
                  {branchLoginSaving ? 'Saving...' : 'Enable Login'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBranchLoginSetup(null)}
                  disabled={branchLoginSaving}
                  className="flex-1 rounded-lg bg-gray-200 py-3 font-bold text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {newBranchCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-2 text-xl font-bold text-gray-800">Branch login enabled</h2>
            <p className="mb-4 text-sm text-gray-600">
              Save these credentials now. The password cannot be viewed again; reset it to issue a new one.
            </p>
            <div className="space-y-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="font-semibold text-gray-800">{newBranchCredentials.branch_name}</p>
              <div>
                <label className="text-xs font-bold uppercase text-gray-600">Login URL</label>
                <div className="mt-1 flex gap-2">
                  <input readOnly value={newBranchCredentials.portal_url} className="min-w-0 flex-1 rounded border bg-white p-2 text-sm" />
                  <button type="button" onClick={() => copyToClipboard(newBranchCredentials.portal_url)} className="rounded bg-blue-700 px-3 text-sm text-white">Copy</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-600">Username</label>
                <div className="mt-1 flex gap-2">
                  <input readOnly value={newBranchCredentials.username} className="min-w-0 flex-1 rounded border bg-white p-2 text-sm font-mono" />
                  <button type="button" onClick={() => copyToClipboard(newBranchCredentials.username)} className="rounded bg-blue-700 px-3 text-sm text-white">Copy</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-600">Password — shown once</label>
                <div className="mt-1 flex gap-2">
                  <input readOnly value={newBranchCredentials.password} className="min-w-0 flex-1 rounded border bg-white p-2 text-sm font-mono" />
                  <button type="button" onClick={() => copyToClipboard(newBranchCredentials.password)} className="rounded bg-blue-700 px-3 text-sm text-white">Copy</button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNewBranchCredentials(null)}
              className="mt-4 w-full rounded-lg bg-gray-700 py-3 font-bold text-white hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
