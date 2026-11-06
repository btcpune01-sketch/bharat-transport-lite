import api from '../api'

export const getNextSerialNumber = async (branch) => {
  if (!branch) throw new Error('A branch is required to generate a Bill number.')
  const response = await api.get('/document-series/next-number', { params: { type: 'bill', branch } })
  const nextNumber = response.data?.bill_no || response.data?.number
  if (typeof nextNumber !== 'string' || !nextNumber.trim()) {
    throw new Error('The server returned an invalid branch Bill number.')
  }
  return nextNumber
}
