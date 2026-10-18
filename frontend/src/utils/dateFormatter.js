const getDateParts = (dateString) => {
  if (dateString instanceof Date) {
    if (Number.isNaN(dateString.getTime())) return null
    return [dateString.getFullYear(), dateString.getMonth() + 1, dateString.getDate()]
  }

  const value = String(dateString)
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/.exec(value)
  if (isoDate) {
    const [, year, month, day] = isoDate.map(Number)
    const check = new Date(Date.UTC(year, month - 1, day))
    if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day) return null
    return [year, month, day]
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
}

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const parts = getDateParts(dateString)
  if (!parts) return String(dateString)
  const [year, month, day] = parts
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
}

export const formatDateLong = (dateString) => {
  if (!dateString) return 'N/A'
  const parts = getDateParts(dateString)
  if (!parts) return String(dateString)
  const [year, month, day] = parts
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

export const formatDateForInput = (dateString) => {
  if (!dateString) return ''
  const parts = getDateParts(dateString)
  if (!parts) return ''
  const [year, month, day] = parts
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
