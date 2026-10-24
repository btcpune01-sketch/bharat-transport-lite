import api from '../api'

const INV_PREFIX = 'BTC/26-27/'

export const getNextSerialNumber = async () => {
  const response = await api.get('/bills/last-serial')
  const rawLastNum = response.data?.lastSerial ?? response.data?.last_serial
  const lastNum = typeof rawLastNum === 'number'
    ? rawLastNum
    : typeof rawLastNum === 'string' && /^\d+$/.test(rawLastNum.trim())
      ? Number(rawLastNum)
      : NaN
  if (!Number.isSafeInteger(lastNum) || lastNum < 0 || lastNum === Number.MAX_SAFE_INTEGER) {
    throw new Error('The server returned an invalid bill serial number.')
  }
  return INV_PREFIX + (lastNum + 1).toString().padStart(3, '0')
}
