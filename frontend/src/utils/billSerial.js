import api from '../api'

// BTC-XXXX format के लिए localStorage से last serial लाओ
const getLastLocalSerial = () => {
  try {
    const stored = localStorage.getItem('btc_last_bill_serial')
    if (stored) {
      const match = stored.match(/BTC[-/](\d+)/)
      if (match) return parseInt(match[1])
    }
    
    // Existing bills से highest number ढूंढो
    const bills = JSON.parse(localStorage.getItem('btc_history') || '[]')
    if (bills.length > 0) {
      let maxNum = 0
      bills.forEach(bill => {
        const billNo = bill.bill_no || bill.invNo || ''
        const match = billNo.match(/BTC[-/](\d+)/)
        if (match) {
          const num = parseInt(match[1])
          if (num > maxNum) maxNum = num
        }
      })
      if (maxNum > 0) return maxNum
    }
    
    return 1139 // Default starting point
  } catch (error) {
    console.error('Error getting last local serial:', error)
    return 1139
  }
}

// Serial number localStorage में save करो
const saveSerial = (num) => {
  try {
    localStorage.setItem('btc_last_bill_serial', `BTC-${num}`)
  } catch (error) {
    console.error('Error saving serial:', error)
  }
}

// अगला serial number generate करो
export const getNextSerialNumber = async () => {
  try {
    const response = await api.get('/bills/last-serial')
    
    if (response.data?.fallback) {
      throw new Error('Server fallback')
    }

    const rawLastNum = response.data?.lastSerial ?? response.data?.last_serial
    const lastNum = typeof rawLastNum === 'number'
      ? rawLastNum
      : typeof rawLastNum === 'string' && /^\d+$/.test(rawLastNum.trim())
      ? Number(rawLastNum)
      : NaN

    if (!Number.isSafeInteger(lastNum) || lastNum < 0) {
      throw new Error('Invalid serial from server')
    }

    const nextNum = lastNum + 1
    saveSerial(nextNum)
    return `BTC-${nextNum}` // हमेशा BTC-XXXX format return करेगा
    
  } catch (error) {
    console.warn('Server unavailable, using local serial:', error)
    
    const lastLocalNum = getLastLocalSerial()
    const nextNum = lastLocalNum + 1
    saveSerial(nextNum)
    
    return `BTC-${nextNum}`
  }
}

// Bill save होने के बाद serial update करो
export const updateBillSerial = (billNo) => {
  try {
    const match = billNo.match(/BTC[-/](\d+)/)
    if (match) {
      const num = parseInt(match[1])
      saveSerial(num)
    }
  } catch (error) {
    console.error('Error updating serial:', error)
  }
}
