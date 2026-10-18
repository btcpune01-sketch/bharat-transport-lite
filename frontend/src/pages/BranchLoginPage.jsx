import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'

const API_URL = 'https://bharat-transport-api.onrender.com'

export default function BranchLoginPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [branch, setBranch] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loadingBranch, setLoadingBranch] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadBranch() {
      setLoadingBranch(true)
      setError('')
      try {
        const response = await axios.get(
          `${API_URL}/api/branches/slug/${encodeURIComponent(slug || '')}`,
          { signal: controller.signal }
        )
        setBranch(response.data.branch)
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.response?.data?.error || 'Unable to load this branch.')
        }
      } finally {
        if (!controller.signal.aborted) setLoadingBranch(false)
      }
    }

    loadBranch()
    return () => controller.abort()
  }, [slug])

  async function handleLogin(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await axios.post(`${API_URL}/api/branch-login/verify`, {
        branchSlug: slug,
        username,
        password
      })

      if (!response.data?.success || !response.data.token || !response.data.branch) {
        setError('Unable to sign in. Check your credentials and try again.')
        return
      }

      localStorage.setItem('branch_session', JSON.stringify({
        token: response.data.token,
        branch: response.data.branch
      }))
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify({
        ...response.data.branch,
        branch_id: response.data.branch.id,
        username,
        role: 'branch'
      }))
      navigate(`/branch/${slug}`, { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingBranch) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading branch...</p>
      </main>
    )
  }

  if (!branch) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <h1 className="mb-3 text-2xl font-bold text-gray-800">Branch unavailable</h1>
          <p role="alert" className="mb-6 text-sm text-red-700">{error}</p>
          <Link to="/" className="font-medium text-blue-700 hover:underline">
            Back to main site
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 to-indigo-900 p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <header className="mb-7 text-center">
          {branch.logo_url || branch.logo ? (
            <img
              src={branch.logo_url || branch.logo}
              alt={`${branch.branch_name} logo`}
              className="mx-auto mb-4 h-16 max-w-40 object-contain"
            />
          ) : (
            <div aria-hidden="true" className="mb-3 text-5xl">🏢</div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{branch.branch_name}</h1>
          <p className="mt-1 text-sm text-gray-600">Branch staff sign in</p>
        </header>

        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="branch-username" className="mb-1 block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="branch-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={submitting}
              required
              className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label htmlFor="branch-password" className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="branch-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
              required
              className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-700 py-3 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {submitting ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 border-t pt-5 text-center">
          <Link to="/" className="text-sm font-medium text-blue-700 hover:underline">
            Back to main site
          </Link>
        </div>
      </section>
    </main>
  )
}
