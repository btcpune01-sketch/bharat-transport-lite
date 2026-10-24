export const getLocalDrafts = (type) => {
  const stored = JSON.parse(localStorage.getItem(`bharat_drafts_${type}`) || '[]')
  if (!Array.isArray(stored)) throw new Error(`Saved local ${type} drafts are not a list.`)
  return stored
}

export const saveLocalDraft = (type, data) => {
  const drafts = getLocalDrafts(type)
  const draft = {
    ...data,
    localDraftId: `local-${Date.now()}`,
    savedAt: new Date().toISOString()
  }
  localStorage.setItem(`bharat_drafts_${type}`, JSON.stringify([draft, ...drafts]))
  return draft
}

export const getLocalDocumentNumber = (type, prefix) => {
  const key = `bharat_local_serial_${type}`
  const previous = Number(localStorage.getItem(key)) || 0
  const next = previous + 1
  localStorage.setItem(key, String(next))
  return `${prefix}${String(next).padStart(5, '0')}`
}

export const isDatabaseUnavailable = (error) => {
  const status = error.response?.status
  const message = `${error.response?.data?.error || ''} ${error.response?.data?.message || ''} ${error.message || ''}`
  if (/database unavailable|database could not be queried/i.test(message)) return true
  if (error.response) return status >= 500
  return Boolean(error.request || error.isAxiosError || ['TypeError', 'SyntaxError'].includes(error.name))
}
