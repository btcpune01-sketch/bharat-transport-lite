export const PERMANENT_DELETE_CONFIRMATION =
  'Are you sure you want to permanently delete this record? This action cannot be undone.'

export const permanentDeleteHeaders = {
  'X-Confirm-Permanent-Delete': 'true'
}

export function canDeleteRecords(role) {
  return ['admin', 'manager'].includes(String(role || '').toLowerCase())
}

export function confirmPermanentDelete() {
  return window.confirm(PERMANENT_DELETE_CONFIRMATION)
}
