import api from '../api'

// Serial number localStorage में save करो
const saveSerial = (num) => {
  try {
    localStorage.setItem('btc_last_bill_serial', `BTC-${num}`)
  } catch (error) {
    console.error('Error saving serial:', error)
  }
}

// Last serial number ढूंढो (हमेशा 1139 से कम नहीं होगा)
const getLastLocalSerial = () => {
  try {
    const stored = localStorage.getItem('btc_last_bill_serial')
    if (stored) {
      const match = stored.match(/BTC[-/](\d+)/)
      if (match) {
        const num = parseInt(match[1])
        return num >= 1139 ? num : 1139
      }
    }
    return 1139 // Default starting point
  } catch (error) {
    return 1139
  }
}

// अगला serial number generate करो
export const getNextSerialNumber = async () => {
  // पहले local serial check करो (ताकि server slow होने पर भी तुरंत number मिले)
  const lastLocalNum = getLastLocalSerial()
  const localNextNum = lastLocalNum + 1
  
  try {
    // Server से try करो (3 second timeout के साथ)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    
    const response = await api.get('/bills/last-serial', {
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    
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

    // जो भी number बड़ा हो (server या local), उसे use करो
    const nextNum = Math.max(lastNum + 1, localNextNum)
    saveSerial(nextNum)
    return `BTC-${nextNum}`
    
  } catch (error) {
    // Server fail हो तो local use करो
    console.warn('Using local serial:', error.message)
    saveSerial(localNextNum)
    return `BTC-${localNextNum}`
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
