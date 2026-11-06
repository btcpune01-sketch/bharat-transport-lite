export const RECORD_DELETE_CONFIRMATION =
  'Archive this record? It will be hidden from active lists but retained in the database and backups.'

export const recordDeletionHeaders = {
  'X-Confirm-Record-Deletion': 'true'
}

export function canDeleteRecords(role) {
  return ['admin', 'manager'].includes(String(role || '').toLowerCase())
}

export function confirmRecordDeletion() {
  return window.confirm(RECORD_DELETE_CONFIRMATION)
}
