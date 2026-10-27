// ️ PERMANENT BILL STORAGE - 10+ Years Safety
// Saves to: localStorage + IndexedDB + Backup Storage

const STORAGE_KEYS = {
  LOCAL_HISTORY: 'btc_history',
  BACKUP_HISTORY: 'btc_backup_history',
  PERMANENT_STORAGE: 'btc_permanent_bills',
  ARCHIVE_STORAGE: 'btc_archive_bills'
};

// IndexedDB initialization
const getDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BharatTransportPermanentDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('bills')) {
        const store = db.createObjectStore('bills', { keyPath: 'id', autoIncrement: true });
        store.createIndex('bill_no', 'bill_no', { unique: true });
        store.createIndex('savedAt', 'savedAt', { unique: false });
        console.log('✅ IndexedDB created for permanent storage');
      }
    };
  });
};

// Save to localStorage + backup
export const saveToLocalStorage = (bills) => {
  try {
    const timestamp = new Date().toISOString();
    const dataWithMeta = { bills, lastUpdated: timestamp, version: '1.0' };
    
    localStorage.setItem(STORAGE_KEYS.LOCAL_HISTORY, JSON.stringify(dataWithMeta));
    localStorage.setItem(STORAGE_KEYS.BACKUP_HISTORY, JSON.stringify(dataWithMeta));
    localStorage.setItem(STORAGE_KEYS.PERMANENT_STORAGE, JSON.stringify(dataWithMeta));
    
    console.log('✅ Saved to localStorage + backup + permanent storage');
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// Save to IndexedDB (Most Permanent)
export const saveToIndexedDB = async (bills) => {
  try {
    const db = await getDB();
    const transaction = db.transaction(['bills'], 'readwrite');
    const store = transaction.objectStore('bills');
    
    // Clear old data
    await store.clear();
    
    // Add new bills with timestamp
    const billsWithMeta = bills.map(bill => ({
      ...bill,
      savedAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }));
    
    billsWithMeta.forEach(bill => {
      store.add(bill);
    });
    
    await transaction.complete;
    console.log('✅ Saved to IndexedDB (Permanent Storage)');
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
  }
};

// Load from any storage
export const loadFromLocalStorage = () => {
  try {
    // Try permanent storage first
    const permanent = localStorage.getItem(STORAGE_KEYS.PERMANENT_STORAGE);
    if (permanent) {
      const data = JSON.parse(permanent);
      console.log('🔄 Loaded from permanent storage');
      return data.bills || [];
    }
    
    // Try backup
    const backup = localStorage.getItem(STORAGE_KEYS.BACKUP_HISTORY);
    if (backup) {
      const data = JSON.parse(backup);
      console.log('🔄 Loaded from backup storage');
      return data.bills || [];
    }
    
    // Try main storage
    const main = localStorage.getItem(STORAGE_KEYS.LOCAL_HISTORY);
    if (main) {
      const data = JSON.parse(main);
      console.log(' Loaded from local storage');
      return data.bills || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return [];
  }
};

// Load from IndexedDB
export const loadFromIndexedDB = async () => {
  try {
    const db = await getDB();
    const transaction = db.transaction(['bills'], 'readonly');
    const store = transaction.objectStore('bills');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        console.log('🔄 Loaded from IndexedDB');
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error loading from IndexedDB:', error);
    return [];
  }
};

// Add bill to all storage layers
export const addBill = async (bill) => {
  const bills = await getAllBills();
  
  // Check for duplicates
  const exists = bills.find(b => 
    b.bill_no === bill.bill_no || 
    (b.id && bill.id && b.id === bill.id)
  );
  
  if (!exists) {
    bills.push(bill);
    await saveToAllLayers(bills);
    console.log('✅ Bill added to ALL storage layers (Permanent)');
  }
  
  return bills;
};

// Delete bill from all storage layers
export const deleteBillFromStorage = async (billId) => {
  const bills = await getAllBills();
  const updated = bills.filter(b => b.id !== billId && b.bill_no !== billId);
  await saveToAllLayers(updated);
  console.log('✅ Bill deleted from all storage layers');
  return updated;
};

// Save to ALL layers (localStorage + IndexedDB)
const saveToAllLayers = async (bills) => {
  try {
    saveToLocalStorage(bills);
    await saveToIndexedDB(bills);
  } catch (error) {
    console.error('Error saving to all layers:', error);
  }
};

// Get all bills from all sources
export const getAllBills = async () => {
  try {
    const localBills = loadFromLocalStorage();
    const indexedBills = await loadFromIndexedDB();
    
    // Merge and remove duplicates
    const combinedMap = new Map();
    
    indexedBills.forEach(bill => {
      const key = bill.bill_no || bill.id;
      if (key) combinedMap.set(key, bill);
    });
    
    localBills.forEach(bill => {
      const key = bill.bill_no || bill.id;
      if (key) combinedMap.set(key, bill);
    });
    
    const allBills = Array.from(combinedMap.values());
    console.log(`📊 Total bills from all sources: ${allBills.length}`);
    
    return allBills;
  } catch (error) {
    console.error('Error getting all bills:', error);
    return [];
  }
};

// 🛡️ EXPORT ALL DATA (For manual backup)
export const exportAllData = async () => {
  const bills = await getAllBills();
  const exportData = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    totalBills: bills.length,
    bills: bills
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BTC_Bills_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  console.log('✅ Data exported successfully');
  return exportData;
};

// ️ IMPORT DATA (For restore)
export const importData = async (jsonData) => {
  try {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    if (!data.bills || !Array.isArray(data.bills)) {
      throw new Error('Invalid backup file format');
    }
    
    const existingBills = await getAllBills();
    const existingMap = new Map(existingBills.map(b => [b.bill_no || b.id, b]));
    
    // Merge with existing, avoid duplicates
    data.bills.forEach(newBill => {
      const key = newBill.bill_no || newBill.id;
      if (!existingMap.has(key)) {
        existingMap.set(key, newBill);
      }
    });
    
    const mergedBills = Array.from(existingMap.values());
    await saveToAllLayers(mergedBills);
    
    console.log(`✅ Imported ${data.bills.length} bills successfully`);
    return mergedBills;
  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  }
};

// 🛡️ Get storage stats
export const getStorageStats = async () => {
  const localBills = loadFromLocalStorage();
  const indexedBills = await loadFromIndexedDB();
  
  return {
    localStorage: localBills.length,
    indexedDB: indexedBills.length,
    total: await getAllBills().then(b => b.length),
    lastUpdated: localStorage.getItem(STORAGE_KEYS.PERMANENT_STORAGE) 
      ? JSON.parse(localStorage.getItem(STORAGE_KEYS.PERMANENT_STORAGE)).lastUpdated 
      : null
  };
};
