/**
 * Kitchen Order Ticket (KOT) Data Model
 * Defines the structure for kitchen order management
 */

// KOT Status Enum
export const KOT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Item Status Enum
export const ITEM_STATUS = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Priority Levels
export const PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

// KOT Item Structure
export const KOTItem = {
  id: 'string',           // Unique item identifier
  name: 'string',         // Item name
  quantity: 'number',     // Quantity ordered
  unitPrice: 'number',    // Price per unit
  status: 'string',       // ITEM_STATUS
  notes: 'string',        // Special instructions
  category: 'string',     // Food category (e.g., 'appetizer', 'main', 'dessert')
  preparationTime: 'number', // Estimated prep time in minutes
  actualPrepTime: 'number',   // Actual prep time taken
  startedAt: 'datetime',  // When preparation started
  completedAt: 'datetime', // When preparation completed
  assignedTo: 'string',   // Kitchen station/chef assigned
  modifications: 'array'  // Array of modifications/customizations
};

// Main KOT Structure
export const KOT = {
  id: 'string',           // Unique KOT identifier
  orderId: 'string',      // Reference to original order
  tableNumber: 'string',  // Table number (for dine-in)
  orderType: 'string',    // 'dine-in', 'takeaway', 'delivery'
  customerName: 'string', // Customer name (if available)
  priority: 'string',     // PRIORITY level
  status: 'string',       // KOT_STATUS
  items: 'array',         // Array of KOTItem objects
  totalAmount: 'number',  // Total order amount
  createdAt: 'datetime',  // When KOT was created
  confirmedAt: 'datetime', // When order was confirmed
  startedAt: 'datetime',  // When preparation started
  completedAt: 'datetime', // When all items completed
  estimatedTime: 'number', // Estimated completion time (minutes)
  actualTime: 'number',   // Actual time taken (minutes)
  notes: 'string',        // Order-level notes
  source: 'string',       // Order source ('pos', 'manual', 'online')
  modifications: 'array', // Order-level modifications
  kitchenNotes: 'string', // Internal kitchen notes
  specialInstructions: 'string' // Special cooking instructions
};

// Kitchen Station Structure
export const KitchenStation = {
  id: 'string',           // Station identifier
  name: 'string',         // Station name (e.g., 'Grill', 'Fryer', 'Cold Prep')
  description: 'string',  // Station description
  categories: 'array',    // Food categories this station handles
  capacity: 'number',     // Maximum concurrent items
  currentLoad: 'number',  // Current number of items
  status: 'string',       // 'active', 'inactive', 'maintenance'
  assignedItems: 'array'  // Currently assigned item IDs
};

// KOT Statistics
export const KOTStats = {
  totalOrders: 'number',
  pendingOrders: 'number',
  preparingOrders: 'number',
  readyOrders: 'number',
  completedOrders: 'number',
  cancelledOrders: 'number',
  averagePrepTime: 'number',
  averageWaitTime: 'number',
  ordersByPriority: 'object',
  ordersByCategory: 'object',
  stationUtilization: 'array'
};

// Helper functions for KOT management
export const KOTHelpers = {
  // Generate unique KOT ID
  generateKOTId: () => {
    return `KOT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  },

  // Calculate estimated completion time
  calculateEstimatedTime: (items) => {
    if (!items || items.length === 0) return 0;
    const maxPrepTime = Math.max(...items.map(item => item.preparationTime || 0));
    return maxPrepTime;
  },

  // Get items by category
  getItemsByCategory: (items, category) => {
    return items.filter(item => item.category === category);
  },

  // Check if all items are completed
  isOrderCompleted: (items) => {
    return items.every(item => item.status === ITEM_STATUS.COMPLETED);
  },

  // Get next priority item
  getNextPriorityItem: (items) => {
    const priorityOrder = [PRIORITY.URGENT, PRIORITY.HIGH, PRIORITY.NORMAL, PRIORITY.LOW];
    for (const priority of priorityOrder) {
      const item = items.find(item => 
        item.status === ITEM_STATUS.PENDING && 
        item.priority === priority
      );
      if (item) return item;
    }
    return null;
  },

  // Format KOT for display
  formatKOTForDisplay: (kot) => {
    return {
      ...kot,
      displayTime: new Date(kot.createdAt).toLocaleTimeString(),
      itemsCount: kot.items.length,
      pendingItems: kot.items.filter(item => item.status === ITEM_STATUS.PENDING).length,
      preparingItems: kot.items.filter(item => item.status === ITEM_STATUS.PREPARING).length,
      readyItems: kot.items.filter(item => item.status === ITEM_STATUS.READY).length
    };
  },

  // Check if KOT is within specified time window (in hours)
  isKOTRecent: (kot, hours = 24) => {
    if (!kot || !kot.createdAt) return false;
    const kotDate = new Date(kot.createdAt);
    const timeWindow = new Date(Date.now() - hours * 60 * 60 * 1000);
    return kotDate >= timeWindow;
  },

  // Filter KOTs by time window
  filterKOTsByTime: (kotData, hours = 24) => {
    if (!kotData || !Array.isArray(kotData)) return [];
    return kotData.filter(kot => KOTHelpers.isKOTRecent(kot, hours));
  },

  // Get KOT age in human-readable format
  getKOTAge: (createdAt) => {
    const now = Date.now();
    const created = new Date(createdAt).getTime();
    const elapsed = Math.floor((now - created) / 1000 / 60); // minutes
    
    if (elapsed < 1) return 'Just now';
    if (elapsed < 60) return `${elapsed} minutes ago`;
    
    const hours = Math.floor(elapsed / 60);
    const minutes = elapsed % 60;
    if (hours < 24) {
      return minutes > 0 ? `${hours}h ${minutes}m ago` : `${hours}h ago`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h ago` : `${days}d ago`;
  }
};
