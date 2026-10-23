import { useEffect, useRef, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { autoBackup } from '../utils/autoBackup'

export default function Backup() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [status, setStatus] = useState(autoBackup.getStatus())
  const [isBusy, setIsBusy] = useState(false)
  const [restoreStatus, setRestoreStatus] = useState('')
  const restoreInputRef = useRef(null)

  useEffect(() => {
    const updateStatus = (event) => setStatus(event.detail)
    window.addEventListener('btc-backup-status', updateStatus)
    return () => window.removeEventListener('btc-backup-status', updateStatus)
  }, [])

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const runBackup = async () => {
    setIsBusy(true)
    try {
      await autoBackup.saveToDisk({ allowDownload: true })
    } catch (error) {
      setStatus({ ...autoBackup.getStatus(), message: error.message, error: true })
    } finally {
      setIsBusy(false)
    }
  }

  const chooseFolder = async () => {
    setIsBusy(true)
    try {
      await autoBackup.chooseDirectory()
      await autoBackup.saveToDisk()
    } catch (error) {
      setStatus({ ...autoBackup.getStatus(), message: error.message, error: true })
    } finally {
      setIsBusy(false)
    }
  }

  const resumeAutoBackup = async () => {
    setIsBusy(true)
    try {
      await autoBackup.enableAutoSave()
      await autoBackup.saveToDisk()
    } catch (error) {
      setStatus({ ...autoBackup.getStatus(), message: error.message, error: true })
    } finally {
      setIsBusy(false)
    }
  }

  const restoreBackup = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsBusy(true)
    setRestoreStatus('Backup file check karke missing records add kiye ja rahe hain…')
    try {
      const result = await autoBackup.restoreFromFile(file)
      setRestoreStatus(result.message)
    } catch (error) {
      setRestoreStatus(`Restore nahi ho saka: ${error.message}`)
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">💾 Backup & Restore</h1>
            <p className="text-gray-500 mt-1">Secure your business data</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
            ← Back to Dashboard
          </button>
        </div>

        <div className="mb-6 rounded border-2 border-dashed border-green-500 bg-green-50 p-4">
          <h2 className="font-bold text-gray-800">
            💾 D: Drive Auto Backup ({status.enabled ? 'ON' : 'OFF'})
          </h2>
          <p className="mt-1 text-sm text-gray-700">
            {status.folderName
              ? `Aapka data har 2 minute aur har successful change ke baad ${status.folderName} folder me save hoga.`
              : 'D: drive par folder select karein. Uske baad data har 2 minute aur har successful change ke baad apne aap save hoga.'}
          </p>
          {autoBackup.isDirectoryPickerAvailable() ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={chooseFolder}
                disabled={isBusy}
                className="rounded bg-green-600 px-4 py-2 font-bold text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                📁 {status.folderName ? 'Choose / Reauthorize Backup Folder' : 'Select D: Drive Folder (First Time)'}
              </button>
              {status.enabled ? (
                <button
                  onClick={() => autoBackup.setEnabled(false)}
                  disabled={isBusy}
                  className="rounded bg-gray-600 px-4 py-2 font-bold text-white transition hover:bg-gray-700 disabled:opacity-60"
                >
                  Pause Automatic Backup
                </button>
              ) : status.folderName ? (
                <button
                  onClick={resumeAutoBackup}
                  disabled={isBusy}
                  className="rounded bg-blue-700 px-4 py-2 font-bold text-white transition hover:bg-blue-800 disabled:opacity-60"
                >
                  Resume Automatic Backup
                </button>
              ) : null}
            </div>
          ) : (
            <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
              This browser does not support direct folder access. Use “Create Backup Now” below to download a backup file, then move it to D:\BTC_Backup.
            </p>
          )}
          <button
            onClick={runBackup}
            disabled={isBusy}
            className="mt-2 rounded bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            ⬇️ {isBusy ? 'Backup ho raha hai…' : 'Manual Backup Now'}
          </button>
          <div className={`mt-4 rounded-lg p-3 text-sm ${status.error ? 'bg-red-50 text-red-800' : 'bg-gray-100 text-gray-700'}`} role="status" aria-live="polite">
            <p>{status.message || (status.enabled ? `Automatic backup is enabled${status.folderName ? ` for ${status.folderName}` : ''}.` : 'Automatic backup is not enabled.')}</p>
            {status.lastBackup && <p className="mt-1">Last successful backup: {new Date(status.lastBackup).toLocaleString()}</p>}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Note: Pehli baar browser D: drive access ke liye permission mangega. Supported browser me folder select karke permission allow karein. Automatic backup ke liye app khula rehna chahiye. Backup se application database ka data delete ya change nahi hota.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border-l-4 border-blue-500 bg-white p-6 shadow-lg">
            <h2 className="mb-2 text-xl font-bold text-gray-800">📥 Create Backup</h2>
            <p className="mb-4 text-gray-600">Create a complete snapshot of the server database, including bilties, parties, bills, vehicles, and financial records.</p>
            <button
              onClick={runBackup}
              disabled={isBusy}
              className="w-full rounded-lg bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {isBusy ? 'Creating Backup…' : 'Create Backup Now'}
            </button>
          </div>

          <div className="rounded-2xl border-l-4 border-orange-500 bg-white p-6 shadow-lg">
            <h2 className="mb-2 text-xl font-bold text-gray-800">📤 Restore Data</h2>
            <p className="mb-4 text-gray-600">
              Backup file se sirf missing records add honge. Existing records na delete honge, na overwrite.
            </p>
            <input
              ref={restoreInputRef}
              type="file"
              accept=".json,application/json"
              onChange={restoreBackup}
              className="hidden"
            />
            <button
              onClick={() => restoreInputRef.current?.click()}
              disabled={isBusy}
              className="w-full rounded-lg bg-orange-600 py-3 font-bold text-white transition hover:bg-orange-700 disabled:opacity-60"
            >
              {isBusy ? 'Restore ho raha hai…' : 'Select Backup File & Restore'}
            </button>
            {restoreStatus && <p className="mt-3 text-sm text-gray-700" role="status" aria-live="polite">{restoreStatus}</p>}
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-bold text-yellow-800">Important Note</h3>
            <p className="mt-1 text-sm text-yellow-700">
              Restore only adds records that do not already exist. Conflicting records are skipped; existing database records are never deleted or updated.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
