import localforage from "localforage";

// Configure storage
localforage.config({ 
  name: "restaurant_admin_offline",
  description: "Restaurant Admin Offline Data Storage"
});

// Storage keys
const KEYS = {
  MENU: "menu_v1",
  ORDERS: "orders_v1", 
  SHOP: "shop_v1",
  OFFERS: "offers_v1"
};

function broadcastChange(topic) {
  if (typeof window === 'undefined') return;
  const detail = { type: topic, timestamp: Date.now() };
  try {
    window.dispatchEvent(new CustomEvent('localData:update', { detail }));
  } catch (err) {
    console.warn('localDataService broadcast failed', err);
  }
  try {
    window.localStorage?.setItem(`localData:${topic}`, String(detail.timestamp));
  } catch (err) {
    // Ignore storage quota or access errors
  }
}

// =============================================================================
// CORE STORAGE UTILITIES
// =============================================================================

/**
 * Safe get with proper error handling
 */
async function safeGet(key, fallback = null) {
  if (!key || typeof key !== 'string') {
    throw new Error(`Invalid storage key: ${key}`);
  }
  
  try {
    const value = await localforage.getItem(key);
    return value !== null ? value : fallback;
  } catch (error) {
    console.error(`Storage get failed for ${key}:`, error);
    throw new Error(`Failed to retrieve ${key}: ${error.message}`);
  }
}

/**
 * Safe set with proper error handling
 */
async function safeSet(key, value) {
  if (!key || typeof key !== 'string') {
    throw new Error(`Invalid storage key: ${key}`);
  }
  
  try {
    await localforage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Storage set failed for ${key}:`, error);
    throw new Error(`Failed to store ${key}: ${error.message}`);
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize local storage with seed data - CRITICAL for offline functionality
 */
export async function initLocalStore(seedData = {}) {
  try {
    console.log("Initializing local storage...");
    
    const defaults = {
      menu: {},
      orders: [],
      shopStatus: { isOpen: true },
      offers: []
    };

    // Initialize each storage key if it doesn't exist
    for (const [dataKey, defaultValue] of Object.entries(defaults)) {
      const storageKey = KEYS[dataKey.toUpperCase()];
      const existing = await localforage.getItem(storageKey);
      
      if (existing === null) {
        const seedValue = seedData[dataKey] || defaultValue;
        await safeSet(storageKey, seedValue);
        console.log(`Initialized ${dataKey} with ${Array.isArray(seedValue) ? seedValue.length : Object.keys(seedValue).length} items`);
      }
    }
    
    console.log("Local storage initialization completed successfully");
    return true;
  } catch (error) {
    console.error("CRITICAL: Local storage initialization failed:", error);
    throw new Error(`Initialization failed: ${error.message}`);
  }
}

// =============================================================================
// MENU OPERATIONS
// =============================================================================

export async function getMenu() {
  return safeGet(KEYS.MENU, {});
}

export async function saveMenu(menu) {
  if (!menu || typeof menu !== 'object') {
    throw new Error("Invalid menu data - must be an object");
  }
  await safeSet(KEYS.MENU, menu);
  broadcastChange('menu');
  return menu;
}

export async function upsertProduct(category, product) {
  if (!category || !product || !product.name) {
    throw new Error("Invalid category or product data");
  }
  
  const menu = await getMenu();
  
  if (!menu[category]) {
    menu[category] = [];
  }
  
  const productList = menu[category];
  const existingIndex = productList.findIndex(p => 
    p.name?.toLowerCase() === product.name?.toLowerCase()
  );
  
  const updatedProduct = {
    ...product,
    inStock: Boolean(product.inStock),
    manualOverride: Boolean(product.manualOverride)
  };
  
  if (existingIndex >= 0) {
    productList[existingIndex] = { ...productList[existingIndex], ...updatedProduct };
  } else {
    productList.push(updatedProduct);
  }
  
  return saveMenu(menu);
}

/**
 * Toggle chicken items on/off with proper error handling
 */
export async function bulkToggleChickenItems(enable, excludeItems = []) {
  try {
    const menu = await getMenu();
    
    if (!menu || typeof menu !== 'object') {
      throw new Error("Invalid menu data structure");
    }
    
    let changedCount = 0;

    Object.keys(menu).forEach(category => {
      if (!Array.isArray(menu[category])) {
        console.warn(`Category ${category} is not an array, skipping`);
        return;
      }
      
      menu[category].forEach(item => {
        if (!item || typeof item !== 'object') {
          console.warn(`Invalid item in category ${category}, skipping`);
          return;
        }
        
        if (item.isChicken && !excludeItems.includes(item.name)) {
          item.inStock = enable;
          item.manualOverride = true;
          changedCount++;
        }
      });
    });

    await saveMenu(menu);
    return { changed: changedCount, success: true };
  } catch (error) {
    console.error("Failed to toggle chicken items:", error);
    throw new Error(`Bulk toggle failed: ${error.message}`);
  }
}

// =============================================================================
// ORDER OPERATIONS  
// =============================================================================

export async function getAllOrders() {
  return safeGet(KEYS.ORDERS, []);
}

export async function saveAllOrders(orders) {
  if (!Array.isArray(orders)) {
    throw new Error("Orders must be an array");
  }
  await safeSet(KEYS.ORDERS, orders);
  return orders;
}

export async function getBackendOrders() {
  const orders = await getAllOrders();
  return orders.filter(order => order.source !== "local");
}

export async function getLocalOrders() {
  const orders = await getAllOrders();
  return orders.filter(order => order.source === "local");
}

export async function upsertLocalOrder(orderData) {
  if (!orderData || typeof orderData !== 'object') {
    throw new Error("Invalid order data");
  }
  
  const orders = await getAllOrders();
  const orderId = orderData._id || `local-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  
  const order = {
    ...orderData,
    _id: orderId,
    source: "local",
    createdAt: orderData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const existingIndex = orders.findIndex(o => o._id === orderId);
  
  if (existingIndex >= 0) {
    orders[existingIndex] = { ...orders[existingIndex], ...order };
  } else {
    orders.unshift(order); // Add to beginning
  }
  
  await saveAllOrders(orders);
  return order;
}

export async function updateOrderStatus(orderId, status, timestamps = {}) {
  if (!orderId || !status) {
    throw new Error("Order ID and status are required");
  }
  
  const orders = await getAllOrders();
  const orderIndex = orders.findIndex(order => order._id === orderId);
  
  if (orderIndex === -1) {
    throw new Error(`Order with ID ${orderId} not found`);
  }
  
  orders[orderIndex] = {
    ...orders[orderIndex],
    status,
    updatedAt: new Date().toISOString(),
    ...timestamps
  };
  
  await saveAllOrders(orders);
  return orders[orderIndex];
}

// Aliases for backward compatibility
export const updateLocalOrderStatus = updateOrderStatus;
export const updateBackendOrderStatus = updateOrderStatus;

// =============================================================================
// SHOP STATUS OPERATIONS
// =============================================================================

export async function getShopStatus() {
  return safeGet(KEYS.SHOP, { isOpen: true });
}

export async function setShopStatus(isOpen) {
  const status = { 
    isOpen: Boolean(isOpen),
    updatedAt: new Date().toISOString()
  };
  await safeSet(KEYS.SHOP, status);
  return status;
}

// =============================================================================
// OFFERS OPERATIONS
// =============================================================================

export async function getOffersRules() {
  return safeGet(KEYS.OFFERS, []);
}

export async function saveOffersRules(rules) {
  if (!Array.isArray(rules)) {
    throw new Error("Offers rules must be an array");
  }
  await safeSet(KEYS.OFFERS, rules);
  broadcastChange('offers');
  return rules;
}

// =============================================================================
// DATA IMPORT/EXPORT
// =============================================================================

export async function importOrdersFromJSON(jsonData) {
  if (!jsonData) {
    throw new Error("No data provided for import");
  }
  
  const importedOrders = Array.isArray(jsonData) ? jsonData : (jsonData?.orders || []);
  const existingOrders = await getAllOrders();
  
  let importedCount = 0;
  
  for (const orderData of importedOrders) {
    if (!orderData._id) {
      orderData._id = `imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    }
    
    const existingIndex = existingOrders.findIndex(order => order._id === orderData._id);
    
    if (existingIndex >= 0) {
      existingOrders[existingIndex] = { ...existingOrders[existingIndex], ...orderData };
    } else {
      existingOrders.unshift(orderData);
      importedCount++;
    }
  }
  
  await saveAllOrders(existingOrders);
  console.log(`Imported ${importedCount} new orders`);
  return existingOrders;
}

export async function importMenuFromJSON(menuData) {
  if (!menuData || typeof menuData !== 'object') {
    throw new Error("Invalid menu data for import");
  }
  
  await saveMenu(menuData);
  console.log("Menu imported successfully");
  return menuData;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Clear all stored data (for testing/reset)
 */
export async function clearAllData() {
  try {
    await localforage.clear();
    console.log("All data cleared successfully");
    return true;
  } catch (error) {
    console.error("Failed to clear data:", error);
    throw new Error(`Clear data failed: ${error.message}`);
  }
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats() {
  try {
    const keys = await localforage.keys();
    const stats = {
      totalKeys: keys.length,
      keys: keys
    };
    
    for (const key of keys) {
      const value = await localforage.getItem(key);
      stats[key] = {
        type: Array.isArray(value) ? 'array' : typeof value,
        length: Array.isArray(value) ? value.length : Object.keys(value || {}).length
      };
    }
    
    return stats;
  } catch (error) {
    console.error("Failed to get storage stats:", error);
    return { error: error.message };
  }
}

// =============================================================================
// DEFAULT EXPORT FOR CONVENIENCE
// =============================================================================

export default {
  // Initialization
  initLocalStore,
  
  // Menu operations
  getMenu,
  saveMenu,
  upsertProduct,
  bulkToggleChickenItems,
  
  // Order operations
  getAllOrders,
  saveAllOrders,
  getBackendOrders,
  getLocalOrders,
  upsertLocalOrder,
  updateOrderStatus,
  updateLocalOrderStatus,
  updateBackendOrderStatus,
  
  // Shop operations
  getShopStatus,
  setShopStatus,
  
  // Offers operations
  getOffersRules,
  saveOffersRules,
  
  // Import/Export
  importOrdersFromJSON,
  importMenuFromJSON,
  
  // Utilities
  clearAllData,
  getStorageStats
};