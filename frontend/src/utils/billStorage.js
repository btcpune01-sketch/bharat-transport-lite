const STORAGE_KEYS = {
  LOCAL_HISTORY: 'btc_history',
  BACKUP_HISTORY: 'btc_backup_history'
};

export const saveToLocalStorage = (bills) => {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCAL_HISTORY, JSON.stringify(bills));
    localStorage.setItem(STORAGE_KEYS.BACKUP_HISTORY, JSON.stringify(bills));
    console.log('✅ Saved to localStorage + backup');
  } catch (error) {
    console.error('Error saving:', error);
  }
};

export const loadFromLocalStorage = () => {
  try {
    const bills = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_HISTORY) || '[]');
    if (bills.length > 0) return bills;
    
    const backup = JSON.parse(localStorage.getItem(STORAGE_KEYS.BACKUP_HISTORY) || '[]');
    if (backup.length > 0) {
      console.log('🔄 Restored from backup');
      saveToLocalStorage(backup);
      return backup;
    }
    return [];
  } catch (error) {
    console.error('Error loading:', error);
    return [];
  }
};

export const addBill = async (bill) => {
  const bills = loadFromLocalStorage();
  const exists = bills.find(b => b.bill_no === bill.bill_no || b.id === bill.id);
  if (!exists) {
    bills.push(bill);
    saveToLocalStorage(bills);
    console.log('✅ Bill added safely');
  }
  return bills;
};

export const deleteBillFromStorage = async (billId) => {
  const bills = loadFromLocalStorage();
  const updated = bills.filter(b => b.id !== billId && b.bill_no !== billId);
  saveToLocalStorage(updated);
  console.log('✅ Bill deleted from storage');
  return updated;
};

export const getAllBills = async () => {
  return loadFromLocalStorage();
};
