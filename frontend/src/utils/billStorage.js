// Bills को multiple जगहों पर save करें ताकि कभी delete न हों

const STORAGE_KEYS = {
  LOCAL_HISTORY: 'btc_history',
  LOCAL_DRAFTS: 'bharat_drafts_bill',
  BACKUP_HISTORY: 'btc_backup_history',
  INDEXED_DB: 'btc_indexed_bills'
};

// LocalStorage में save करें
export const saveToLocalStorage = (bills) => {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCAL_HISTORY, JSON.stringify(bills));
    // Backup में भी save करें
    localStorage.setItem(STORAGE_KEYS.BACKUP_HISTORY, JSON.stringify(bills));
    console.log('✅ Saved to localStorage');
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// LocalStorage से पढ़ें (with fallback to backup)
export const loadFromLocalStorage = () => {
  try {
    // पहले main storage check करें
    const bills = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_HISTORY) || '[]');
    if (bills.length > 0) return bills;
    
    // अगर खाली है तो backup से लाएं
    const backup = JSON.parse(localStorage.getItem(STORAGE_KEYS.BACKUP_HISTORY) || '[]');
    if (backup.length > 0) {
      console.log('🔄 Restored from backup');
      saveToLocalStorage(backup); // Backup को main में restore करें
      return backup;
    }
    
    return [];
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return [];
  }
};

// IndexedDB में save करें (more persistent)
export const saveToIndexedDB = async (bills) => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(['bills'], 'readwrite');
    const store = transaction.objectStore('bills');
    
    // पुराने bills clear करें
    store.clear();
    
    // नए bills add करें
    bills.forEach(bill => {
      store.put(bill);
    });
    
    console.log('✅ Saved to IndexedDB');
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
  }
};

// IndexedDB से पढ़ें
export const loadFromIndexedDB = async () => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(['bills'], 'readonly');
    const store = transaction.objectStore('bills');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error loading from IndexedDB:', error);
    return [];
  }
};

// IndexedDB open करें
const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BharatTransportDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('bills')) {
        db.createObjectStore('bills', { keyPath: 'id' });
      }
    };
  });
};

// Bill add करें (सभी जगहों पर)
export const addBill = async (bill) => {
  const bills = loadFromLocalStorage();
  
  // Duplicate check
  const exists = bills.find(b => b.bill_no === bill.bill_no || b.id === bill.id);
  if (!exists) {
    bills.push(bill);
    saveToLocalStorage(bills);
    await saveToIndexedDB(bills);
    console.log('✅ Bill added to all storage layers');
  }
  
  return bills;
};

// Bill delete करें (सभी जगहों से)
export const deleteBill = async (billId) => {
  const bills = loadFromLocalStorage();
  const updated = bills.filter(b => b.id !== billId && b.bill_no !== billId);
  
  saveToLocalStorage(updated);
  await saveToIndexedDB(updated);
  console.log('✅ Bill deleted from all storage layers');
  
  return updated;
};

// सभी storage layers से bills लाएं (merge करके)
export const getAllBills = async () => {
  const localBills = loadFromLocalStorage();
  const indexedBills = await loadFromIndexedDB();
  
  // Merge करें (duplicates हटाएं)
  const combinedMap = new Map();
  
  indexedBills.forEach(bill => {
    const key = bill.bill_no || bill.id;
    if (key) combinedMap.set(key, bill);
  });
  
  localBills.forEach(bill => {
    const key = bill.bill_no || bill.id;
    if (key) combinedMap.set(key, bill);
  });
  
  return Array.from(combinedMap.values());
};
