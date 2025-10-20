// data/ordersStore-unified.js

// Unified in-memory orders array for API routes with file persistence
const fs = require('fs');
const path = require('path');

// Use process.cwd() for Next.js compatibility - same path for both APIs
const ORDERS_FILE = path.join(process.cwd(), 'data', 'local-orders.json');

// Initialize orders array
let orders = [];
let isSaving = false;
let saveTimeout = null;

// Load orders from file (encapsulated)
const loadOrders = () => {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf8');
      try {
        orders = JSON.parse(data) || [];
      } catch (parseErr) {
        console.error('Error parsing orders JSON:', parseErr);
        orders = [];
      }
      console.log(`Loaded ${orders.length} orders from local storage`);
    } else {
      console.log('local-orders.json not found, starting with empty orders array');
      orders = [];
    }
  } catch (error) {
    console.error('Error loading orders from file:', error);
    orders = [];
  }
};

// Save orders to file atomically, prevent overlapping writes (fully async)
const saveOrders = async () => {
  if (isSaving) return;
  isSaving = true;
  try {
    const dataDir = path.dirname(ORDERS_FILE);
    await fs.promises.mkdir(dataDir, { recursive: true });

    // Write atomically: write to temp file first, then rename
    const tempFile = ORDERS_FILE + '.tmp';
    await fs.promises.writeFile(tempFile, JSON.stringify(orders, null, 2));
    await fs.promises.rename(tempFile, ORDERS_FILE);

    console.log(`Saved ${orders.length} orders to local storage`);
  } catch (error) {
    console.error('Error saving orders to file:', error);
  } finally {
    isSaving = false;
  }
};

// Debounced save
const scheduleSave = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveOrders, 1000);
};

// Replace the entire orders array safely
const setOrders = (newOrders) => {
  if (!Array.isArray(newOrders)) throw new Error('setOrders expects an array');
  orders = newOrders;
  scheduleSave();
};

// Get a shallow copy of orders (prevents accidental mutation)
const getOrders = () => [...orders];

// Get a single order by id
const getOrderById = (id) => orders.find(o => o._id === id) || null;

// Update a single order by id, return updated order
const updateOrder = (id, updatedFields) => {
  const index = orders.findIndex(o => o._id === id);
  if (index === -1) return null;
  orders[index] = { ...orders[index], ...updatedFields };
  scheduleSave();
  return orders[index];
};

// Initial load
loadOrders();

// Auto-save orders every 30 seconds
setInterval(saveOrders, 30000);

module.exports = {
  orders,
  getOrders,
  getOrderById,
  loadOrders,
  saveOrders,
  setOrders,
  updateOrder,
};
