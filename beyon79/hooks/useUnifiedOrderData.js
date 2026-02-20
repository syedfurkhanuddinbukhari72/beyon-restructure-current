import { useCallback } from 'react';
import * as localData from '@/src/localDataService';
import { useOrderData } from '../contexts/OrderDataContext';

// ✅ STEP 3: Enforce retention AUTOMATICALLY (critical)
const pruneOldOrders = (orders) => {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const cleaned = orders.filter(o => {
    const t = new Date(o.createdAt).getTime();
    return !isNaN(t) && now - t <= DAY;
  });

  console.log('🗑️ Pruned old orders:', {
    before: orders.length,
    after: cleaned.length,
    removed: orders.length - cleaned.length
  });

  return cleaned;
};

export const useUnifiedOrderData = () => {
  const { state, dispatch } = useOrderData();

  const fetchOrders = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // ❌ REMOVED: KOT "Bridge" Logic
      // KOT data is now strictly part of the main Order object in LocalForage.
      // We no longer sync from localStorage 'kotTabData'.

      // Get all orders from localforage (now including KOT orders)
      const allOrders = await localData.getAllOrders();

      console.log('🔄 useUnifiedOrderData - fetched orders:', allOrders.length);
      console.log('🔄 Sample orders:', allOrders.slice(0, 3).map(o => ({
        id: o._id,
        status: o.status,
        kotCompleted: o.kotCompleted,
        source: o.source
      })));

      // Check for ready orders specifically
      const readyOrders = allOrders.filter(o => o.status === 'ready' || o.kotCompleted === true);
      console.log('🎯 Ready orders in fetchOrders:', readyOrders.length);
      console.log('🎯 Ready orders details:', readyOrders.map(o => ({
        id: o._id,
        status: o.status,
        kotCompleted: o.kotCompleted
      })));

      // ✅ STEP 3: Enforce retention AUTOMATICALLY (critical)
      const cleanedOrders = pruneOldOrders(allOrders);

      dispatch({ type: 'SET_ORDERS', payload: cleanedOrders });

      return cleanedOrders;
    } catch (error) {
      console.error('❌ useUnifiedOrderData - fetch error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [dispatch]);

  // NEW: Fetch only KOT-relevant orders to prevent data overload
  const fetchKOTOrders = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // ❌ REMOVED: Dangerous legacy bridge code that was causing data pollution
      // KOT must NEVER restore old data from localStorage
      // Single source of truth - fetch from localforage only

      // PERFORMANCE: Get all orders but filter immediately for KOT-relevant ones
      const allOrders = await localData.getAllOrders();

      // PERFORMANCE: Apply time window filter first for large datasets
      let kotEligibleOrders = allOrders;

      if (allOrders.length > 1000) {
        console.log('🍳 fetchKOTOrders - large dataset, applying time window filter first');
        const last60Min = Date.now() - 60 * 60 * 1000; // Last 60 minutes
        kotEligibleOrders = allOrders.filter(order => {
          const orderTime = new Date(order.createdAt).getTime();
          return orderTime >= last60Min && !isNaN(orderTime);
        });
        console.log(`🍳 Time window filtered to ${kotEligibleOrders.length} orders (last 60 min)`);
      }

      // TEMP FIX: Filter for KOT-relevant orders using generic statuses
      const kotRelevantOrders = kotEligibleOrders.filter(order => {
        // MUST have a valid status
        if (!order.status) return false;

        // DEBUG: Log first few orders to understand data structure
        if (kotEligibleOrders.indexOf(order) < 3) {
          console.log('🔍 DEBUG Order Sample:', {
            _id: order._id,
            status: order.status,
            source: order.source,
            createdAt: order.createdAt
          });
        }

        // Include orders that would be relevant for kitchen operations
        // placed/paid = pending for kitchen
        // confirmed = preparing 
        // completed = ready (but only if recent)

        if (['placed', 'paid'].includes(order.status)) {
          return true; // These are pending for kitchen
        }

        if (['confirmed', 'preparing'].includes(order.status)) {
          return true; // These are being prepared
        }

        // Only include completed orders if they're very recent (last 15 minutes)
        if (order.status === 'completed') {
          const orderTime = new Date(order.createdAt).getTime();
          const last15Min = Date.now() - 15 * 60 * 1000;
          return orderTime >= last15Min;
        }

        return false;
      });

      console.log('🎯 KOT FILTERED ORDERS:', {
        total: allOrders.length,
        filtered: kotRelevantOrders.length,
        reduction: `${((allOrders.length - kotRelevantOrders.length) / allOrders.length * 100).toFixed(1)}% reduction`,
        sampleFiltered: kotRelevantOrders.slice(0, 3).map(o => ({
          id: o._id,
          status: o.status,
          source: o.source,
          createdAt: o.createdAt
        }))
      });

      // ❌ DO NOT dispatch to global state - KOT data is now separate
      // dispatch({ type: 'SET_ORDERS', payload: kotRelevantOrders });

      return kotRelevantOrders;
    } catch (error) {
      console.error('❌ useUnifiedOrderData - fetchKOTOrders error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [dispatch]);

  const updateOrder = useCallback(async (orderId, updates) => {
    try {
      console.log('🔄 useUnifiedOrderData.updateOrder called:', {
        orderId,
        updates,
        updatesKeys: Object.keys(updates),
        kotCompleted: updates.kotCompleted,
        status: updates.status
      });

      // Optimistically update the status in local state for immediate UI feedback
      const optimisticOrder = state.orders.find(o => o._id === orderId);
      if (optimisticOrder) {
        const optimisticUpdate = { ...optimisticOrder, ...updates };
        console.log('⚡ Optimistic update:', {
          orderId,
          oldStatus: optimisticOrder.status,
          newStatus: optimisticUpdate.status
        });
        dispatch({ type: 'UPDATE_ORDER', payload: optimisticUpdate });
      }

      const updatedOrder = await localData.updateLocalOrderStatus(orderId, updates);

      console.log('✅ useUnifiedOrderData - order updated successfully:', {
        orderId,
        returnedOrder: updatedOrder ? {
          id: updatedOrder._id,
          status: updatedOrder.status,
          kotCompleted: updatedOrder.kotCompleted
        } : null
      });

      // Update with the actual data from backend
      dispatch({ type: 'UPDATE_ORDER', payload: updatedOrder });
      return updatedOrder;
    } catch (error) {
      console.error('❌ useUnifiedOrderData - update error:', error);
      // On error, fetch fresh data to revert optimistic changes
      try {
        await fetchOrders();
      } catch (fetchError) {
        console.error('❌ Failed to revert optimistic update:', fetchError);
      }
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [dispatch, state.orders, fetchOrders]);

  const addOrder = useCallback(async (orderData) => {
    try {
      console.log('🆕 useUnifiedOrderData.addOrder called:', {
        orderId: orderData._id,
        status: orderData.status,
        kotCompleted: orderData.kotCompleted,
        source: orderData.source
      });

      const newOrder = await localData.upsertLocalOrder(orderData);

      console.log('✅ useUnifiedOrderData - order added successfully:', {
        orderId: newOrder._id,
        status: newOrder.status,
        kotCompleted: newOrder.kotCompleted
      });

      dispatch({ type: 'ADD_ORDER', payload: newOrder });
      return newOrder;
    } catch (error) {
      console.error('❌ useUnifiedOrderData - add error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [dispatch]);

  return {
    orders: state.orders,
    loading: state.loading,
    error: state.error,
    fetchOrders,
    fetchKOTOrders, // NEW: KOT-optimized fetch function
    updateOrder,
    addOrder
  };
};
