import { useMemo } from 'react';

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

export const useFilteredOrders = (orders, tab) => {
  return useMemo(() => {
    console.log(`🔍 useFilteredOrders - filtering ${orders.length} orders for tab: ${tab}`);
    
    let filteredOrders = [];
    
    switch (tab) {
      case 'Ready':
        console.log('🎯 Ready tab filtering - checking orders...');
        console.log('🎯 All orders being checked:', orders.map(o => ({
          _id: o._id,
          status: o.status,
          statusType: typeof o.status,
          extractedStatus: getOrderStatus(o),
          kotCompleted: o.kotCompleted,
          kotId: o.kotId,
          source: o.source
        })));
        filteredOrders = orders.filter(order => {
          const extractedStatus = getOrderStatus(order);
          const isReady = extractedStatus === 'ready' || 
                         (order.kotCompleted === true && extractedStatus !== 'paid' && extractedStatus !== 'archived' && extractedStatus !== 'cancelled');
          console.log(`🎯 Order ${order._id}: status="${order.status}" (${typeof order.status}), extracted="${extractedStatus}", kotCompleted=${order.kotCompleted}, passes=${isReady}`);
          if (order.kotId) {
            console.log(`🎯   - This is a KOT order with kotId: ${order.kotId}`);
          }
          if (order.source) {
            console.log(`🎯   - Source: ${order.source}`);
          }
          return isReady;
        });
        console.log(`🎯 Ready tab filtered ${filteredOrders.length} orders`);
        break;
      case 'Active':
        filteredOrders = orders.filter(order => 
          ['pending', 'confirmed', 'accepted', 'preparing'].includes(order.status) &&
          order.source !== 'local'
        );
        break;
      case 'Local':
        filteredOrders = orders.filter(order => order.source === 'local');
        break;
      case 'Paid':
        console.log('💰 Paid tab filtering - checking orders...');
        console.log('💰 All orders being checked:', orders.map(o => ({
          _id: o._id,
          status: o.status,
          statusType: typeof o.status,
          extractedStatus: getOrderStatus(o),
          kotCompleted: o.kotCompleted,
          kotId: o.kotId,
          source: o.source
        })));
        filteredOrders = orders.filter(order => {
          const extractedStatus = getOrderStatus(order);
          const isPaid = extractedStatus === 'paid';
          console.log(`💰 Order ${order._id}: status="${order.status}" (${typeof order.status}), extracted="${extractedStatus}", isPaid=${isPaid}`);
          return isPaid;
        });
        console.log(`💰 Paid tab filtered ${filteredOrders.length} orders`);
        break;
      case 'Archived':
        console.log('📁 Archived tab filtering - checking orders...');
        filteredOrders = orders.filter(order => {
          const extractedStatus = getOrderStatus(order);
          const isArchived = extractedStatus === 'archived';
          console.log(`📁 Order ${order._id}: status="${order.status}" (${typeof order.status}), extracted="${extractedStatus}", isArchived=${isArchived}`);
          return isArchived;
        });
        console.log(`📁 Archived tab filtered ${filteredOrders.length} orders`);
        break;
      case 'Cancelled':
        console.log('❌ Cancelled tab filtering - checking orders...');
        filteredOrders = orders.filter(order => {
          const extractedStatus = getOrderStatus(order);
          const isCancelled = extractedStatus === 'cancelled';
          console.log(`❌ Order ${order._id}: status="${order.status}" (${typeof order.status}), extracted="${extractedStatus}", isCancelled=${isCancelled}`);
          return isCancelled;
        });
        console.log(`❌ Cancelled tab filtered ${filteredOrders.length} orders`);
        break;
      default:
        filteredOrders = [];
    }
    
    console.log(`🔍 useFilteredOrders - result: ${filteredOrders.length} orders`);
    
    // Sort by createdAt (newest first)
    return filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders, tab]);
};
