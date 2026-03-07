"use client";

import React, { useCallback, useTransition, useEffect } from "react";
import { useRouter } from "next/router";
import * as localData from "@/src/localDataService";
import localOrdersData from "../data/local-orders-updated.json";

import ConfirmModal from "../components/ConfirmModal";
import AdminLayout from "../components/admin/layout/AdminLayout";
import OrdersTab from "../components/admin/tabs/OrdersTab";
import KOTTab from "../components/admin/tabs/KOTTab";

import { useAdminState } from "../hooks/admin/useAdminState";
import { useUnifiedOrderData } from "../hooks/useUnifiedOrderData";
import { useFilteredOrders } from "../hooks/useFilteredOrders";
import { useAdminKeyboardShortcuts } from "../hooks/admin/useAdminKeyboardShortcuts";
import { OrderDataProvider } from "../contexts/OrderDataContext";
import { useAdminEffects } from "../hooks/admin/useAdminEffects";

import { formatItems, getTotal, formatDate, formatDuration, getCustomerName } from "../helpers/adminFormatters";

export default function AdminUnifiedPage() {
  return (
    <OrderDataProvider>
      <AdminUnifiedPageContent />
    </OrderDataProvider>
  );
}

function AdminUnifiedPageContent() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State management
  const {
    tab,
    lazyLoad,
    setLazyLoad,
    handleTabChange,
    menuOpen,
    setMenuOpen,
    menuButtonRef,
    menuDropdownRef,
    handleMenuToggle,
    toast,
    toastType,
    showToast,
    hideToast,
    chToast,
    chShowToast,
    showChToast,
    // Remove conflicting order variables - using new unified system
    now,
    expandedOrderId,
    toggleExpand,
    fetchingRef,
    addForm,
    setAddForm,
    removeForm,
    setRemoveForm,
    addBusy,
    setAddBusy,
    removeBusy,
    setRemoveBusy,
    resetAddForm,
    confirmState,
    setConfirmState,
    shopStatus,
    setShopStatus,
    messageListenerRef,
    TABS,
  } = useAdminState();

  // Smart fetch function - uses optimized fetch for KOT tab
  const smartFetchOrders = useCallback(async () => {
    console.log(`🔍 smartFetchOrders called with tab: "${tab}"`);
    if (tab === 'KOT') {
      console.log('🚫 KOT tab detected - DO NOT call fetchOrders');
      return; // 🚫 DO NOT call fetchOrders for KOT tab
    } else {
      console.log('🔄 Using fetchOrders for general tab');
      return await fetchOrders();
    }
  }, [tab]); // Remove function dependencies to prevent infinite loop

  // Import test data on app initialization - DISABLED to prevent order flood
  useEffect(() => {
    // DISABLED: Test data import causing 278 orders to flood the system
    console.log("⏸️ Test data import disabled to prevent order flood");

    // Only fetch if not on KOT tab (KOT tab has its own optimized fetch)
    if (tab !== 'KOT') {
      try {
        setTimeout(async () => {
          await smartFetchOrders();
        }, 500);
      } catch (error) {
        console.error("❌ Failed to fetch orders:", error);
      }
    } else {
      console.log("⏸️ Skipping initial fetch - KOT tab will use optimized fetch");
    }

  }, [tab]); // Add tab dependency to re-evaluate when tab changes

  // ✅ FIXED: KOT must use the SAME orders list as Local
  // ❌ REMOVED: KOT-specific fetching that created separate dataset
  // Rule: KOT does NOT fetch, KOT does NOT optimize fetch, KOT ONLY filters

  // Orders management - NEW UNIFIED SYSTEM
  const {
    orders,
    loading,
    error,
    fetchOrders,
    fetchKOTOrders, // NEW: KOT-optimized fetch function
    updateOrder,
    addOrder
  } = useUnifiedOrderData();

  // Filter orders based on current tab
  const filteredOrders = useFilteredOrders(orders, tab);

  // Create wrapper functions for compatibility
  // ✅ UNIFIED STATUS UPDATE HANDLER (Fixes Bug #1)
  const handleUnifiedStatusUpdate = useCallback(async (orderId, status) => {
    try {
      console.log(`🔄 Unified Update: Order ${orderId} -> ${status}`);

      const timestampField = (() => {
        const now = new Date().toISOString();
        if (status === 'ready') return { readyAt: now };
        if (status === 'paid') return { paidAt: now };
        if (status === 'cancelled') return { cancelledAt: now };
        if (status === 'archived') return { archivedAt: now };
        return {};
      })();

      // Update the order in the unified hook
      await updateOrder(orderId, { status, ...timestampField });

      showToast(`Order updated to ${status}`);
    } catch (error) {
      console.error('Failed to update order:', error);
      showToast(`Failed to update order: ${error.message}`);
    }
  }, [updateOrder, showToast]);

  // Create a delete function for local orders
  const handleDeleteLocalOrder = useCallback(async (orderId) => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      // Remove from local storage
      await localData.deleteLocalOrder(orderId);

      // Refresh orders using smart fetch
      await smartFetchOrders();

      showToast('Order deleted successfully');
    } catch (error) {
      console.error('Error deleting order:', error);
      showToast('Failed to delete order');
      // Refresh to restore correct state
      await smartFetchOrders();
    }
  }, [smartFetchOrders, showToast]);

  // Keyboard shortcuts
  useAdminKeyboardShortcuts(handleTabChange, showToast, expandedOrderId, filteredOrders, messageListenerRef);

  // Shop status management
  const fetchShopStatus = useCallback(async () => {
    try {
      const data = await localData.getShopStatus();
      setShopStatus(data);
    } catch (err) {
      console.error("Error fetching shop status:", err);
    }
  }, [setShopStatus]);

  // Force refresh function for debugging
  const forceRefreshOrders = async () => {
    console.log("🔄 Force refreshing orders...");
    try {
      await smartFetchOrders(); // Use smart fetch for tab-optimized refresh
      console.log("✅ Orders refreshed successfully");
    } catch (error) {
      console.error("❌ Failed to refresh orders:", error);
    }
  };

  // Effects and side effects
  useAdminEffects(
    tab,
    lazyLoad,
    setLazyLoad,
    fetchOrders, // Use new fetchOrders
    () => { }, // previously hookFetchMenu
    () => { }, // previously fetchOffers
    fetchShopStatus,
    () => { }, // previously hookFetchMenu
    messageListenerRef,
    () => { } // handleMessage will be handled by the keyboard shortcuts hook
  );

  // Debug filtered orders
  if (tab === 'Ready') {
    console.log('🔍 admin-unified.js - Ready tab filtered orders:', {
      ordersCount: orders.length,
      filteredOrdersCount: filteredOrders.length,
      filteredOrders: filteredOrders.map(o => ({ id: o._id, status: o.status, kotCompleted: o.kotCompleted }))
    });
  }

  const updateShopStatus = useCallback(async (isOpen) => {
    try {
      setShopStatus({ isOpen });
      await localData.setShopStatus(isOpen);
      await fetchShopStatus();
    } catch {
      showToast("Failed to update shop status");
      setShopStatus((prev) => ({ isOpen: !isOpen }));
    }
  }, [setShopStatus, fetchShopStatus, showToast]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("adminAuthenticated");
    router.push("/admin-login");
  }, [router]);

  // Close dropdowns on outside click
  React.useEffect(() => {
    const clickHandler = (e) => {
      if (menuOpen && !menuDropdownRef.current?.contains(e.target) && !menuButtonRef.current?.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const keyHandler = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", clickHandler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", clickHandler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [menuOpen, menuDropdownRef, menuButtonRef]);



  return (
    <AdminLayout
      tabs={TABS}
      activeTab={tab}
      onTabChange={handleTabChange}
      toast={toast}
      toastType={toastType}
      onToastClose={hideToast}
      menuOpen={menuOpen}
      onMenuToggle={handleMenuToggle}
      menuButtonRef={menuButtonRef}
      menuDropdownRef={menuDropdownRef}
      shopStatus={shopStatus}
      onShopStatusToggle={() => updateShopStatus(!shopStatus.isOpen)}
      onLogout={handleLogout}
      router={router}
    >
      {tab === "KOT" ? (
        <KOTTab
          kotOrders={filteredOrders}
          onLocalOrderUpdate={async (updatedOrder) => {
            console.log('🔄 KOTTab onLocalOrderUpdate called:', {
              orderId: updatedOrder._id,
              status: updatedOrder.status,
              kotCompleted: updatedOrder.kotCompleted
            });

            try {
              // Check if this is an existing order or a new one
              const existingOrder = orders.find(order => order._id === updatedOrder._id);

              if (existingOrder) {
                // Update existing order
                console.log('📝 Updating existing order:', updatedOrder._id);
                await updateOrder(updatedOrder._id, updatedOrder);
                console.log('✅ Existing order updated successfully');
              } else {
                // Add new order (for KOT completions that create new local orders)
                console.log('➕ Adding new order:', updatedOrder._id);
                await addOrder(updatedOrder);
                console.log('✅ New order added successfully');
              }
            } catch (error) {
              console.error('❌ Failed to update/add order:', error);
            }
          }}
          showToast={showToast}
        />
      ) : (
        <OrdersTab
          filteredOrders={filteredOrders}
          loading={loading}
          lazyLoad={lazyLoad}
          expandedOrderId={expandedOrderId}
          tab={tab}
          onToggleExpand={toggleExpand}
          onUpdateStatus={handleUnifiedStatusUpdate}
          onUpdateLocalStatus={handleUnifiedStatusUpdate} // Unified handler for both
          onDeleteLocalOrder={handleDeleteLocalOrder}
          now={now}
        />
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        busy={confirmState.busy}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState({ open: false })}
      />

      {chShowToast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white font-medium z-50 ${chToast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`}>
          {chToast.message}
        </div>
      )}
    </AdminLayout>
  );
}
