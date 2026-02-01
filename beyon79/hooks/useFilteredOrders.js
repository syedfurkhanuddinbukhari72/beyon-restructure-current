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
      return KOT_STATUS.READY;
    case 'cancelled':
      return KOT_STATUS.CANCELLED;
    default:
      return KOT_STATUS.PENDING;
  }
};

export const useFilteredOrders = (orders, tab) => {
  return useMemo(() => {
    console.log(`🔍 useFilteredOrders - filtering ${orders.length} orders for tab: ${tab}`);
    
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
          return isCancelled;
        });
        break;
      case 'KOT':
        console.log('🍳 KOT tab filtering - checking orders...');
        
        // ✅ STEP 4: Lock KOT to operational scope ONLY
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;

        filteredOrders = orders.filter(order => {
          if (!order) return false;

          const t = new Date(order.createdAt).getTime();
          if (isNaN(t) || now - t > ONE_HOUR) {
            return false; // ⏱️ hard window: only last hour
          }

          // 1️⃣ Status check
          const allowedStatuses = [
            'pending',
            'placed',
            'paid',
            'confirmed',
            'preparing'
          ];
          if (!allowedStatuses.includes(order.status)) return false;

          // 2️⃣ Must NOT be completed
          if (order.kotCompleted === true) return false;

          // 3️⃣ Must have items (CRITICAL)
          if (!Array.isArray(order.items) || order.items.length === 0) return false;

          return true;
        });

        // ✅ OPTION A: Convert ONCE before UI - KOT-shaped objects
        filteredOrders = filteredOrders.map(order => ({
          id: order.kotId || order._id,
          orderId: order._id,
          status: order.status === 'pending'
            ? 'PENDING'
            : order.status === 'confirmed'
            ? 'CONFIRMED'
            : order.status === 'preparing'
            ? 'PREPARING'
            : 'PENDING',
          
          kotStatus: order.status,
          items: order.items || [],
          createdAt: order.createdAt,
          source: order.source,
          total: order.total || order.totalAmount || 0,
          customerName: order.customerName || 'Manual Order',
          tableNumber: order.tableNumber,
          orderType: order.orderType,
          priority: order.priority || 'normal',
          notes: order.notes,
          kitchenNotes: order.kitchenNotes,
          confirmedAt: order.confirmedAt,
          startedAt: order.startedAt,
          completedAt: order.completedAt,
          estimatedTime: order.estimatedTime,
          actualTime: order.actualTime
        }));

        console.log('🍳 KOT FINAL FILTER:', {
          total: orders.length,
          filtered: filteredOrders.length,
          timeWindow: '1 hour',
          sample: filteredOrders[0]
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
