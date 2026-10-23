import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ChevronRight, Database, Users } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { autoBackup } from '../utils/autoBackup'

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
  const { currentUser } = useAuth()
  const [backupStatus, setBackupStatus] = useState(autoBackup.getStatus())
  const [backupBusy, setBackupBusy] = useState(false)

  useEffect(() => {
    const updateStatus = (event) => setBackupStatus(event.detail)
    window.addEventListener('btc-backup-status', updateStatus)
    return () => window.removeEventListener('btc-backup-status', updateStatus)
  }, [])

  const selectBackupFolder = async () => {
    setBackupBusy(true)
    try {
      await autoBackup.chooseDirectory()
      await autoBackup.saveToDisk()
    } catch (error) {
      setBackupStatus({ ...autoBackup.getStatus(), message: error.message, error: true })
    } finally {
      setBackupBusy(false)
    }
  }

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
            <article
              key={to}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <Link to={to} className="group block">
                <div className="flex items-center justify-between">
                  <span className="rounded-xl bg-blue-50 p-3 text-blue-700">
                    <Icon size={20} />
                  </span>
                  <ChevronRight size={18} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700" />
                </div>
                <h2 className="mt-5 font-bold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
              </Link>
              {to === '/backup' && currentUser?.role === 'admin' && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  {autoBackup.isDirectoryPickerAvailable() ? (
                    <button
                      type="button"
                      onClick={selectBackupFolder}
                      disabled={backupBusy}
                      className="w-full rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-green-800 disabled:opacity-60"
                    >
                      📁 {backupBusy ? 'Backup folder set ho raha hai…' : 'Select D: Drive Folder'}
                    </button>
                  ) : (
                    <p className="text-xs text-amber-700">
                      Direct folder access is unavailable in this browser. Open Backup to download a file manually.
                    </p>
                  )}
                  {backupStatus.message && (
                    <p className={`mt-2 text-xs ${backupStatus.error ? 'text-red-700' : 'text-slate-500'}`} role="status" aria-live="polite">
                      {backupStatus.message}
                    </p>
                  )}
                </div>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
