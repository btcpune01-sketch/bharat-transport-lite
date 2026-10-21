import { Link } from 'react-router-dom'
import { Building2, ChevronRight, Database, Users } from 'lucide-react'

const settingsLinks = [
  {
    title: 'Branch management',
    description: 'Review branch locations, access, and login settings.',
    to: '/branches',
    icon: Building2
  },
  {
    title: 'User access',
    description: 'Manage administrator and company user accounts.',
    to: '/users',
    icon: Users
  },
  {
    title: 'Database backup',
    description: 'Export or restore the company’s operational data.',
    to: '/backup',
    icon: Database
  }
]

export default function Settings() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Company operations</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage access, branch configuration, and database backups.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Settings shortcuts">
          {settingsLinks.map(({ title, description, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-xl bg-blue-50 p-3 text-blue-700">
                  <Icon size={20} />
                </span>
                <ChevronRight size={18} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700" />
              </div>
              <h2 className="mt-5 font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}
