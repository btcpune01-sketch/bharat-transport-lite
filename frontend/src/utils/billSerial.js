import api from '../api'

const getInvoicePrefix = (date = new Date()) => {
  const year = date.getFullYear()
  const financialYearStart = date.getMonth() >= 3 ? year : year - 1
  const financialYear = `${String(financialYearStart).slice(-2)}-${String(financialYearStart + 1).slice(-2)}`
  return `BTC/${financialYear}/`
}

export const getNextSerialNumber = async () => {
  const response = await api.get('/bills/last-serial')
  if (response.data?.fallback) {
    throw new Error('The server could not query bill numbers. A local number will be used.')
  }
  const rawLastNum = response.data?.lastSerial ?? response.data?.last_serial
  const lastNum = typeof rawLastNum === 'number'
    ? rawLastNum
    : typeof rawLastNum === 'string' && /^\d+$/.test(rawLastNum.trim())
      ? Number(rawLastNum)
      : NaN
  if (!Number.isSafeInteger(lastNum) || lastNum < 0 || lastNum === Number.MAX_SAFE_INTEGER) {
    throw new Error('The server returned an invalid bill serial number.')
  }
  return getInvoicePrefix() + (lastNum + 1).toString().padStart(3, '0')
}
