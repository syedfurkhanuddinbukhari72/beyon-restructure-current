// 🎯 SINGLE SOURCE OF TRUTH - UNIFIED ORDER SCHEMA
export const UNIFIED_ORDER_SCHEMA = {
  // Core identifiers
  id: null,           // Unified ID (used everywhere)
  orderId: null,      // Original order ID (for reference)
  
  // Status (UNIFIED VALUES)
  status: 'pending',  // 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  
  // Customer info (UNIFIED STRUCTURE)
  customer: {
    name: '',
    phone: '',
    email: ''
  },
  
  // Items (UNIFIED STRUCTURE)
  items: [],          // Array of { name, quantity, price, status, notes }
  
  // Pricing (UNIFIED FIELD NAMES)
  total: 0,           // Always 'total', never 'totalAmount' or 'totalPrice'
  subtotal: 0,
  tax: 0,
  
  // Metadata (UNIFIED)
  source: 'local',    // 'local' | 'online' | 'pos'
  createdAt: null,
  updatedAt: null,
  
  // KOT specific
  kotId: null,        // KOT-specific ID
  kotCompleted: false,
  kotStation: null,
  
  // Workflow timestamps
  confirmedAt: null,
  startedAt: null,
  completedAt: null
}

// 🔄 NORMALIZATION FUNCTIONS
export class OrderNormalizer {
  // Normalize from LocalForage format
  static fromLocalForage(order) {
    return {
      ...UNIFIED_ORDER_SCHEMA,
      id: order._id,
      orderId: order._id,
      status: order.status || 'pending',
      customer: {
        name: order.customerName || 'Walk-in Customer',
        phone: order.customerPhone || '',
        email: order.customerEmail || ''
      },
      items: Array.isArray(order.items) ? order.items.map(item => ({
        name: item.name || item.itemName || '',
        quantity: item.quantity || 1,
        price: item.price || 0,
        status: item.status || 'pending',
        notes: item.notes || ''
      })) : [],
      total: order.total || order.totalAmount || 0,
      source: order.source || 'local',
      createdAt: order.createdAt || new Date().toISOString(),
      updatedAt: order.updatedAt || order.createdAt
    }
  }
  
  // Normalize from localStorage KOT format
  static fromLocalStorage(kotOrder) {
    return {
      ...UNIFIED_ORDER_SCHEMA,
      id: kotOrder.id,
      orderId: kotOrder.orderId,
      status: kotOrder.status || 'pending',
      customer: {
        name: kotOrder.customerName || 'Walk-in Customer',
        phone: kotOrder.customerPhone || '',
        email: kotOrder.customerEmail || ''
      },
      items: Array.isArray(kotOrder.items) ? kotOrder.items.map(item => ({
        name: item.name || item.itemName || '',
        quantity: item.quantity || 1,
        price: item.price || 0,
        status: item.status || 'pending',
        notes: item.notes || ''
      })) : [],
      total: kotOrder.totalAmount || kotOrder.total || 0,
      source: kotOrder.source || 'local',
      createdAt: kotOrder.createdAt || new Date().toISOString(),
      updatedAt: kotOrder.updatedAt || kotOrder.createdAt,
      kotId: kotOrder.id,
      kotCompleted: kotOrder.kotCompleted || false,
      kotStation: kotOrder.kotStation || null
    }
  }
  
  // Normalize from MongoDB format
  static fromMongoDB(dbOrder) {
    return {
      ...UNIFIED_ORDER_SCHEMA,
      id: dbOrder._id.toString(),
      orderId: dbOrder._id.toString(),
      status: dbOrder.status || 'pending',
      customer: {
        name: dbOrder.customer?.name || dbOrder.customerName || 'Walk-in Customer',
        phone: dbOrder.customer?.phone || dbOrder.customerPhone || '',
        email: dbOrder.customer?.email || dbOrder.customerEmail || ''
      },
      items: Array.isArray(dbOrder.orderItems || dbOrder.items) ? 
        (dbOrder.orderItems || dbOrder.items).map(item => ({
          name: item.name || item.itemName || '',
          quantity: item.quantity || 1,
          price: item.price || 0,
          status: item.status || 'pending',
          notes: item.notes || ''
        })) : [],
      total: dbOrder.totalPrice || dbOrder.total || dbOrder.totalAmount || 0,
      source: dbOrder.source || 'online',
      createdAt: dbOrder.createdAt || new Date().toISOString(),
      updatedAt: dbOrder.updatedAt || dbOrder.createdAt
    }
  }
  
  // Convert unified format back to specific formats
  static toLocalForage(unifiedOrder) {
    return {
      _id: unifiedOrder.orderId,
      status: unifiedOrder.status,
      customerName: unifiedOrder.customer.name,
      customerPhone: unifiedOrder.customer.phone,
      customerEmail: unifiedOrder.customer.email,
      items: unifiedOrder.items,
      total: unifiedOrder.total,
      source: unifiedOrder.source,
      createdAt: unifiedOrder.createdAt,
      updatedAt: unifiedOrder.updatedAt
    }
  }
  
  static toLocalStorageKOT(unifiedOrder) {
    return {
      id: unifiedOrder.kotId || unifiedOrder.id,
      orderId: unifiedOrder.orderId,
      status: unifiedOrder.status,
      customerName: unifiedOrder.customer.name,
      customerPhone: unifiedOrder.customer.phone,
      customerEmail: unifiedOrder.customer.email,
      items: unifiedOrder.items,
      totalAmount: unifiedOrder.total,
      source: unifiedOrder.source,
      createdAt: unifiedOrder.createdAt,
      updatedAt: unifiedOrder.updatedAt,
      kotCompleted: unifiedOrder.kotCompleted,
      kotStation: unifiedOrder.kotStation
    }
  }
  
  static toMongoDB(unifiedOrder) {
    return {
      _id: unifiedOrder.orderId,
      status: unifiedOrder.status,
      customer: {
        name: unifiedOrder.customer.name,
        phone: unifiedOrder.customer.phone,
        email: unifiedOrder.customer.email
      },
      orderItems: unifiedOrder.items,
      totalPrice: unifiedOrder.total,
      source: unifiedOrder.source,
      createdAt: unifiedOrder.createdAt,
      updatedAt: unifiedOrder.updatedAt
    }
  }
}

// 🎯 STATUS MAPPING (UNIFIED VALUES)
export const STATUS_MAPPING = {
  // Input formats → Unified format
  'placed': 'pending',
  'paid': 'pending',
  'pending': 'pending',
  
  'confirmed': 'confirmed',
  'accepted': 'confirmed',
  
  'preparing': 'preparing',
  'in-progress': 'preparing',
  'cooking': 'preparing',
  
  'ready': 'ready',
  'completed': 'ready',  // For KOT, completed means ready to serve
  
  'cancelled': 'cancelled',
  'canceled': 'cancelled'
}

export function normalizeStatus(status) {
  return STATUS_MAPPING[status] || 'pending'
}
