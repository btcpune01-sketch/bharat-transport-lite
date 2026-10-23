const BACKUP_KEY = 'btc_auto_backup_enabled'
const BACKUP_PATH_KEY = 'btc_backup_path'
const LAST_BACKUP_KEY = 'btc_backup_last_success'
const DB_NAME = 'BTC_Backup_DB'
const DB_VERSION = 1
const STORE_NAME = 'handles'
const API_URL = import.meta.env.VITE_API_URL || '/api'

let intervalId
let debounceId
let isSaving = false
let saveQueued = false
let originalFetch
let monitoredFetch
let status = {
  enabled: localStorage.getItem(BACKUP_KEY) === 'true',
  folderName: localStorage.getItem(BACKUP_PATH_KEY) || '',
  lastBackup: localStorage.getItem(LAST_BACKUP_KEY) || '',
  message: '',
  error: false,
}

function publishStatus(nextStatus) {
  status = { ...status, ...nextStatus }
  window.dispatchEvent(new CustomEvent('btc-backup-status', { detail: status }))
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('This browser does not support saving the backup folder permission.'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Unable to open backup settings storage.'))
    request.onblocked = () => reject(new Error('Backup settings storage is blocked by another browser tab.'))
  })
}

function storeDirHandle(handle) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(handle, 'backupDir')
    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => {
      db.close()
      reject(transaction.error || new Error('Unable to remember the selected backup folder.'))
    }
    transaction.onabort = () => {
      db.close()
      reject(transaction.error || new Error('Saving the selected backup folder was cancelled.'))
    }
  }))
}

function getDirHandle() {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get('backupDir')
    request.onsuccess = () => {
      db.close()
      resolve(request.result || null)
    }
    request.onerror = () => {
      db.close()
      reject(request.error || new Error('Unable to read the saved backup folder.'))
    }
  }))
}

function getFileName() {
  return `BTC_BACKUP_${new Date().toISOString().slice(0, 10)}.json`
}

async function getAllData() {
  const token = localStorage.getItem('token')
  if (!token) throw new Error('Sign in as an administrator to create a database backup.')

  const response = await fetch(`${API_URL.replace(/\/$/, '')}/backup/export`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || `Backup export failed (${response.status}).`)
  }
  if (!result.success || !result.data?.data) {
    throw new Error('The server returned an incomplete database backup.')
  }
  return result
}

function downloadBackup(jsonString, fileName) {
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function isAdmin() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')?.role === 'admin'
  } catch {
    return false
  }
}

function monitorFetch(input, init, response) {
  if (!response.ok) return
  const request = input instanceof Request ? input : null
  const method = (init?.method || request?.method || 'GET').toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return

  const requestUrl = request?.url || (input instanceof URL ? input.href : input)
  const url = new URL(requestUrl, window.location.href)
  const apiBase = new URL(API_URL, window.location.href)
  const apiPath = apiBase.pathname.replace(/\/$/, '')
  if (url.origin === apiBase.origin && (url.pathname === apiPath || url.pathname.startsWith(`${apiPath}/`))) {
    autoBackup.debouncedSave()
  }
}

export const autoBackup = {
  getStatus: () => ({ ...status }),

  isDirectoryPickerAvailable: () => typeof window.showDirectoryPicker === 'function',

  getAllData,

  async chooseDirectory() {
    if (!autoBackup.isDirectoryPickerAvailable()) {
      throw new Error('Direct folder backups require a supported browser such as Chrome or Edge.')
    }

    const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
    const permission = await handle.requestPermission({ mode: 'readwrite' })
    if (permission !== 'granted') {
      throw new Error('Write permission was not granted for the selected backup folder.')
    }

    await storeDirHandle(handle)
    localStorage.setItem(BACKUP_PATH_KEY, handle.name)
    localStorage.setItem(BACKUP_KEY, 'true')
    publishStatus({
      enabled: true,
      folderName: handle.name,
      error: false,
      message: 'Backup folder selected. Creating the first backup…',
    })
  },

  async enableAutoSave() {
    const dirHandle = await getDirHandle()
    if (!dirHandle) throw new Error('Choose a backup folder before enabling automatic backups.')

    const permission = await dirHandle.requestPermission({ mode: 'readwrite' })
    if (permission !== 'granted') {
      throw new Error('Write permission was not granted for the saved backup folder.')
    }

    localStorage.setItem(BACKUP_KEY, 'true')
    publishStatus({
      enabled: true,
      folderName: dirHandle.name,
      error: false,
      message: 'Automatic backups enabled. Creating a fresh backup…',
    })
  },

  setEnabled(enabled) {
    localStorage.setItem(BACKUP_KEY, enabled ? 'true' : 'false')
    publishStatus({
      enabled,
      error: false,
      message: enabled ? 'Automatic backups enabled.' : 'Automatic backups paused.',
    })
  },

  async saveToDisk({ allowDownload = false } = {}) {
    if (isSaving) {
      if (localStorage.getItem(BACKUP_KEY) === 'true' && isAdmin()) saveQueued = true
      return false
    }
    isSaving = true
    publishStatus({ message: 'Creating database backup…', error: false })

    try {
      let dirHandle
      try {
        dirHandle = await getDirHandle()
      } catch (error) {
        if (!allowDownload) throw error
        publishStatus({
          message: `Folder access is unavailable; downloading a backup instead. ${error.message}`,
          error: false,
        })
      }
      if (!dirHandle && !allowDownload) {
        publishStatus({
          message: 'Choose a backup folder to enable automatic backups.',
          error: false,
        })
        return false
      }

      const data = await getAllData()
      const jsonString = JSON.stringify(data, null, 2)
      const fileName = getFileName()

      if (dirHandle) {
        const permission = await dirHandle.queryPermission({ mode: 'readwrite' })
        if (permission !== 'granted') {
          throw new Error('Backup folder permission expired. Select the folder again to reauthorize it.')
        }
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(jsonString)
        await writable.close()
      } else if (allowDownload) {
        downloadBackup(jsonString, fileName)
      }

      const lastBackup = new Date().toISOString()
      localStorage.setItem(LAST_BACKUP_KEY, lastBackup)
      publishStatus({
        lastBackup,
        message: dirHandle
          ? `Backup saved to ${status.folderName}/${fileName}.`
          : `Backup downloaded: ${fileName}.`,
        error: false,
      })
      return true
    } catch (error) {
      publishStatus({
        message: error.message || 'Unable to create database backup.',
        error: true,
      })
      throw error
    } finally {
      isSaving = false
      if (saveQueued) {
        saveQueued = false
        autoBackup.debouncedSave()
      }
    }
  },

  async restoreFromFile(file) {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('Sign in as an administrator to restore a backup.')

    let backupData
    try {
      backupData = JSON.parse(await file.text())
    } catch {
      throw new Error('The selected file is not valid JSON.')
    }
    if (!backupData?.data || typeof backupData.data !== 'object' || Array.isArray(backupData.data)) {
      throw new Error('The selected file is not a valid database backup.')
    }

    const response = await fetch(`${API_URL.replace(/\/$/, '')}/backup/import`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: backupData }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.error || `Backup restore failed (${response.status}).`)
    }
    return result
  },

  debouncedSave() {
    if (localStorage.getItem(BACKUP_KEY) !== 'true' || !isAdmin()) return
    window.clearTimeout(debounceId)
    debounceId = window.setTimeout(() => {
      autoBackup.saveToDisk().catch(() => {})
    }, 3000)
  },

  initAutoSave() {
    if (intervalId) return () => autoBackup.stopAutoSave()

    originalFetch = window.fetch
    monitoredFetch = async function(input, init) {
      const response = await originalFetch.call(this, input, init)
      monitorFetch(input, init, response)
      return response
    }
    window.fetch = monitoredFetch

    intervalId = window.setInterval(() => {
      if (localStorage.getItem(BACKUP_KEY) === 'true') {
        autoBackup.saveToDisk().catch(() => {})
      }
    }, 2 * 60 * 1000)

    if (localStorage.getItem(BACKUP_KEY) === 'true') {
      autoBackup.saveToDisk().catch(() => {})
    }

    return () => autoBackup.stopAutoSave()
  },

  stopAutoSave() {
    window.clearInterval(intervalId)
    window.clearTimeout(debounceId)
    intervalId = undefined
    debounceId = undefined
    if (window.fetch === monitoredFetch) window.fetch = originalFetch
    originalFetch = undefined
    monitoredFetch = undefined
  },
}

window.BTC_BACKUP = autoBackup
