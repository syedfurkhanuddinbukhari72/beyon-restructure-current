/**
 * normalizeOrder.js - ONE canonical Order shape
 * 
 * PURPOSE: Convert all order variants to a single, predictable shape
 * This prevents React crashes and ensures consistent UI rendering
 */

export function normalizeOrder(order) {
  if (!order || typeof order !== 'object') return null;

  const items = Array.isArray(order.items) ? [...order.items] : [];

  const normalizedOrder = {
    id: order.id || order._id,
    source: order.source || 'local',
    status:
      typeof order.kotStatus === 'string'
        ? order.kotStatus
        : typeof order.status === 'string'
          ? order.status
          : order.status?.status || 'pending',
    priority: order.priority || 'normal',
    items: [...items].map(i => ({
      name: i.name || 'Unknown Item',
      qty: Number(i.qty) || 1,
      price: Number(i.price) || 0,
      status: i.status || 'pending'
    })),
    total: Number(order.total) || 0,
    createdAt: order.createdAt || new Date().toISOString(),
    tableNumber: order.tableNumber ?? null,
    notes: order.notes || ''
  };

  // 🔍 DEV: Freeze to detect mutations (remove in production if needed)
  if (process.env.NODE_ENV === 'development') {
    Object.freeze(normalizedOrder);
    Object.freeze(normalizedOrder.items);
  }

  return normalizedOrder;
}
