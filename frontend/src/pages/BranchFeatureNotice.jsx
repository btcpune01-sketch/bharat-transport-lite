import { useParams } from 'react-router-dom'

export default function BranchFeatureNotice({ title }) {
  const { branchSlug } = useParams()
  let branch = null
  try {
    branch = JSON.parse(localStorage.getItem('branch_session') || 'null')?.branch
  } catch (error) {
    console.error('Unable to read branch contact details:', error)
  }

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-bold uppercase tracking-wider text-amber-700">Branch module</p>
      <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{title}</h1>
      <p className="mt-3 text-slate-600">
        This module is not yet available in the current branch-enabled system. It has not been enabled because its data is not currently stored with branch-level access controls.
      </p>
      <p className="mt-4 text-sm text-slate-500">
        Contact {branch?.branch_name || branchSlug} management to request access once branch-level records are configured.
      </p>
    </section>
  )
}
