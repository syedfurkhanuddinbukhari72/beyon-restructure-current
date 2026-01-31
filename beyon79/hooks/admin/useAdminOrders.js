import { useCallback, useEffect, useMemo } from 'react';
import * as localData from "@/src/localDataService";

// Status constants
const ACTIVE_STATUSES = ["pending", "confirmed", "accepted", "preparing"];
const READY_BACKEND_STATUSES = ["ready", "delivered"];
const READY_LOCAL_STATUS = "ready";
const PAID_STATUSES = ["paid"];
const ARCHIVED_STATUS = "archived";
const CANCELLED_STATUS = "cancelled";

export const useAdminOrders = (setOrders, setLocalOrders, setLoading, setFetching, fetchingRef) => {
  
  // Fetch orders from both backend and local storage
  const fetchAndFilterOrders = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    console.log("🔄 fetchAndFilterOrders called");
    
    try {
      setFetching(true);
      setLoading(true);
      
      // Fetch backend orders
      const backendOrders = await localData.getBackendOrders();
      console.log("🔄 Backend orders:", backendOrders.length);
      
      // Fetch local orders
      const localOrders = await localData.getLocalOrders();
      console.log("🔄 Local orders:", localOrders.length);
      
      // Check for target orders in local storage
      const targetOrder1 = localOrders.find(o => o._id === 'KOT-1769618963803-6QXT5KIX7');
      const targetOrder2 = localOrders.find(o => o._id === 'KOT-1769618963804-ABC123DEF');
      console.log("🎯 Target orders in fetchAndFilterOrders:", {
        'KOT-1769618963803-6QXT5KIX7': !!targetOrder1,
        'KOT-1769618963804-ABC123DEF': !!targetOrder2,
        details1: targetOrder1 ? { status: targetOrder1.status, kotCompleted: targetOrder1.kotCompleted } : null,
        details2: targetOrder2 ? { status: targetOrder2.status, kotCompleted: targetOrder2.kotCompleted } : null
      });
      
      // Count ready orders
      const readyOrders = localOrders.filter(o => o.status === 'ready' || o.kotCompleted === true);
      console.log("🎯 Ready orders in fetchAndFilterOrders:", readyOrders.length);
      console.log("🎯 Ready orders list:", readyOrders.map(o => ({ id: o._id, status: o.status, kotCompleted: o.kotCompleted })));
      
      setOrders(backendOrders);
      setLocalOrders(localOrders);
      
      console.log("✅ fetchAndFilterOrders completed successfully");
    } catch (error) {
      console.error("❌ fetchAndFilterOrders error:", error);
    } finally {
      setLoading(false);
      setFetching(false);
      fetchingRef.current = false;
    }
  }, [setOrders, setLocalOrders, setLoading, setFetching, fetchingRef]);

  // Filter orders based on tab
  const filteredOrders = useCallback((orders = [], localOrders = [], tab) => {
    let result = [];
    switch (tab) {
      case "Local":
        result = localOrders.filter((o) => o.status === "pending");
        break;
      case "Active":
        result = orders.filter((o) => {
          const isActiveStatus = ACTIVE_STATUSES.includes(o.status);
          const isNotLocal = o.source !== "local";
          const hasPhone = typeof o.customerNumber === "string" && o.customerNumber.trim() !== "";
          return isActiveStatus && isNotLocal && hasPhone;
        });
        break;
      case "Ready":
        const backendReady = orders.filter((o) => READY_BACKEND_STATUSES.includes(o.status));
        // Include ALL orders with kotCompleted: true in Ready tab, regardless of status
        const localReady = localOrders.filter((o) => {
          const isReadyStatus = o.status === READY_LOCAL_STATUS;
          const isKotCompleted = o.kotCompleted === true;
          const result = isReadyStatus || isKotCompleted;
          
          // Special tracking for our target order
          if (o._id === 'KOT-1769618963804-ABC123DEF') {
            console.log('🎯 TARGET ORDER FOUND IN FILTERING:', {
              orderId: o._id,
              status: o.status,
              kotCompleted: o.kotCompleted,
              isReadyStatus,
              isKotCompleted,
              willPassFilter: result,
              source: o.source
            });
          }
          
          if (isKotCompleted && o.status !== 'ready') {
            console.log(`🎯 KOT completed order ${o._id} with status '${o.status}' included in Ready tab`);
          }
          
          return result;
        });

        console.log("🔍 Ready tab filtering details:", {
          backendReadyCount: backendReady.length,
          localReadyCount: localReady.length,
          localReadyOrders: localReady.map(o => ({
            id: o._id,
            status: o.status,
            kotCompleted: o.kotCompleted,
            source: o.source,
            isKOT: o._id?.startsWith('KOT-'),
            hasItems: o.items?.length > 0
          }))
        });

        // Debug: Check each local order against Ready criteria
        localOrders.forEach(o => {
          const isReady = o.status === READY_LOCAL_STATUS || o.kotCompleted === true;
          console.log(`🔍 Order ${o._id} Ready check:`, {
            status: o.status,
            kotCompleted: o.kotCompleted,
            isReadyStatus: o.status === READY_LOCAL_STATUS,
            isKotCompleted: o.kotCompleted === true,
            passesFilter: isReady
          });
        });

        result = [
          ...backendReady,
          ...localReady,
        ];
        break;
      case "Paid":
        result = [
          ...orders.filter((o) => PAID_STATUSES.includes(o.status)),
          ...localOrders.filter((o) => PAID_STATUSES.includes(o.status)),
        ];
        break;
      case "Archived":
        result = [
          ...orders.filter((o) => o.status === ARCHIVED_STATUS),
          ...localOrders.filter((o) => o.status === ARCHIVED_STATUS),
        ];
        break;
      case "Cancelled":
        result = [
          ...orders.filter((o) => o.status === CANCELLED_STATUS),
          ...localOrders.filter((o) => o.status === CANCELLED_STATUS),
        ];
        break;
    }
    try {
      if (typeof window !== 'undefined') {
        window.__beyon_lastFiltered = { tab, count: (result || []).length };
      }
    } catch (e) {
      // ignore
    }
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, []);

  // Update backend order status
  const updateStatus = useCallback(async (id, status, showToast) => {
    if (typeof window === 'undefined') return;
    try {
      // Optimistically update the status in local state for immediate UI feedback
      setOrders(prev => prev.map(o => o._id === id ? { ...o, status } : o));
      const ts = (() => {
        const s = String(status).toLowerCase();
        if (s === "accepted") return { acceptedAt: new Date().toISOString() };
        if (s === "ready") return { readyAt: new Date().toISOString() };
        if (s === "paid") return { paidAt: new Date().toISOString() };
        if (s === "cancelled") return { cancelledAt: new Date().toISOString() };
        if (s === "archived") return { archivedAt: new Date().toISOString() };
        return {};
      })();
      await localData.updateBackendOrderStatus(id, status, ts);
      await fetchAndFilterOrders();
    } catch (e) {
      console.error(e);
      // On error, fetch to revert any optimistic changes
      await fetchAndFilterOrders();
      if (showToast) showToast(`Failed to update order: ${e.message}`);
    }
  }, [setOrders, fetchAndFilterOrders]);

  // Update local order status
  const updateLocalStatus = useCallback(async (id, status, localOrders, setLocalOrders, showToast) => {
    if (typeof window === 'undefined') return;
    const orderExists = localOrders.find((o) => o._id === id);
    if (!orderExists) {
      if (showToast) showToast("Order not found. Refresh and try again.");
      return;
    }

    const timestampField = (() => {
      const s = String(status).toLowerCase();
      if (s === "accepted") return { acceptedAt: new Date().toISOString() };
      if (s === "ready") return { readyAt: new Date().toISOString() };
      if (s === "paid") return { paidAt: new Date().toISOString() };
      if (s === "cancelled") return { cancelledAt: new Date().toISOString() };
      if (s === "archived") return { archivedAt: new Date().toISOString() };
      return {};
    })();

    // Optimistically update the status in local state for immediate UI feedback
    setLocalOrders((prev) =>
      prev.map((o) => (o._id === id ? { ...o, status, ...timestampField } : o))
    );

    try {
      await localData.updateLocalOrderStatus(id, status, timestampField);
      await fetchAndFilterOrders();
    } catch (e) {
      console.error(e);
      // On error, fetch to revert any optimistic changes
      await fetchAndFilterOrders();
      if (showToast) showToast(`Failed to update local order: ${e.message}`);
    }
  }, [fetchAndFilterOrders]);



  // Debounced fetch on tab change
  const setupDebouncedFetch = useCallback((tab, setLazyLoad, fetchAndFilterOrders) => {
    if (tab === "Products") return;
    setLazyLoad(true);
    const timer = setTimeout(() => {
      setLazyLoad(false);
      fetchAndFilterOrders();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return {
    fetchAndFilterOrders,
    filteredOrders,
    updateStatus,
    updateLocalStatus,
    setupAutoRefresh,
    setupDebouncedFetch,
    // Constants
    ACTIVE_STATUSES,
    READY_BACKEND_STATUSES,
    READY_LOCAL_STATUS,
    PAID_STATUSES,
    ARCHIVED_STATUS,
    CANCELLED_STATUS,
  };
};
