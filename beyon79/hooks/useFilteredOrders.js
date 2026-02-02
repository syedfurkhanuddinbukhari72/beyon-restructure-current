import { useMemo } from 'react';
import { KOT_STATUS } from '../models/kotModel';

// Helper function to extract status from order (handles both string and object status)
const getOrderStatus = (order) => {
  if (typeof order.status === 'string') {
    return order.status;
  }
  if (typeof order.status === 'object' && order.status.status) {
    return order.status.status;
  }
  return '';
};

// Helper function to map generic order status to KOT status
export const mapOrderStatusToKOTStatus = (orderStatus) => {
  switch (orderStatus) {
    case 'placed':
    case 'paid':
    case 'pending':
      return KOT_STATUS.PENDING;
    case 'confirmed':
      return KOT_STATUS.CONFIRMED;
    case 'preparing':
      return KOT_STATUS.PREPARING;
    case 'completed':
      return KOT_STATUS.READY; // Only map completed to ready if it was actually completed
    case 'cancelled':
      return KOT_STATUS.CANCELLED;
    default:
      return KOT_STATUS.PENDING;
  }
};

export const useFilteredOrders = (orders, tab) => {
  return useMemo(() => {
    console.log(`🔍 useFilteredOrders - filtering ${orders.length} orders for tab: ${tab}`);
    
    // ✅ STEP 1: Fix validation - don't reject valid orders
    const isRenderableOrder = (order) =>
      order &&
      typeof order.id === 'string' &&
      Array.isArray(order.items);
    
    orders = orders.filter(isRenderableOrder);
    console.log(`🛡️ After validation: ${orders.length} remaining`);
    
    // 🛠️ Fix #2: Filter before size check for Local tab
    const localOrders = orders.filter(o => o.source === 'local');
    
    if (tab === 'Local') {
      console.log('✅ Local tab - showing local orders only:', localOrders.length);
      return localOrders;
    }
    
    // 🛠️ Fix #1: Allow Local tab, short-circuit other non-critical tabs
    if (orders.length > 5000 && tab !== 'KOT') {
      console.log('🚫 Large dataset, short-circuiting for non-critical tab:', tab);
      return [];
    }
    
    let filteredOrders = [];
    
    switch (tab) {
      case 'Ready':
        console.log('🎯 Ready tab filtering - checking orders...');
        filteredOrders = orders.filter(order => {
          const extractedStatus = getOrderStatus(order);
          const isReady = extractedStatus === 'ready' || 
                         (order.kotCompleted === true && extractedStatus !== 'paid' && extractedStatus !== 'archived' && extractedStatus !== 'cancelled');
          return isReady;
        });
        console.log(`🎯 Ready tab filtered ${filteredOrders.length} orders`);
        break;
      case 'Active':
        console.log('⚡ Active tab filtering - checking orders...');
        filteredOrders = orders.filter(order => {
          const extractedStatus = getOrderStatus(order);
          const isActive = ['pending', 'confirmed', 'preparing'].includes(extractedStatus);
          return isActive;
        });
        console.log(`⚡ Active tab filtered ${filteredOrders.length} orders`);
        break;
      case 'Local':
        filteredOrders = orders.filter(order => order.source === 'local');
        break;
      case 'Paid':
        filteredOrders = orders.filter(order => {
          const extractedStatus = getOrderStatus(order);
          const isPaid = extractedStatus === 'paid';
          return isPaid;
        });
        break;
      case 'Archived':
        filteredOrders = orders.filter(order => {
          const extractedStatus = getOrderStatus(order);
          const isArchived = extractedStatus === 'archived';
          return isArchived;
        });
        break;
      case 'Cancelled':
        filteredOrders = orders.filter(order => {
          const extractedStatus = getOrderStatus(order);
          const isCancelled = extractedStatus === 'cancelled';
          
          // 🔥 NEW: Also include orders with cancelled items from KOT
          const hasCancelledItems = order.items && order.items.some(item => item.status === 'cancelled');
          
          return isCancelled || hasCancelledItems;
        });
        
        // 🔥 NEW: For orders with cancelled items, create virtual cancelled items
        const ordersWithCancelledItems = filteredOrders.filter(order => {
          const isFullyCancelled = getOrderStatus(order) === 'cancelled';
          const hasCancelledItems = order.items && Array.isArray(order.items) && order.items.some(item => item.status === 'cancelled');
          return !isFullyCancelled && hasCancelledItems;
        });
        
        // Create virtual cancelled item entries
        const virtualCancelledItems = ordersWithCancelledItems.flatMap(order => {
          if (!order.items || !Array.isArray(order.items)) return [];
          const cancelledItems = order.items.filter(item => item.status === 'cancelled');
          return cancelledItems.map(item => ({
            _id: `${order._id}-cancelled-${item.id || item.name || 'unknown'}`,
            orderId: order._id,
            orderType: 'cancelled-item',
            name: item.name || 'Unknown Item',
            quantity: item.quantity || item.qty || 1,
            status: 'cancelled',
            source: 'kot-cancelled',
            originalOrder: order,
            cancelledItem: item,
            createdAt: order.createdAt || new Date().toISOString(),
            customerName: order.customerName || 'KOT Customer',
            tableNumber: order.tableNumber || '—'
          }));
        });
        
        // Combine fully cancelled orders with virtual cancelled items
        const fullyCancelledOrders = filteredOrders.filter(order => getOrderStatus(order) === 'cancelled');
        filteredOrders = [...fullyCancelledOrders, ...virtualCancelledItems];
        
        console.log('🚫 Cancelled tab filtered:', {
          fullyCancelledOrders: fullyCancelledOrders.length,
          virtualCancelledItems: virtualCancelledItems.length,
          total: filteredOrders.length
        });
        break;
      case 'KOT':
        console.log('🍳 KOT tab filtering - checking orders...');

        // ✅ STEP 3: Fix KOT filter (final correct logic)
        filteredOrders = orders.filter(order => {
          console.log(order.id, order.status, order.kotCompleted);

          if (!order.createdAt) return false;

          const age = Date.now() - new Date(order.createdAt).getTime();
          if (age > 6 * 60 * 60 * 1000) return false; // 6 hours

          return (
            ['pending', 'confirmed', 'preparing', 'placed', 'paid']
              .includes(order.status) &&
            order.kotCompleted !== true
          );
        });

        // ✅ OPTION A: Convert ONCE before UI - KOT-shaped objects
        filteredOrders = filteredOrders.map(order => {
          const mappedStatus = mapOrderStatusToKOTStatus(order.status);
          console.log('🔄 KOT Status Mapping:', {
            orderId: order.id,
            originalStatus: order.status,
            mappedStatus: mappedStatus
          });
          
          return {
            id: order.kotId 
              || order._id 
              || `local-${order.createdAt}-${Math.random().toString(36).substr(2, 9)}`,
            orderId: order._id,
            status: mappedStatus, // STRING ONLY
            priority: order.priority || 'normal',
            items: Array.isArray(order.items) ? order.items : [],
            total: Number(order.total || order.totalAmount || 0),
            customerName: order.customerName || 'Manual Order',
            tableNumber: order.tableNumber,
            createdAt: order.createdAt,
            notes: order.notes
          };
        });

        console.log('🍳 KOT FINAL FILTER:', {
          total: orders.length,
          filtered: filteredOrders.length,
          timeWindow: '6 hours',
          sample: filteredOrders[0]
        });

        // ✅ FIX 2: Dedupe KOTs by ID
        const uniqueById = new Map();
        filteredOrders.forEach(order => {
          if (!uniqueById.has(order.id)) {
            uniqueById.set(order.id, order);
          }
        });
        filteredOrders = Array.from(uniqueById.values());
        
        console.log('🔧 After deduplication:', {
          before: uniqueById.size,
          after: filteredOrders.length,
          duplicatesRemoved: uniqueById.size - filteredOrders.length
        });

        // RULE #5: Short-circuit for KOT if no results
        if (filteredOrders.length === 0) {
          console.log('🚫 useFilteredOrders - KOT tab has no filtered results, returning empty array');
          return [];
        }
        
        break;
      default:
        filteredOrders = [];
    }
    
    console.log(`🔍 useFilteredOrders - result: ${filteredOrders.length} orders`);
    
    // Sort by createdAt (newest first)
    return filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders, tab]);
};
