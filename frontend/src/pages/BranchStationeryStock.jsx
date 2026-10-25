import { useEffect, useState } from 'react'
import api from '../api'

const documentTypes = [
  { label: 'Bilty Book', key: 'bilty' },
  { label: 'Bill Book', key: 'bill' },
  { label: 'Money Receipt Book', key: 'mr' },
  { label: 'Gadi Challan Book', key: 'challan' }
]

export default function BranchStationeryStock() {
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.get('/stock')
      .then((response) => {
        const data = response.data?.data
        if (!Array.isArray(data)) throw new Error('The server returned an invalid stationery stock list.')
        if (active) setStock(data)
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.error || requestError.message || 'Unable to load branch stationery stock.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <section className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Branch Stationery Stock</h1>
        <p className="mt-1 text-sm text-slate-600">Remaining printed-book stock assigned to this branch.</p>
        {error && <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading ? (
          <p className="mt-5 text-sm text-slate-600">Loading stationery stock…</p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {documentTypes.map((document) => {
              const row = stock.find((item) => String(item.document_type || item.type || '').toLowerCase().includes(document.key))
              return (
                <article key={document.key} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h2 className="text-sm font-semibold text-slate-700">{document.label}</h2>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {row ? `${row.remaining_count ?? row.remaining_quantity ?? 0} / ${row.total_stock ?? row.total_quantity ?? 0}` : '—'}
                  </p>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
