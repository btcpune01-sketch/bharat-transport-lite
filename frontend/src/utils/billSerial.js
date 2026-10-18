import api from '../api'

const INV_PREFIX = 'BTC/26-27/'

export const getNextSerialNumber = async () => {
  const response = await api.get('/api/bills/last-serial')
  const lastNum = response.data?.lastSerial
  if (!Number.isSafeInteger(lastNum) || lastNum < 0) {
    throw new Error('The server returned an invalid bill serial number.')
  }
  return INV_PREFIX + (lastNum + 1).toString().padStart(3, '0')
}
