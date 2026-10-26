import api from '../api'

const getInvoicePrefix = (date = new Date()) => {
  const year = date.getFullYear()
  const financialYearStart = date.getMonth() >= 3 ? year : year - 1
  const financialYear = `${String(financialYearStart).slice(-2)}-${String(financialYearStart + 1).slice(-2)}`
  return `BTC/${financialYear}/`
}

// Get last serial from localStorage (BTC-XXXX format)
const getLastLocalSerial = () => {
  try {
    // Check for BTC-XXXX format in localStorage
    const stored = localStorage.getItem('btc_last_bill_serial')
    if (stored) {
      const match = stored.match(/BTC[-/](\d+)/)
      if (match) {
        return parseInt(match[1])
      }
    }
    
    // Also check existing bills in localStorage
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
    
    return 1139 // Default starting point if nothing found
  } catch (error) {
    console.error('Error getting last local serial:', error)
    return 1139
  }
}

// Save serial to localStorage
const saveSerial = (num) => {
  try {
    localStorage.setItem('btc_last_bill_serial', `BTC-${num}`)
  } catch (error) {
    console.error('Error saving serial:', error)
  }
}

export const getNextSerialNumber = async () => {
  try {
    const response = await api.get('/bills/last-serial')
    
    if (response.data?.fallback) {
      throw new Error('Server could not query bill numbers')
    }

    const rawLastNum = response.data?.lastSerial ?? response.data?.last_serial
    const lastNum = typeof rawLastNum === 'number'
      ? rawLastNum
      : typeof rawLastNum === 'string' && /^\d+$/.test(rawLastNum.trim())
      ? Number(rawLastNum)
      : NaN

    if (!Number.isSafeInteger(lastNum) || lastNum < 0 || lastNum === Number.MAX_SAFE_INTEGER) {
      throw new Error('Invalid bill serial number from server')
    }

    const nextNum = lastNum + 1
    saveSerial(nextNum) // Save to localStorage as backup
    return getInvoicePrefix() + nextNum.toString().padStart(3, '0')
    
  } catch (error) {
    console.warn('Unable to query the next bill number from server; using local fallback:', error)
    
    // Use local serial number (BTC-XXXX format)
    const lastLocalNum = getLastLocalSerial()
    const nextNum = lastLocalNum + 1
    saveSerial(nextNum)
    
    // Return in BTC-XXXX format
    return `BTC-${nextNum}`
  }
}

// Function to manually update serial (can be called after saving a bill)
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
