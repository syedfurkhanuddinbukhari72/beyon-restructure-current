"use client";

import React, { useCallback, useTransition, useEffect } from "react";
import { useRouter } from "next/router";
import * as localData from "@/src/localDataService";
import localOrdersData from "../data/local-orders-updated.json";

import ConfirmModal from "../components/ConfirmModal";
import AdminLayout from "../components/admin/layout/AdminLayout";
import ProductsTab from "../components/admin/tabs/ProductsTab";
import OrdersTab from "../components/admin/tabs/OrdersTab";
import OffersPanel from "../components/admin/OffersPanel";
import KOTTab from "../components/admin/tabs/KOTTab";

import { useAdminState } from "../hooks/admin/useAdminState";
import { useUnifiedOrderData } from "../hooks/useUnifiedOrderData";
import { useFilteredOrders } from "../hooks/useFilteredOrders";
import { useAdminProducts } from "../hooks/admin/useAdminProducts";
import { useAdminOffers } from "@/src/hooks/admin/useAdminOffers";
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
    individualOverrides,
    setIndividualOverrides,
    chLastClickRef,
    messageListenerRef,
    TABS,
    createEmptyProductEditState,
    productMenuKey,
    setProductMenuKey,
    productEditState,
    setProductEditState,
    offerOpen,
    setOfferOpen,
    showAddRemoveMenu,
    setShowAddRemoveMenu,
    showAddItem,
    setShowAddItem,
    bulkBusy,
    setBulkBusy,
    // Product state
    productSearch,
    setProductSearch,
    showSearchBar,
    setShowSearchBar,
    showUnavailableOnly,
    setShowUnavailableOnly,
    // Product handlers
    handleProductMenuToggle,
    handleToggleOfferView,
  } = useAdminState();

  // Import test data on app initialization
  useEffect(() => {
    const importTestData = async () => {
      try {
        console.log("🔄 Importing test data from local-orders-updated.json...");
        console.log("📊 Test data to import:", localOrdersData.length, "orders");
        console.log("📋 Sample test data:", localOrdersData.slice(0, 2).map(o => ({ id: o._id, status: o.status, kotCompleted: o.kotCompleted })));

        // Check current local orders before import
        const existingOrders = await localData.getLocalOrders();
        console.log("📊 Existing local orders before import:", existingOrders.length);

        // Check if our target orders already exist
        const targetOrder1 = existingOrders.find(o => o._id === 'KOT-1769618963803-6QXT5KIX7');
        const targetOrder2 = existingOrders.find(o => o._id === 'KOT-1769618963804-ABC123DEF');
        console.log("🎯 Target orders before import:", {
          'KOT-1769618963803-6QXT5KIX7': !!targetOrder1,
          'KOT-1769618963804-ABC123DEF': !!targetOrder2
        });

        // Only import if target orders don't exist to avoid duplicates
        if (!targetOrder1 || !targetOrder2) {
          console.log("📥 Target orders not found, proceeding with import...");
          await localData.importOrdersFromJSON(localOrdersData);
          console.log("✅ Test data imported successfully");
        } else {
          console.log("📋 Target orders already exist, skipping import");
        }

        // Check orders after import
        const afterImport = await localData.getLocalOrders();
        console.log("📊 Local orders after import:", afterImport.length);
        console.log("📋 Sample imported orders:", afterImport.slice(0, 3).map(o => ({ id: o._id, status: o.status, kotCompleted: o.kotCompleted })));

        // Check if our target orders exist after import
        const targetOrder1After = afterImport.find(o => o._id === 'KOT-1769618963803-6QXT5KIX7');
        const targetOrder2After = afterImport.find(o => o._id === 'KOT-1769618963804-ABC123DEF');
        console.log("🎯 Target orders after import:", {
          'KOT-1769618963803-6QXT5KIX7': !!targetOrder1After,
          'KOT-1769618963804-ABC123DEF': !!targetOrder2After,
          details1: targetOrder1After ? { status: targetOrder1After.status, kotCompleted: targetOrder1After.kotCompleted } : null,
          details2: targetOrder2After ? { status: targetOrder2After.status, kotCompleted: targetOrder2After.kotCompleted } : null
        });

        // Count ready orders
        const readyOrders = afterImport.filter(o => o.status === 'ready' || o.kotCompleted === true);
        console.log("🎯 Ready orders count after import:", readyOrders.length);
        console.log("🎯 Ready orders:", readyOrders.map(o => ({ id: o._id, status: o.status, kotCompleted: o.kotCompleted })));

        // Update state immediately - using new unified system
        console.log("📊 Import completed - unified system will handle state updates");

        // Force refresh orders after import (with longer delay to ensure import completes)
        setTimeout(async () => {
          console.log("🔄 Force refreshing orders after import...");
          await fetchOrders(); // Use new fetchOrders instead of fetchAndFilterOrders
        }, 500); // Increased delay from 100ms to 500ms
      } catch (error) {
        console.error("❌ Failed to import test data:", error);
        // Still try to fetch orders even if import fails
        try {
          await fetchOrders();
        } catch (fetchError) {
          console.error("❌ Failed to fetch orders after import error:", fetchError);
        }
      }
    };

    // Always try to import on mount if we have test data
    if (localOrdersData && localOrdersData.length > 0) {
      console.log("🔄 Starting import process - using unified system");
      importTestData();
    } else {
      // If no test data, still fetch existing orders
      console.log("📋 No test data found, fetching existing orders...");
      fetchOrders();
    }
  }, []); // Run once on mount

  // Products management
  const {
    menu,
    productBusy,
    setProductBusy,
    fetchMenu: hookFetchMenu,
    saveProductStock,
    submitProductEdit: hookSubmitProductEdit,
  } = useAdminProducts();

  // Orders management - NEW UNIFIED SYSTEM
  const {
    orders,
    loading,
    error,
    fetchOrders,
    updateOrder,
    addOrder
  } = useUnifiedOrderData();

  // Filter orders based on current tab
  const filteredOrders = useFilteredOrders(orders, tab);

  // Create wrapper functions for compatibility
  const updateStatus = async (orderId, status) => {
    return updateOrder(orderId, { status, updatedAt: new Date().toISOString() });
  };

  // KOT Update Event Listener - Bridge between localStorage and localforage
  useEffect(() => {
    const handleKOTUpdate = async (event) => {
      console.log('🔄 KOT update event received:', event.detail);
      // Trigger order refresh to sync data
      try {
        await fetchOrders();
      } catch (error) {
        console.error('❌ Failed to refresh orders after KOT update:', error);
      }
    };

    window.addEventListener('kot:updated', handleKOTUpdate);
    return () => window.removeEventListener('kot:updated', handleKOTUpdate);
  }, [fetchOrders]);

  const updateLocalStatus = async (orderId, status, localOrders, setLocalOrders, showToast) => {
    try {
      const timestampField = (() => {
        if (status === 'ready') return { readyAt: new Date().toISOString() };
        if (status === 'paid') return { paidAt: new Date().toISOString() };
        if (status === 'cancelled') return { cancelledAt: new Date().toISOString() };
        if (status === 'archived') return { archivedAt: new Date().toISOString() };
        return {};
      })();
      
      // Use the new unified system
      return updateOrder(orderId, { status, ...timestampField });
    } catch (e) {
      console.error(e);
      // showToast is optional, so check if it exists before calling
      if (showToast && typeof showToast === 'function') {
        showToast(`Failed to update local order: ${e.message}`);
      }
    }
  };

  // Create a wrapper function for updateLocalStatus that works with new system
  const handleUpdateLocalStatus = async (id, status) => {
    try {
      const timestampField = (() => {
        if (status === 'ready') return { readyAt: new Date().toISOString() };
        if (status === 'paid') return { paidAt: new Date().toISOString() };
        if (status === 'cancelled') return { cancelledAt: new Date().toISOString() };
        if (status === 'archived') return { archivedAt: new Date().toISOString() };
        return {};
      })();
      
      await updateOrder(id, { status, ...timestampField });
      showToast(`Order ${id} status updated to ${status}`);
    } catch (error) {
      console.error('Failed to update order:', error);
      showToast(`Failed to update order: ${error.message}`);
    }
  };

  // Create a delete function for local orders
  const handleDeleteLocalOrder = async (orderId) => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      // Remove from local storage
      await localData.deleteLocalOrder(orderId);
      
      // Refresh orders using new system
      await fetchOrders();
      
      showToast('Order deleted successfully');
    } catch (error) {
      console.error('Error deleting order:', error);
      showToast('Failed to delete order');
      // Refresh to restore correct state
      await fetchOrders();
    }
  };

  // Offers management
  const {
    bundleRules: hookBundleRules,
    offerForm: hookOfferForm,
    offerType: hookOfferType,
    offersBusy: hookOffersBusy,
    fetchOffers,
    saveOffer,
    deleteOffer,
    editOffer,
  } = useAdminOffers();

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
      await fetchOrders(); // Use new fetchOrders instead of fetchAndFilterOrders
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
    hookFetchMenu,
    fetchOffers,
    fetchShopStatus,
    hookFetchMenu,
    messageListenerRef,
    () => {} // handleMessage will be handled by the keyboard shortcuts hook
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

  // Product management handlers
  const updateProductStock = useCallback(async (category, productName, inStock, manualOverride) => {
    try {
      const payload = { name: productName, inStock };
      if (typeof manualOverride === 'boolean') {
        payload.manualOverride = manualOverride;
      }
      await localData.upsertProduct(category, payload);
      await hookFetchMenu();
    } catch (error) {
      console.error(error);
      showToast(`Failed to update product stock: ${error.message}`);
    }
  }, [hookFetchMenu, showToast]);

  const toggleProductStock = useCallback(async (category, product) => {
    const key = JSON.stringify({ c: category, n: product.name });
    if (productBusy[key]) return;
    setProductBusy((prev) => ({ ...prev, [key]: true }));
    try {
      const next = !(product.inStock !== false);
      const isChicken = product.isChicken === true || /chicken/i.test(product.name);
      let manualOverride = true;
      if (isChicken && ((next && product.inStock === true) || (!next && product.inStock === false))) {
        manualOverride = false;
      }
      await updateProductStock(category, product.name, next, manualOverride);
    } finally {
      setProductBusy((prev) => ({ ...prev, [key]: false }));
    }
  }, [productBusy, updateProductStock]);

  // Chicken statistics
  const chickenStats = React.useMemo(() => {
    let total = 0, inStockCount = 0, unavailableCount = 0;
    for (const category of Object.keys(menu || {})) {
      for (const p of menu[category] || []) {
        const isChicken = p?.isChicken === true || /chicken/i.test(p?.name || "");
        if (isChicken) {
          total += 1;
          const isOn = p?.inStock === true;
          if (isOn) inStockCount += 1; else unavailableCount += 1;
        }
      }
    }
    return { total, inStockCount, unavailableCount };
  }, [menu]);

  // Product edit handlers
  const handleEditPrice = useCallback((category, product) => {
    setProductMenuKey(null);
    setProductEditState({
      open: true,
      mode: 'price',
      category,
      product,
      value: typeof product.price === 'number' ? String(product.price) : '',
      busy: false,
      error: ''
    });
  }, [setProductMenuKey, setProductEditState]);

  const handleEditName = useCallback((category, product) => {
    setProductMenuKey(null);
    setProductEditState({
      open: true,
      mode: 'name',
      category,
      product,
      value: product?.name ?? '',
      busy: false,
      error: ''
    });
  }, [setProductMenuKey, setProductEditState]);

  const handleProductEditChange = useCallback((value) => {
    setProductEditState((prev) => ({ ...prev, value, error: '' }));
  }, [setProductEditState]);

  const submitProductEdit = useCallback(async () => {
    if (!productEditState.open || productEditState.busy) return;

    const { mode, category, product, value } = productEditState;
    if (!mode || !category || !product) {
      setProductEditState(createEmptyProductEditState());
      return;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      setProductEditState((prev) => ({
        ...prev,
        error: mode === 'price' ? 'Price cannot be empty.' : 'Name cannot be empty.'
      }));
      return;
    }

    if (mode === 'name' && trimmed === product.name) {
      setProductEditState(createEmptyProductEditState());
      return;
    }

    if (mode === 'price') {
      const priceValue = Number(trimmed);
      if (Number.isNaN(priceValue) || priceValue < 0) {
        setProductEditState((prev) => ({ ...prev, error: 'Enter a valid price.' }));
        return;
      }
    }

    const busyKey = JSON.stringify({ c: category, n: product.name });
    if (productBusy[busyKey]) return;

    setProductEditState((prev) => ({ ...prev, busy: true, error: '' }));

    try {
      await hookSubmitProductEdit(mode, category, product, trimmed);
      showToast(mode === 'price' ? 'Price updated.' : 'Name updated.');
      setProductEditState(createEmptyProductEditState());
    } catch (error) {
      console.error(mode === 'price' ? 'Edit price error' : 'Edit name error', error);
      const failureMessage = error?.message
        ? `Failed to update ${mode === 'price' ? 'price' : 'name'}: ${error.message}`
        : `Failed to update ${mode === 'price' ? 'price' : 'name'}.`;
      showToast(failureMessage);
      setProductEditState((prev) => ({ ...prev, busy: false, error: failureMessage }));
    }
  }, [productEditState, productBusy, hookSubmitProductEdit, showToast]);

  const closeProductEditModal = useCallback(() => {
    setProductEditState(createEmptyProductEditState());
  }, [setProductEditState]);

  // Offer handlers
  const handleEditOffer = useCallback((category, product) => {
    setProductMenuKey(null);
    const { ok, prefill } = editOffer(category, product);
    if (!ok) {
      showToast('Could not edit offer: Invalid product selection');
      return;
    }
    router.push('/admin-offers');
  }, [setProductMenuKey, editOffer, showToast, router]);

  const handleRemoveOffer = useCallback(async (category, product) => {
    setProductMenuKey(null);
    try {
      await deleteOffer({ category, product });
      showToast('Offer removed successfully');
      await fetchOffers();
    } catch (error) {
      console.error('Failed to remove offer:', error);
      showToast('Failed to remove offer. Please try again.');
    }
  }, [setProductMenuKey, deleteOffer, fetchOffers, showToast]);

  const handleDeleteProduct = useCallback((category, product) => {
    setProductMenuKey(null);
    setConfirmState({
      open: true,
      title: 'Delete item',
      message: `Delete '${product.name}' from '${category}'? This WILL remove the item permanently.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      busy: false,
      onConfirm: async () => {
        // Implementation would go here
        setConfirmState({ open: false });
      },
    });
  }, [setProductMenuKey, setConfirmState]);

  // Bulk chicken operations
  const bulkSetChicken = useCallback(async (inStockTarget) => {
    if (bulkBusy) return;
    if (chickenStats.total === 0) {
      showChToast("No Chicken products found.");
      return;
    }
    const verb = inStockTarget ? 'ON' : 'OFF';
    const proceed = typeof window !== 'undefined' ? window.confirm(`Turn all 'Chicken' items ${verb}?`) : true;
    if (!proceed) return;

    setBulkBusy(true);
    try {
      const result = await localData.bulkToggleChickenItems(inStockTarget);
      showChToast(`${result.changed} chicken items turned ${verb}.`);
      await hookFetchMenu();
    } catch (e) {
      console.error(e);
      showChToast("Failed to bulk update chicken items.", 'error');
    } finally {
      setBulkBusy(false);
    }
  }, [bulkBusy, chickenStats.total, showChToast, hookFetchMenu]);

  const bulkOffChickenWithOverrides = useCallback(async ({ noConfirm = false, silent = false } = {}) => {
    const ok = noConfirm || (typeof window !== 'undefined' ? window.confirm("Turn OFF all chicken items except manually overridden ones?") : true);
    if (!ok) return;
    try {
      setBulkBusy(true);
      const excludeItems = Object.keys(individualOverrides).filter(
        (itemName) => individualOverrides[itemName]?.inStock === true
      );
      const info = await localData.bulkToggleChickenItems(false, excludeItems);
      if (!silent) {
        showChToast(`Turned OFF ${info.changed || '-'} chicken items (manual overrides preserved).`);
      }
      await hookFetchMenu();
    } catch (error) {
      console.error('bulkOffChickenWithOverrides', error);
      if (!silent) showChToast('Failed to turn OFF chicken items.', 'error');
    } finally {
      setBulkBusy(false);
    }
  }, [individualOverrides, showChToast, hookFetchMenu]);

  // Other handlers
  const handleCreateOffer = useCallback(() => {
    router.push("/admin-offers");
  }, [router]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("adminAuthenticated");
    router.push("/admin-login");
  }, [router]);

  const handleShowAddRemoveMenu = useCallback(() => {
    setShowAddRemoveMenu(true);
  }, [setShowAddRemoveMenu]);

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

  // Close product menu on outside click
  React.useEffect(() => {
    if (!productMenuKey) return;
    const clickHandler = (event) => {
      const menuEl = document.querySelector(`[data-product-menu="${productMenuKey}"]`);
      const buttonEl = document.querySelector(`[data-product-button="${productMenuKey}"]`);
      if (!menuEl && !buttonEl) {
        setProductMenuKey(null);
        return;
      }
      if (menuEl?.contains(event.target) || buttonEl?.contains(event.target)) {
        return;
      }
      setProductMenuKey(null);
    };
    const keyHandler = (event) => {
      if (event.key === "Escape") {
        setProductMenuKey(null);
      }
    };
    document.addEventListener("mousedown", clickHandler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", clickHandler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [productMenuKey]);

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
      {tab === "Products" ? (
        <ProductsTab
          menu={menu}
          productBusy={productBusy}
          productSearch={productSearch}
          showSearchBar={showSearchBar}
          showUnavailableOnly={showUnavailableOnly}
          bulkBusy={bulkBusy}
          chickenStats={chickenStats}
          productMenuKey={productMenuKey}
          offerOpen={offerOpen}
          onProductSearchChange={setProductSearch}
          onToggleSearchBar={() => setShowSearchBar(!showSearchBar)}
          onToggleUnavailableOnly={() => setShowUnavailableOnly(!showUnavailableOnly)}
          onShowAddRemoveMenu={handleShowAddRemoveMenu}
          onCreateOffer={handleCreateOffer}
          onBulkChickenToggle={bulkSetChicken}
          onProductMenuToggle={handleProductMenuToggle}
          onEditPrice={handleEditPrice}
          onEditName={handleEditName}
          onEditOffer={handleEditOffer}
          onRemoveOffer={handleRemoveOffer}
          onDeleteProduct={handleDeleteProduct}
          onToggleProductStock={toggleProductStock}
          onToggleOfferView={handleToggleOfferView}
          productEditState={productEditState}
          onProductEditChange={handleProductEditChange}
          onSubmitProductEdit={submitProductEdit}
          onCloseProductEditModal={closeProductEditModal}
          hookBundleRules={hookBundleRules}
        />
      ) : tab === "Offers" ? (
        <OffersPanel
          bundleRules={hookBundleRules}
          offersBusy={hookOffersBusy}
          onCreateOffer={handleCreateOffer}
        />
      ) : tab === "KOT" ? (
        <KOTTab
          localOrders={orders}
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
          onUpdateStatus={updateStatus}
          onUpdateLocalStatus={handleUpdateLocalStatus}
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
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white font-medium z-50 ${
          chToast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {chToast.message}
        </div>
      )}
    </AdminLayout>
  );
}
