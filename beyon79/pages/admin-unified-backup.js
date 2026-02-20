"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback, useTransition } from "react";
import ConfirmModal from "../components/ConfirmModal";
import { useRouter } from "next/router";
import * as localData from "@/src/localDataService";
import menuDataJSON from "../data/menuData.json";
import localOrdersJSON from "../data/local-orders.json";
import { formatItems, getTotal, formatDate, formatDuration, getCustomerName } from "../helpers/adminFormatters";

import Toast from "../components/admin/Toast";
import OrderRow from "../components/admin/OrderRow";
import ProductEditModal from "../components/admin/ProductEditModal";
import OffersPanel from "../components/admin/OffersPanel";

import { useAdminProducts } from "../hooks/admin/useAdminProducts";

import { useAdminOffers } from "@/src/hooks/admin/useAdminOffers";

// ======================================================================
// IMPORTS & CONSTANTS
// ======================================================================

// ======================================================================
// UI COMPONENTS (RENDER ONLY — NO BUSINESS LOGIC)
// ======================================================================



// ✅ Tabs and status constants
const TABS = [
  "Active",
  "Ready",
  "Paid",
  "Archived",
  "Cancelled",
  "Local",
  "Products",
  "Offers",
];

const createEmptyProductEditState = () => ({
  open: false,
  mode: null,
  category: "",
  product: null,
  value: "",
  busy: false,
  error: ""
});



// ✅ Status constants
const ACTIVE_STATUSES = ["pending", "confirmed", "accepted", "preparing"];
const READY_BACKEND_STATUSES = ["ready", "delivered"];
const READY_LOCAL_STATUS = "ready";
const PAID_STATUSES = ["paid"];
const ARCHIVED_STATUS = "archived";
const CANCELLED_STATUS = "cancelled";


// ======================================================================
// UI COMPONENTS (RENDER ONLY — NO BUSINESS LOGIC)
// ======================================================================

// ======================================================================
// PAGE-LEVEL ORCHESTRATION (AdminPage)
// ======================================================================
// [PAGE ORCHESTRATION]
export default function AdminPage() {
const {
  menu,
  productBusy,
  fetchMenu: hookFetchMenu,
  saveProductStock,
  submitProductEdit: hookSubmitProductEdit,
} = useAdminProducts();

// Offer state delegated to useAdminOffers (Phase 4.1)

  const [shopStatus, setShopStatus] = useState({ isOpen: false, message: '' });

  // Hook aliased to avoid naming conflicts
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

  // ⚠️ DO NOT EXTRACT — BUSINESS CRITICAL
  // Reason: Core order management logic with complex state dependencies
  // Track manual overrides for chicken items (by name, can be extended to category+name if needed)
  const [individualOverrides, setIndividualOverrides] = useState({}); // { [itemName]: { inStock: true/false } }

  // CH toggle UX states (scoped to Products)
  const [chToast, setChToast] = useState({ message: "", type: "success" }); // type: 'success' | 'error'
  const [chShowToast, setChShowToast] = useState(false);
  const [isPending, startTransition] = useTransition();
  const chLastClickRef = useRef(0);

  // Only one definition of showChToast, placed before any useCallback/useEffect that uses it
  const showChToast = useCallback((message, type = 'success') => {
    setChToast({ message, type });
    setChShowToast(true);
    // auto-hide after 3s
    setTimeout(() => setChShowToast(false), 3000);
  }, []);

  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [localOrders, setLocalOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    busy: false,
    onConfirm: null,
  });
  // Stable ref used to register/unregister the window message listener
  const messageListenerRef = useRef(null);
  // Ref to track whether an orders fetch is currently in-flight
  const fetchingRef = useRef(false);
  // Initialize to a stable default to avoid SSR/client hydration mismatch.
  // Read persisted tab from localStorage only after mount.
  const [tab, setTab] = useState("Active");

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('admin:lastTab');
      if (stored && TABS.includes(stored)) setTab(stored);
    } catch (e) {
      console.warn('AdminPage: could not read admin:lastTab', e);
    }
  }, []);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const menuDropdownRef = useRef(null);
  const [lazyLoad, setLazyLoad] = useState(false);
  const [showAddRemoveMenu, setShowAddRemoveMenu] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [toast, setToast] = useState("");
  // Products tab UI state
  const [productSearch, setProductSearch] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showUnavailableOnly, setShowUnavailableOnly] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [productMenuKey, setProductMenuKey] = useState(null);
  const [productEditState, setProductEditState] = useState(() => createEmptyProductEditState());
  const productMenuRefs = useRef({});
  const productMenuButtonRefs = useRef({});
  const [addForm, setAddForm] = useState({
    category: "",
    isNewCategory: false,
    newCategory: "",
    name: "",
    price: "",
    inStock: true,
    isChicken: false,
  });
  
  const [removeForm, setRemoveForm] = useState({ category: '', productName: '' });
  const [addBusy, setAddBusy] = useState(false);
  const categoryList = useMemo(() => {
    try {
      return Object.keys(menu || {}).sort((a, b) => a.localeCompare(b));
    } catch {
      return [];
    }
  }, [menu]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('admin:lastTab', tab);
      } catch (e) {
        console.warn('AdminPage: could not persist admin:lastTab', e);
      }
    }
  }, [tab]);

  

  const handleMessage = useCallback((e) => {
    try {
      const d = e.data;
      if (!d || d.type !== 'beyon:app-shortcut') return;
      const payload = d.payload || {};
      console.log('[admin-unified] handleMessage received payload', payload);
      const action = payload.action;
      if (!action) return;
      switch (action) {
        case 'switch_to_active_tab':
          console.log('[admin-unified] switching to Active');
          handleTabChange('Active');
          setToast('Switched to Active tab');
          break;
        case 'switch_to_ready_tab':
          console.log('[admin-unified] switching to Ready');
          handleTabChange('Ready');
          setToast('Switched to Ready tab');
          break;
        case 'switch_to_paid_tab':
          console.log('[admin-unified] switching to Paid');
          handleTabChange('Paid');
          setToast('Switched to Paid tab');
          break;
        case 'switch_to_archive_tab':
          console.log('[admin-unified] switching to Archived');
          handleTabChange('Archived');
          setToast('Switched to Archived tab');
          break;
        case 'local_mode':
          console.log('[admin-unified] switching to Local');
          handleTabChange('Local');
          setToast('Switched to Local tab');
          break;
        case 'open_manual_orders':
          console.log('[admin-unified] opening manual orders');
          try {
            let navigated = false;
            router.push('/manual-orders').then((res) => {
              navigated = true;
              console.log('[admin-unified] router.push /manual-orders resolved', res, window.location.href);
            }).catch((err) => console.warn('[admin-unified] router.push /manual-orders failed', err));
            // fallback: if router.push hasn't resolved in 200ms, force navigation
            setTimeout(() => {
              if (!navigated) {
                console.warn('[admin-unified] router.push /manual-orders did not resolve quickly — falling back to location.href');
                try { window.location.href = '/manual-orders'; } catch (e) { console.warn('fallback location.href failed', e); }
              }
            }, 200);
          } catch (err) { console.warn('[admin-unified] router.push threw', err); }
          setToast('Opened Manual Orders');
          break;
        case 'open_manual_order_complete':
          console.log('[admin-unified] opening manual order complete');
          try {
            let navigated = false;
            router.push('/manual-order-complete').then((res) => {
              navigated = true;
              console.log('[admin-unified] router.push /manual-order-complete resolved', res, window.location.href);
            }).catch((err) => console.warn('[admin-unified] router.push /manual-order-complete failed', err));
            // fallback: if router.push hasn't resolved in 200ms, force navigation
            setTimeout(() => {
              if (!navigated) {
                console.warn('[admin-unified] router.push /manual-order-complete did not resolve quickly — falling back to location.href');
                try { window.location.href = '/manual-order-complete'; } catch (e) { console.warn('fallback location.href failed', e); }
              }
            }, 200);
          } catch (err) { console.warn('[admin-unified] router.push threw', err); }
          setToast('Opened Manual Order Complete');
          break;
        case 'open_bill':
          console.log('[admin-unified] opening bill');
          try {
            let navigated = false;
            router.push('/bill').then((res) => {
              navigated = true;
              console.log('[admin-unified] router.push /bill resolved', res, window.location.href);
            }).catch((err) => console.warn('[admin-unified] router.push /bill failed', err));
            setTimeout(() => {
              if (!navigated) {
                console.warn('[admin-unified] router.push /bill did not resolve quickly — falling back to location.href');
                try { window.location.href = '/bill'; } catch (e) { console.warn('fallback location.href failed', e); }
              }
            }, 200);
          } catch (err) { console.warn('[admin-unified] router.push threw', err); }
          setToast('Opened Bill');
          break;
        case 'open_cart':
          console.log('[admin-unified] opening cart');
          try {
            // If we're already on the manual-order-complete page, prefer
            // opening the in-page cart sheet (so Shift+C opens the sheet)
            // instead of navigating to the /cart page. This keeps UX
            // consistent when using the manual order flow.
            const path = (typeof window !== 'undefined' && window.location && window.location.pathname) || '';
            if (path.indexOf('/manual-order-complete') !== -1) {
              try {
                // mark the time we attempted to open cart from admin page
                try { window.__admin_lastOpenCart = Date.now(); } catch (e) {}
                window.postMessage({ type: 'beyon:app-shortcut', payload: { action: 'open_cart' } }, '*');
                console.log('[admin-unified] posted beyon:app-shortcut open_cart to current page', { ts: Date.now(), path });
              } catch (e) {
                console.warn('[admin-unified] postMessage open_cart failed', e);
              }
              // For dev debugging: also set a short-lived flag so receiver can check
              try { window.__admin_openCartPostedFlag = Date.now(); setTimeout(() => { try { window.__admin_openCartPostedFlag = null; } catch (e) {} }, 2000); } catch (e) {}
              
            } else {
              // Navigate to manual-order-complete and ask it to auto-open the cart
              let navigated = false;
              router.push('/manual-order-complete?openCart=1').then((res) => {
                navigated = true;
                console.log('[admin-unified] router.push /manual-order-complete?openCart=1 resolved', res, window.location.href);
              }).catch((err) => console.warn('[admin-unified] router.push /manual-order-complete failed', err));
              setTimeout(() => {
                if (!navigated) {
                  console.warn('[admin-unified] router.push did not resolve quickly — falling back to location.href');
                  try { window.location.href = '/manual-order-complete?openCart=1'; } catch (e) { console.warn('fallback location.href failed', e); }
                }
              }, 200);
            }
          } catch (err) { console.warn('[admin-unified] router.push threw', err); }
          setToast('Opened Cart');
          break;
        case 'go_back':
          console.log('[admin-unified] go_back');
          try {
            router.back();
          } catch (err) {
            console.warn('[admin-unified] router.back failed', err);
            // fallback to home or admin-login
            router.push('/');
          }
          break;
        case 'print_current':
          console.log('[admin-unified] print_current received');
          try {
            // Prefer expandedOrderId (selected), else first visible filtered order
            const targetId = expandedOrderId || (filteredOrders && filteredOrders[0] && filteredOrders[0]._id);
            const orderToPrint = (filteredOrders || []).find((o) => o._id === targetId) || (filteredOrders || [])[0];
            if (!orderToPrint) {
              setToast('No order available to print');
              break;
            }
            try {
              if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.printReceipt === 'function') {
                window.electronAPI.printReceipt(orderToPrint).then((res) => {
                  if (!res || !res.success) console.warn('Print failed', res && res.failureReason);
                }).catch((err) => console.warn('printReceipt failed', err));
              } else {
                const q = encodeURIComponent(JSON.stringify(orderToPrint || {}));
                window.open(`/print-receipt?order=${q}`, '_blank');
              }
            } catch (e) {
              console.error('Print action failed', e);
              setToast('Print failed');
            }
            setToast('Printing...');
          } catch (e) {
            console.warn('[admin-unified] print_current error', e);
          }
          break;
        // cancel_order is an action that affects selected order — leave to UI
        default: break;
      }
    } catch (err) { console.warn('[admin-unified] handleMessage error', err); }
  }, [router, setToast]);

  // Global keyboard shortcut handler (postMessage)
  useEffect(() => {
    if (messageListenerRef.current) {
      window.removeEventListener('message', messageListenerRef.current);
    }
    messageListenerRef.current = handleMessage;
    console.log('[admin-unified] adding message listener for beyon:app-shortcut');
    window.addEventListener('message', messageListenerRef.current);

    // If a shortcut arrived just before this component mounted, shortcutHandler
    // stores the last action in `window.__beyon_shortcut_handler._last`.
    // Replay it if it is recent so the page doesn't miss an event fired during
    // navigation/hydration.
    try {
      const last = window.__beyon_shortcut_handler && window.__beyon_shortcut_handler._last;
      if (last && last.action && Date.now() - (last.ts || 0) < 500) {
        // replay
        console.log('[admin-unified] replaying recent shortcut', last);
        handleMessage({ data: { type: 'beyon:app-shortcut', payload: { action: last.action } } });
      }
    } catch (e) {
      // ignore
    }

    return () => {
      console.log('[admin-unified] removing message listener for beyon:app-shortcut');
      if (messageListenerRef.current) {
        window.removeEventListener('message', messageListenerRef.current);
      }
    };
  }, [handleMessage]);
  // ⚠️ DO NOT EXTRACT — BUSINESS CRITICAL
  // Reason: IndexedDB bootstrap & seed logic
  // Initialize local storage with seed data on first run
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Check if data already exists
        const existingMenu = await localData.getMenu();
        const existingOrders = await localData.getAllOrders();
        
        // Only initialize if data is empty/missing
        if (!existingMenu || Object.keys(existingMenu).length === 0) {
          console.log("Initializing menu data from JSON...");
          await localData.saveMenu(menuDataJSON);
        }
        
        if (!existingOrders || existingOrders.length === 0) {
          console.log("Initializing orders data from JSON...");
          await localData.saveAllOrders(localOrdersJSON || []);
        }
        
        // Initialize shop status if needed
        const shopStatus = await localData.getShopStatus();
        if (!shopStatus || Object.keys(shopStatus).length === 0) {
          console.log("Initializing shop status...");
          await localData.setShopStatus(true);
        }
        
        console.log("Local data initialization complete");
      } catch (error) {
        console.error("Error initializing local data:", error);
      }
    };
    
    initializeData();
  }, []); // Run only once on mount

  // Fetch active bundle/combo rules once (used to surface 'View Offer' for bundles)
  useEffect(() => {
    const fetchRules = async () => {
      try {
        // Bundle rules now managed by useAdminOffers
        await fetchOffers();
      } catch (e) {
        // silent
      }
    };
    fetchRules();
  }, []);

  // ✅ Fetch Shop Status (stable reference for effects)
  const fetchShopStatus = useCallback(async () => {
    try {
      const data = await localData.getShopStatus();
      setShopStatus(data);
    } catch (err) {
      console.error("Error fetching shop status:", err);
    }
  }, []);

  // ✅ Fetch Menu (stable reference for effects)
  const fetchMenu = useCallback(async () => {
    await hookFetchMenu();   // from useAdminProducts
    await fetchOffers();    // from useAdminOffers
  }, [hookFetchMenu, fetchOffers]);
  // ⚠️ DO NOT EXTRACT — BUSINESS CRITICAL
  // Reason: Chicken bulk logic relies on override state consistency
  // Bulk OFF chicken items, respecting manual overrides
  const bulkOffChickenWithOverrides = useCallback(async ({ noConfirm = false, silent = false } = {}) => {
    const ok = noConfirm || (typeof window !== 'undefined' ? window.confirm("Turn OFF all chicken items except manually overridden ones?") : true);
    if (!ok) return;
    try {
      setBulkBusy(true);
      // Find all chicken items that are NOT manually overridden to inStock: true
      const excludeItems = Object.keys(individualOverrides).filter(
        (itemName) => individualOverrides[itemName]?.inStock === true
      );
      // Use local data service instead of API
      const info = await localData.bulkToggleChickenItems(false, excludeItems);
      if (!silent) {
        showChToast(`Turned OFF ${info.changed || '-'} chicken items (manual overrides preserved).`);
      }
      await fetchMenu();
    } catch (error) {
      console.error('bulkOffChickenWithOverrides', error);
      if (!silent) showChToast('Failed to turn OFF chicken items.', 'error');
    } finally {
      setBulkBusy(false);
    }
  }, [fetchMenu, individualOverrides, showChToast]);

  // ✅ Add Item Submit
  const submitAddItem = async () => {
    if (addBusy) return;
    const chosenCategory = addForm.isNewCategory ? addForm.newCategory.trim() : addForm.category.trim();
    const name = addForm.name.trim();
    const priceStr = String(addForm.price ?? "").trim();
    const hasPrice = priceStr !== "";
    const price = hasPrice ? Number(priceStr) : undefined;

    if (!chosenCategory) {
      setToast("Please select or enter a category.");
      return;
    }
    if (!name) {
      setToast("Please enter a product name.");
      return;
    }
    if (hasPrice && (Number.isNaN(price) || price < 0)) {
      setToast("Please enter a valid price or leave it blank.");
      return;
    }

    // Duplicate check (case-insensitive) and confirm update
    const dup = (menu?.[chosenCategory] || []).some(
      (p) => String(p?.name || "").toLowerCase() === name.toLowerCase()
    );
    if (dup) {
      const ok = window.confirm(
        `An item named '${name}' already exists in '${chosenCategory}'. Update it?`
      );
      if (!ok) return;
    }

    try {
      setAddBusy(true);
      // Use local data service instead of API
      await localData.upsertProduct(chosenCategory, {
        name: name,
        ...(hasPrice ? { price } : {}),
        inStock: !!addForm.inStock,
        ...(typeof addForm.isChicken === 'boolean' ? { isChicken: addForm.isChicken } : {}),
      });
      await hookFetchMenu();
  setShowAddItem(false);
  setAddForm({ category: chosenCategory, isNewCategory: false, newCategory: "", name: "", price: "", inStock: true, isChicken: false });
  // Prepare remove form to point to the newly added/updated item for convenience
  setRemoveForm({ category: chosenCategory, productName: name });
      setToast(dup ? "Item updated." : "Item added.");
    } catch (e) {
      setToast(`Failed to add item: ${e.message || e}`);
    } finally {
      setAddBusy(false);
    }
  };

  // Helpers for desktop add/remove modal
  const removeItemsForCategory = useMemo(() => {
    if (!removeForm.category) return [];
    const items = Array.isArray(menu?.[removeForm.category]) ? menu[removeForm.category] : [];
    return items.map((item) => item?.name).filter(Boolean);
  }, [menu, removeForm.category]);

  const hasRemoveItems = removeItemsForCategory.length > 0;

  const resetAddForm = useCallback(() => {
    setAddForm({
      category: "",
      isNewCategory: false,
      newCategory: "",
      name: "",
      price: "",
      inStock: true,
      isChicken: false,
    });
  }, []);

  const handleCloseProductModal = () => {
    setShowAddItem(false);
    setModalMode('add');
    resetAddForm();
    setRemoveForm({ category: "", productName: "" });
    setAddBusy(false);
    setRemoveBusy(false);
  };

  // ✅ Remove single item (desktop flow)
  const submitRemoveItem = async () => {
    if (removeBusy) return;
    const category = (removeForm.category || "").trim();
    const productName = (removeForm.productName || "").trim();
    if (!category) {
      setToast("Select a category to remove from.");
      return;
    }
    if (!productName) {
      setToast("Select an item to remove.");
      return;
    }
    // show confirm modal
    setConfirmState({
      open: true,
      title: "Remove item",
      message: `Remove '${productName}' from category '${category}'? This action cannot be undone.`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      busy: false,
      onConfirm: async () => {
        await doRemoveItem(category, productName);
      },
    });
  };

  // Concrete action implementations invoked by confirm modal
  const doRemoveItem = async (category, productName) => {
    try {
      setConfirmState((s) => ({ ...s, busy: true }));
      setRemoveBusy(true);
      await localData.removeProduct(category, productName);
      await hookFetchMenu();
      const nextCategories = Object.keys(menu || {}).sort((a, b) => a.localeCompare(b));
      const nextCategory = nextCategories.includes(category) ? category : (nextCategories[0] || "");
      const nextItems = nextCategory && Array.isArray(menu?.[nextCategory]) ? menu[nextCategory] : [];
      const nextProduct = nextItems.find((item) => item?.name === productName)
        ? productName
        : (nextItems[0]?.name || "");
      setRemoveForm({ category: nextCategory, productName: nextProduct });
      setToast(`Removed '${productName}'.`);
      if (!nextCategory) {
        setModalMode('add');
      }
    } catch (e) {
      console.error('removeProduct error', e);
      setToast(`Failed to remove item: ${e.message || e}`);
    } finally {
      setRemoveBusy(false);
      setConfirmState({ open: false });
    }
  };

  // ✅ Helpers
  // (No local order exclusion; show all manual/local orders)

  // ✅ Fetch Orders
  const fetchAndFilterOrders = useCallback(async () => {
    if (fetchingRef.current) return; // prevent overlapping fetches
    fetchingRef.current = true;
    setLoading(true);
    setFetching(true);
    try {
      const [backendOrders, localOrdersData] = await Promise.all([
        localData.getBackendOrders(),
        localData.getLocalOrders(),
      ]);

  // Guarded logs: backendOrders/localOrdersData might be undefined or not arrays
  const backendCount = Array.isArray(backendOrders) ? backendOrders.length : 0;
  const localCount = Array.isArray(localOrdersData) ? localOrdersData.length : 0;
  console.log("Backend orders:", backendCount);
  console.log("Local orders:", localCount);

      setOrders(backendOrders || []);
      setLocalOrders(localOrdersData || []);
    } catch (err) {
      console.error("Error fetching orders (local):", err);
      setToast("Failed to load local orders.");
    } finally {
      setLoading(false);
      setFetching(false);
      fetchingRef.current = false;
    }
  }, [fetchingRef]);

  // Initial data fetch on mount
  useEffect(() => {
    fetchAndFilterOrders();
  }, [fetchAndFilterOrders]);

  // ✅ Update Backend Status
  const updateStatus = async (id, status) => {
    try {
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
      setToast(`Failed to update order: ${e.message}`);
    }
  };

  // ✅ Update Shop Open/Close
  const updateShopStatus = async (isOpen) => {
    try {
      setShopStatus({ isOpen });
      await localData.setShopStatus(isOpen);
      await fetchShopStatus();
    } catch {
      setToast("Failed to update shop status");
      setShopStatus((prev) => ({ isOpen: !isOpen })); // rollback
    }
  };

  // ✅ Update Local Order Status
  const updateLocalStatus = async (id, status) => {
    const orderExists = localOrders.find((o) => o._id === id);
    if (!orderExists) {
      setToast("Order not found. Refresh and try again.");
      return;
    }

    // Prepare timestamp fields for local orders so timers work
    const timestampField = (() => {
      const s = String(status).toLowerCase();
      if (s === "accepted") return { acceptedAt: new Date().toISOString() };
      if (s === "ready") return { readyAt: new Date().toISOString() };
      if (s === "paid") return { paidAt: new Date().toISOString() };
      if (s === "cancelled") return { cancelledAt: new Date().toISOString() };
      if (s === "archived") return { archivedAt: new Date().toISOString() };
      return {};
    })();

    setLocalOrders((prev) =>
      prev.map((o) => (o._id === id ? { ...o, status, ...timestampField } : o))
    );

    try {
      await localData.updateLocalOrderStatus(id, status, timestampField);
      await fetchAndFilterOrders();
    } catch (e) {
      console.error(e);
      await fetchAndFilterOrders();
      setToast(`Failed to update local order: ${e.message}`);
    }
  };

  // ✅ Update Product Stock
  const updateProductStock = useCallback(async (category, productName, inStock, manualOverride) => {
    try {
      const payload = { name: productName, inStock };
      if (typeof manualOverride === 'boolean') {
        payload.manualOverride = manualOverride;
      }
      await localData.upsertProduct(category, payload);
      await fetchMenu();
    } catch (error) {
      console.error(error);
      setToast(`Failed to update product stock: ${error.message}`);
    }
  }, [fetchMenu]);

  // ✅ Chicken stats (prefer explicit flag; fallback to name)
  const chickenStats = useMemo(() => {
    let total = 0, inStockCount = 0, unavailableCount = 0;
    for (const category of Object.keys(menu || {})) {
      for (const p of menu[category] || []) {
        const isChicken = p?.isChicken === true || /chicken/i.test(p?.name || "");
        if (isChicken) {
          total += 1;
          const isOn = p?.inStock === true; // STRICT true means ON; undefined treated as OFF
          if (isOn) inStockCount += 1; else unavailableCount += 1;
        }
      }
    }
    return { total, inStockCount, unavailableCount };
  }, [menu]);

  const bulkSetChicken = async (inStockTarget, options = {}) => {
    const { skipConfirm } = options;
    // Debounce accidental rapid taps
    const now = Date.now();
    if (now - (chLastClickRef.current || 0) < 300) return;
    chLastClickRef.current = now;
    if (bulkBusy) return;
    if (!menu || Object.keys(menu).length === 0) {
      await fetchMenu();
    }
    if (chickenStats.total === 0) {
      showChToast("No Chicken products found.");
      return;
    }
    const verb = inStockTarget ? 'ON' : 'OFF';
    const proceed = skipConfirm ? true : (typeof window !== 'undefined' ? window.confirm(`Turn all 'Chicken' items ${verb}?`) : true);
    if (!proceed) return;

    setBulkBusy(true);
    try {
      // Use local data service instead of server calls
      const result = await localData.bulkToggleChickenItems(inStockTarget);
      showChToast(`${result.changed} chicken items turned ${verb}.`);
      await fetchMenu();
    } catch (e) {
      console.error(e);
      showChToast("Failed to bulk update chicken items.", 'error');
    } finally {
      setBulkBusy(false);
    }
  };
  // ⚠️ DO NOT EXTRACT — BUSINESS CRITICAL
  // Reason: Timer-based polling tied to UI state
  // Tick 'now' periodically to refresh timers in table
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // ✅ Toggle a single product with per-item loading
  const toggleProductStock = async (category, product) => {
    const key = JSON.stringify({ c: category, n: product.name });
    if (productBusy[key]) return;
    setProductBusy((prev) => ({ ...prev, [key]: true }));
    try {
      const next = !(product.inStock !== false);
      // If toggling, set manualOverride true; if toggling back to default (matches global), clear it
      const isChicken = product.isChicken === true || /chicken/i.test(product.name);
      // If toggling to match global (chicken ON for ON, chicken OFF for OFF), clear override
      let manualOverride = true;
      if (isChicken && ((next && product.inStock === true) || (!next && product.inStock === false))) {
        manualOverride = false;
      }
      await updateProductStock(category, product.name, next, manualOverride);
    } finally {
      setProductBusy((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleProductMenuToggle = (key) => {
    setProductMenuKey((prev) => (prev === key ? null : key));
  };

  const handleEditPrice = (category, product) => {
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
  };

  const handleEditName = (category, product) => {
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
  };

  const closeProductEditModal = useCallback(() => {
    setProductEditState(createEmptyProductEditState());
  }, []);

  const handleProductEditChange = useCallback((value) => {
    setProductEditState((prev) => ({ ...prev, value, error: '' }));
  }, []);

  const submitProductEdit = useCallback(async () => {
    if (!productEditState.open || productEditState.busy) return;

    const { mode, category, product, value } = productEditState;
    if (!mode || !category || !product) {
      closeProductEditModal();
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
      closeProductEditModal();
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
      setToast(mode === 'price' ? 'Price updated.' : 'Name updated.');
      closeProductEditModal();
    } catch (error) {
      console.error(mode === 'price' ? 'Edit price error' : 'Edit name error', error);
      const failureMessage = error?.message
        ? `Failed to update ${mode === 'price' ? 'price' : 'name'}: ${error.message}`
        : `Failed to update ${mode === 'price' ? 'price' : 'name'}.`;
      setToast(failureMessage);
      setProductEditState((prev) => ({ ...prev, busy: false, error: failureMessage }));
    }
  }, [productEditState, productBusy, closeProductEditModal, fetchMenu]);

  const handleEditOffer = (category, product) => {
    setProductMenuKey(null);
    const { ok, prefill } = editOffer(category, product);
    if (!ok) {
      setToast('Could not edit offer: Invalid product selection');
      return;
    }
    router.push('/admin-offers');
  };

  const handleRemoveOffer = async (category, product) => {
    setProductMenuKey(null);
    try {
      await deleteOffer({ category, product });
      setToast('Offer removed successfully');
      await fetchOffers(); // Refresh the offers
    } catch (error) {
      console.error('Failed to remove offer:', error);
      setToast('Failed to remove offer. Please try again.');
    }
  };

  const doRemoveOffer = async (category, product) => {
    const key = JSON.stringify({ c: category, n: product.name });
    if (productBusy[key]) return;
    try {
      setConfirmState((s) => ({ ...s, busy: true }));
      setProductBusy((prev) => ({ ...prev, [key]: true }));
      const menuSnapshot = await localData.getMenu();
      const list = Array.isArray(menuSnapshot?.[category]) ? [...menuSnapshot[category]] : [];
      const index = list.findIndex((item) => item?.name === product.name);
      if (index === -1) {
        setToast('Item not found. Refresh and try again.');
        return;
      }
      const current = { ...list[index] };
      const restorePrice = Number(current.originalPrice);
      delete current.originalPrice;
      if (Number.isFinite(restorePrice) && restorePrice > 0) {
        current.price = restorePrice;
      }
      list[index] = current;
      const updatedMenu = { ...menuSnapshot, [category]: list };
      await localData.saveMenu(updatedMenu);
      await fetchMenu();
      setToast('Offer removed for this item.');
    } catch (e) {
      console.error('Remove offer error', e);
      setToast(e?.message ? `Failed to remove offer: ${e.message}` : 'Failed to remove offer.');
    } finally {
      setProductBusy((prev) => ({ ...prev, [key]: false }));
      setConfirmState({ open: false });
    }
  };

  const handleDeleteProduct = async (category, product) => {
    setProductMenuKey(null);
    // show confirm modal for delete
    setConfirmState({
      open: true,
      title: 'Delete item',
      message: `Delete '${product.name}' from '${category}'? This WILL remove the item permanently.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      busy: false,
      onConfirm: async () => {
        await doDeleteProduct(category, product);
      },
    });
  };

  const doDeleteProduct = async (category, product) => {
    const key = JSON.stringify({ c: category, n: product.name });
    if (productBusy[key]) return;
    try {
      setConfirmState((s) => ({ ...s, busy: true }));
      setProductBusy((prev) => ({ ...prev, [key]: true }));
      const menuSnapshot = await localData.getMenu();
      const list = Array.isArray(menuSnapshot?.[category]) ? [...menuSnapshot[category]] : [];
      const filtered = list.filter((item) => item?.name !== product.name);
      const updatedMenu = { ...menuSnapshot, [category]: filtered };
      await localData.saveMenu(updatedMenu);
      await fetchMenu();
      setToast('Item deleted.');
    } catch (e) {
      console.error('Delete item error', e);
      setToast(e?.message ? `Failed to delete item: ${e.message}` : 'Failed to delete item.');
    } finally {
      setProductBusy((prev) => ({ ...prev, [key]: false }));
      setConfirmState({ open: false });
    }
  };

  // ✅ Auto-refresh current tab (except Products) every 10 seconds
  useEffect(() => {
    if (tab !== "Products") {
      const interval = setInterval(fetchAndFilterOrders, 10000);
      return () => clearInterval(interval);
    }
  }, [tab, fetchAndFilterOrders]);

  // ✅ Debounced fetch on tab change: wait ~1s before fetching once
  useEffect(() => {
    // Skip for Products tab (doesn't need orders) and when already loading
    if (tab === "Products") return;
    setLazyLoad(true);
    const timer = setTimeout(() => {
      setLazyLoad(false);
      fetchAndFilterOrders();
    }, 1000);
    return () => clearTimeout(timer);
  }, [tab, fetchAndFilterOrders]);

  // ✅ Fetch Menu on Products tab
  useEffect(() => {
    if (tab === "Products") {
      fetchMenu();
      // Optionally, auto-enforce bulk chicken OFF respecting overrides:
      // bulkOffChickenWithOverrides({ noConfirm: true, silent: true });
    }
  }, [tab, fetchMenu]);

  // ✅ Refresh menu data when returning to Products tab (for offer updates)
  useEffect(() => {
    if (tab === "Products") {
      // Force refresh menu data to show any newly applied offers
      const refreshMenuForOffers = async () => {
        try {
          await hookFetchMenu();
          await fetchOffers();
        } catch (err) {
          console.error("Error refreshing menu for offers:", err);
        }
      };
      refreshMenuForOffers();
    }
  }, [tab, hookFetchMenu, fetchOffers]);

  // ✅ Fetch Shop Status on mount
  useEffect(() => {
    fetchShopStatus();
  }, []);

  // (Removed custom absolute positioning; dropdown is now anchored to the button container)

  // ✅ Close menu on outside click
  useEffect(() => {
    const clickHandler = (e) => {
      if (!menuDropdownRef.current && !menuButtonRef.current) return;
      if (menuOpen && !menuDropdownRef.current.contains(e.target) && !menuButtonRef.current.contains(e.target)) {
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
  }, [menuOpen]);

  useEffect(() => {
    if (!productMenuKey) return;
    const clickHandler = (event) => {
      const menuEl = productMenuRefs.current[productMenuKey];
      const buttonEl = productMenuButtonRefs.current[productMenuKey];
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

  // ✅ Filter Orders by Tab
  const filteredOrders = useMemo(() => {
    let result = [];
    switch (tab) {
      case "Local":
        result = localOrders.filter((o) => o.status === "pending");
        break;
      case "Active":
        // Only show backend orders (WhatsApp) in Active tab
        // Completely exclude ALL local orders from Active tab
        // Also exclude orders without phone numbers
        result = orders.filter((o) => {
          const isActiveStatus = ACTIVE_STATUSES.includes(o.status);
          const isNotLocal = o.source !== "local";
          const hasPhone = typeof o.customerNumber === "string" && o.customerNumber.trim() !== "";
          return isActiveStatus && isNotLocal && hasPhone;
        });
        break;
      case "Ready":
        result = [
          ...orders.filter((o) =>
            READY_BACKEND_STATUSES.includes(o.status)
          ),
          ...localOrders.filter((o) => o.status === READY_LOCAL_STATUS),
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
  }, [tab, orders, localOrders]);

  // ✅ Respect ?tab= in URL on load/navigation
  useEffect(() => {
    const qTab = typeof router?.query?.tab === 'string' ? router.query.tab : undefined;
    if (qTab && TABS.includes(qTab) && qTab !== tab) {
      setTab(qTab);
    }
  }, [router?.query?.tab]);
  // ======================================================================
  // EVENT HANDLERS
  // ======================================================================
  // ✅ Tab Change Handler (Updates URL)
  const handleTabChange = useCallback((newTab) => {
    console.log('[admin-unified] handleTabChange called ->', newTab);
    // Use functional state update to avoid capturing stale `tab` and to make
    // the callback stable (so other hooks depending on it do not re-run).
    setTab((prev) => {
      if (prev === newTab) return prev;
      try {
        router.push(
          { query: { ...router.query, tab: newTab } },
          undefined,
          { shallow: true }
        );
      } catch (e) {
        // ignore router errors
      }
      return newTab;
    });
  }, [router]);

  // ✅ Expand/Collapse an order row to show full items
  const toggleExpand = (id) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  };

  // ✅ Logout
  const handleCreateOffer = () => {
    router.push("/admin-offers");
  };

  const handleLogout = () => {
    localStorage.removeItem("adminAuthenticated");
    router.push("/admin-login");
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-4">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      {/* Header row: tabs left, hamburger right (sticky, clean positioning) */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200 mb-4 py-2">
        <div className="flex items-center justify-between gap-2">
          {/* Scrollable tabs */}
          <div className="flex gap-2 overflow-x-auto flex-nowrap scrollbar-hide pr-2">
            {TABS.map((t) => (
              <button
                key={t}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  tab === t
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
                onClick={() => handleTabChange(t)}
              >
                {t}
              </button>
            ))}
            {/* Hamburger menu - Now relative, scrolls with tabs */}
            <div className="flex-shrink-0 ml-auto mr-2 flex items-center justify-center" ref={menuButtonRef}>
              <button
                aria-label="Admin menu"
                className="hamburger-menu w-[1.951rem] h-[1.951rem] self-center rounded-full flex items-center justify-center shadow-sm bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 relative z-10"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {/* Dropdown remains fixed relative to body for overlay */}
        {menuOpen && (
          <div
            ref={menuDropdownRef}
            className="fixed right-4 top-[3rem] w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[999]"
          >
            <div className="p-2">
              <div className="px-2 py-2 text-xs uppercase tracking-wide text-gray-500">Shop</div>
              <button
                onClick={() => { updateShopStatus(!shopStatus.isOpen); setMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium mb-2 ${
                  shopStatus.isOpen ? "bg-orange-500 text-white" : "bg-gray-500 text-white"
                }`}
              >
                {shopStatus.isOpen ? "Open" : "Closed"}
              </button>
              <div className="px-2 py-2 text-xs uppercase tracking-wide text-gray-500">Actions</div>
              <button
                onClick={() => { router.push("/manual-order-complete"); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-md text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 mb-2"
              >
                Manual Order
              </button>
              <button
                onClick={() => { handleLogout(); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs moved to header */}

      {/* Content based on tab */}
      {tab === "Products" ? (
        <div>
          <h2 className="text-xl font-bold text-gray-800">Product Stock Management</h2>
          {/* Toolbar under heading */}
          <div className="w-full overflow-x-auto scrollbar-none" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            <div className="mt-2 mb-4 flex items-center gap-2 min-w-0 w-max border-[0.4px] border-gray-400 rounded-full bg-white/80 px-4 py-1.25 shadow-sm whitespace-nowrap touch-pan-x scrollbar-none" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              <button
                onClick={() => setShowSearchBar((v) => !v)}
                className="inline-flex items-center justify-center px-3.5 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300"
                title="Search"
                aria-label="Search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <circle cx="11" cy="11" r="7"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
              {showSearchBar && (
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products..."
                  className="max-w-xs w-[220px] bg-white border border-gray-300 rounded-full pl-3 pr-3 py-2 text-sm outline-none focus:border-orange-400 text-black placeholder:text-gray-400"
                />
              )}
              <button
                onClick={() => setShowUnavailableOnly((v) => !v)}
                className={`px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                  showUnavailableOnly ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                Unavailable Items
              </button>
              <button
                onClick={() => {
                  // Show the small choice popup modal (Add / Remove)
                  setShowAddRemoveMenu(true);
                }}
                className="px-3.5 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-orange-500 hover:text-white transition-colors"
              >
                Add/Remove Items
              </button>
              <button
                onClick={() => {
                  router.push('/admin-offers');
                }}
                className="px-3.5 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-orange-500 hover:text-white transition-colors"
              >
                Apply Offers
              </button>
              {(() => {
                // Single CH ON/OFF toggle button with loader and color
                // We'll use chickenStats to determine ON/OFF state (if all chicken inStock, ON; else OFF)
                const isChickenOn = chickenStats.total > 0 && chickenStats.inStockCount === chickenStats.total;
                return (
                  <button
                    onClick={() => {
                      if (isChickenOn) {
                        bulkOffChickenWithOverrides();
                      } else {
                        bulkSetChicken(true);
                      }
                    }}
                    disabled={bulkBusy}
                    className={
                      'px-3.5 py-2 rounded-full h-[2.004rem] w-20 hover:opacity-80 inline-flex items-center justify-center font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 text-white text-[93.2%] ' +
                      (isChickenOn
                        ? 'bg-green-500'
                        : 'bg-[#FF033E]') +
                      (bulkBusy ? ' opacity-70 cursor-not-allowed' : '')
                    }
                    style={{transition: 'background 0.2s'}}
                  >
                    {bulkBusy ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    ) : (
                      isChickenOn ? 'CH ON' : 'CH OFF'
                    )}
                  </button>
                );
              })()}
            </div>
          </div>
          {/* Product grid */}
          {Object.keys(menu).map((category) => {
            const items = (menu[category] || []).filter((product) => {
              const inStock = product.inStock !== false;
              const availabilityOk = showUnavailableOnly ? !inStock : true;
              const q = productSearch.trim().toLowerCase();
              const searchOk = q ? product.name.toLowerCase().includes(q) : true;
              return availabilityOk && searchOk;
            });
            if (items.length === 0) return null;
            return (
              <div key={category} className="mb-6">
                <h3 className="text-lg font-semibold mb-2 text-gray-700">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((product) => {
                    const key = JSON.stringify({ c: category, n: product.name });
                    const busy = !!productBusy[key];
                    const inStock = product.inStock !== false;
                    // Offer/bundle logic
                    const hasDiscountOffer = typeof product.originalPrice === 'number' && product.originalPrice > (product.price ?? 0);
                    const savings = hasDiscountOffer ? Math.max(0, Math.round(product.originalPrice - (product.price ?? 0))) : 0;
                    const pct = hasDiscountOffer && product.originalPrice > 0 ? Math.round((savings / product.originalPrice) * 100) : 0;
                    const matchesRule = (rule) => {
                      try {
                        if (!rule) return false;
                        const nameEq = (a,b) => String(a||'').toLowerCase() === String(b||'').toLowerCase();
                        const catEq = (a,b) => String(a||'').toLowerCase() === String(b||'').toLowerCase();
                        if (rule.type === 'buy_x_get_y') {
                          const baseMatch = rule.base && rule.base.match ? (
                            (rule.base.match.name ? nameEq(rule.base.match.name, product.name) : true) &&
                            (rule.base.match.category ? catEq(rule.base.match.category, category) : true)
                          ) : false;
                          const rewardMatch = (rule.reward?.items || []).some((r) => nameEq(r.name, product.name));
                          return baseMatch || rewardMatch;
                        }
                        if (rule.type === 'fixed_combo_price') {
                          const reqs = Array.isArray(rule.required) ? rule.required : [];
                          return reqs.some((r) =>
                            (r.name ? nameEq(r.name, product.name) : true) && (r.category ? catEq(r.category, category) : true)
                          );
                        }
                        return false;
                      } catch { return false; }
                    };
                    const bundleMatches = (hookBundleRules || []).filter(matchesRule);
                    const hasBundleOffer = bundleMatches.length > 0;
                    const hasOffer = hasDiscountOffer || hasBundleOffer;
                    const isOpen = !!offerOpen[key];
                    const menuOpenForProduct = productMenuKey === key;
                    return (
                      <div key={product.name} className="relative border border-gray-200 p-4 rounded-lg bg-white h-full flex flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{product.name}</p>
                            <p className="text-sm text-gray-600">₹{product.price}</p>
                          </div>
                          <div className="relative flex-shrink-0">
                            <button
                              type="button"
                              aria-label="Product actions"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleProductMenuToggle(key);
                              }}
                              ref={(el) => {
                                if (el) productMenuButtonRefs.current[key] = el;
                                else delete productMenuButtonRefs.current[key];
                              }}
                              className={`p-1.5 rounded-full border border-transparent text-gray-500 hover:text-gray-900 hover:border-orange-200 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-400 ${menuOpenForProduct ? 'bg-orange-50 text-orange-600 border-orange-200' : ''}`}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="block">
                                <circle cx="12" cy="5" r="1.5" />
                                <circle cx="12" cy="12" r="1.5" />
                                <circle cx="12" cy="19" r="1.5" />
                              </svg>
                            </button>
                            {menuOpenForProduct && (
                              <div
                                ref={(el) => {
                                  if (el) productMenuRefs.current[key] = el;
                                  else delete productMenuRefs.current[key];
                                }}
                                className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg z-20 overflow-hidden"
                              >
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleEditPrice(category, product);
                                  }}
                                  className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                                >
                                  Edit Price
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleEditName(category, product);
                                  }}
                                  className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                                >
                                  Edit Name
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleEditOffer(category, product);
                                  }}
                                  className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                                >
                                  Edit Offer
                                </button>
                                {hasDiscountOffer && (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleRemoveOffer(category, product);
                                    }}
                                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                                  >
                                    Remove Offer
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteProduct(category, product);
                                  }}
                                  className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  Delete Item
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 pt-1 flex justify-between items-end gap-2">
                          <div className="flex items-center gap-2">
                            {hasOffer && (
                              <button
                                type="button"
                                title="View applied offer"
                                aria-label="View applied offer"
                                onClick={() => setOfferOpen((prev) => ({ ...prev, [key]: !prev[key] }))}
                                className="px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center gap-2 bg-red-50 text-red-800 border border-red-200 hover:bg-red-100"
                              >
                                View Offer
                              </button>
                            )}
                          </div>
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleProductStock(category, product)}
                              disabled={busy}
                              className={`px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center gap-2 ${
                                inStock
                                  ? busy
                                    ? "bg-orange-300 text-white cursor-not-allowed"
                                    : "bg-orange-500 text-white hover:bg-orange-600"
                                  : busy
                                  ? "bg-gray-400 text-white cursor-not-allowed"
                                  : "bg-gray-500 text-white hover:bg-gray-600"
                              }`}
                            >
                              {busy && (
                                <span className="inline-block w-3.5 h-3.5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                              )}
                              {inStock ? "In Stock" : "Unavailable"}
                            </button>
                          </div>
                        </div>
                        {hasOffer && isOpen && (
                          <div className="mt-2 text-xs bg-red-50 text-red-900 border border-red-200 rounded p-2">
                            {hasDiscountOffer && (
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
                                <div>
                                  Original: <span className="font-semibold">₹{product.originalPrice}</span>
                                </div>
                                <div>
                                  Now: <span className="font-semibold">₹{product.price}</span>
                                </div>
                                <div>
                                  Saved: <span className="font-semibold">₹{savings}</span>{pct ? <span> ({pct}%)</span> : null}
                                </div>
                              </div>
                            )}
                            {hasBundleOffer && (
                              <div className="space-y-1">
                                <div className="font-semibold">Bundle/Combo rules affecting this item:</div>
                                <ul className="list-disc ml-5 space-y-0.5">
                                  {bundleMatches.map((r) => (
                                    <li key={r.id || r._id || JSON.stringify(r)}>
                                      {r.type === 'buy_x_get_y' && (
                                        <>
                                          Buy {r.base?.quantity || 0} x {r.base?.match?.name || r.base?.match?.category || 'item'} → Get {r.reward?.items?.[0]?.quantity || 1} x {r.reward?.items?.[0]?.name} @ ₹{r.reward?.items?.[0]?.price ?? 0}
                                        </>
                                      )}
                                      {r.type === 'fixed_combo_price' && (
                                        <>
                                          Combo: ₹{r.price} — Required: {(r.required || []).map((x) => x.name || x.category).join(', ')}
                                        </>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={() => setOfferOpen((prev) => ({ ...prev, [key]: false }))}
                                className="px-2.5 py-1 rounded-md text-xs font-medium bg-white text-red-800 border border-red-200 hover:bg-red-100"
                              >
                                Close
                              </button>
                              <button
                                type="button"
                                onClick={() => router.push('/admin-offers')}
                                className="ml-2 px-2.5 py-1 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-700"
                              >
                                Manage Offers
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : tab === "Offers" ? (
        <OffersPanel
          bundleRules={hookBundleRules}
          offersBusy={hookOffersBusy}
          onCreateOffer={handleCreateOffer}
        />
      ) : (
        /* Orders Table with lazy loader */
        (lazyLoad || loading) ? (
          <div className="flex justify-center items-center my-8">
            <div className="tab-loader">
              <div className="loader-background"></div>
              <div className="loader-arc"></div>
            </div>
            <span className="ml-2 text-orange-600">Loading orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <p className="text-gray-600">No orders found</p>
        ) : (
          <div className="overflow-x-auto scrollbar-orange">
            <table role="table" className={`border border-gray-200 w-full text-[13px] table-fixed bg-white rounded-lg overflow-hidden text-gray-800 border-collapse ${tab === 'Archived' ? 'min-w-[940px]' : 'min-w-[1100px]'}`}>
              <colgroup>
                <col className="w-[140px]" />
                <col />
                <col className="w-[90px]" />
                <col className="w-[110px]" />
                <col className="w-[160px]" />
                <col className="w-[90px]" />
                {tab !== 'Archived' && <col className="w-[160px]" />}
              </colgroup>
              <thead className="overflow-hidden">
              <tr className="bg-gray-50 text-left text-gray-600 border-2 border-gray-400 rounded-md" role="row" style={{ boxShadow: '0 0 8px 2px rgba(30,41,59,0.13)' }}>
                <th scope="col" className="px-2.5 py-2.5 text-[10.5px] text-gray-900 uppercase tracking-wide font-semibold w-32" style={{ textShadow: '0 0 8px rgba(30,41,59,0.13), 0 0 3px rgba(30,41,59,0.10)' }}>Customer</th>
                <th scope="col" className="px-2.5 py-2.5 text-[10.5px] text-gray-900 uppercase tracking-wide font-semibold" style={{ textShadow: '0 0 8px rgba(30,41,59,0.13), 0 0 3px rgba(30,41,59,0.10)' }}>Items</th>
                <th scope="col" className="px-2.5 py-2.5 text-[10.5px] text-gray-900 uppercase tracking-wide font-semibold w-20" style={{ textShadow: '0 0 8px rgba(30,41,59,0.13), 0 0 3px rgba(30,41,59,0.10)' }}>Total</th>
                <th scope="col" className="px-2.5 py-2.5 text-[10.5px] text-gray-900 uppercase tracking-wide font-semibold w-28" style={{ textShadow: '0 0 8px rgba(30,41,59,0.13), 0 0 3px rgba(30,41,59,0.10)' }}>Status</th>
                <th scope="col" className="px-2.5 py-2.5 text-[10.5px] text-gray-900 uppercase tracking-wide font-semibold w-40" style={{ textShadow: '0 0 8px rgba(30,41,59,0.13), 0 0 3px rgba(30,41,59,0.10)' }}>Order Date</th>
                <th scope="col" className="px-2.5 py-2.5 text-[10.5px] text-gray-900 uppercase tracking-wide font-semibold w-20" style={{ textShadow: '0 0 8px rgba(30,41,59,0.13), 0 0 3px rgba(30,41,59,0.10)' }}>Timer</th>
                {tab !== 'Archived' && (
                  <th scope="col" className="px-2.5 py-1.5 text-[10.5px] text-gray-900 uppercase tracking-wide font-semibold min-w-[150px] text-right" style={{ textShadow: '0 0 8px rgba(30,41,59,0.13), 0 0 3px rgba(30,41,59,0.10)' }}>Actions</th>
                )}
              </tr>
              </thead>
            <tbody role="rowgroup">
              {filteredOrders.map((o, index) => {
                const isExpanded = expandedOrderId === o._id;
                if (isExpanded) {
                  // Render a single replacement row with detailed items
                  const items = Array.isArray(o.items) ? o.items : [];
                  const cols = tab === 'Archived' ? 6 : 7; // number of visible columns when expanded
                  return (
                    <tr key={`${o._id}-${index}-expanded`} className="bg-white hover:bg-white">
                      <td colSpan={cols} className="px-3 py-3 border-b border-gray-200 align-top">
                        <div
                          className="flex items-start justify-between cursor-pointer select-none"
                          onClick={() => toggleExpand(o._id)}
                          role="button"
                          aria-label="Collapse details"
                        >
                          <div>
                            <div className="text-sm font-semibold text-gray-700 mb-1">Items</div>
                            {items.length === 0 ? (
                              <div className="text-sm text-gray-600">No items</div>
                            ) : (
                              <ul className="text-sm text-gray-800 list-disc pl-5 space-y-1">
                                {items.map((it, idx) => {
                                  const name = it?.name || 'Item';
                                  const qty = Number(it?.quantity || it?.qty || 1);
                                  // Always show quantity; do not show price/amount here
                                  const line = `${name} x${qty}`;
                                  return <li key={idx}>{line}</li>;
                                })}
                              </ul>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(o._id); }}
                            className="ml-4 inline-flex items-center justify-center h-7 px-3 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                          >
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <OrderRow
                    key={`${o._id}-${o.source || 'backend'}-${index}`}
                    order={o}
                    tab={tab}
                    now={now}
                    updateStatus={updateStatus}
                    updateLocalStatus={updateLocalStatus}
                    onToggleExpand={toggleExpand}
                  />
                );
              })}
            </tbody>
            </table>
          </div>
        )
      )}
      </div>
      <ProductEditModal
        state={productEditState}
        onClose={closeProductEditModal}
        onChange={handleProductEditChange}
        onSubmit={submitProductEdit}
      />
      {/* Confirm modal (global) */}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        busy={confirmState.busy}
        onCancel={() => {
          if (!confirmState.busy) setConfirmState({ open: false });
        }}
        onConfirm={async () => {
          if (confirmState.busy) return;
          if (typeof confirmState.onConfirm === 'function') {
            await confirmState.onConfirm();
          }
        }}
      />

      {/* Add / Remove Items Modal */}
      {/* Small centered choice popup for Add vs Remove */}
      {showAddRemoveMenu && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/30 p-4" onClick={() => setShowAddRemoveMenu(false)}>
          <div className="bg-white rounded-lg p-4 w-full max-w-xs shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-medium mb-3">Choose action</h4>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setModalMode('add'); setShowAddItem(true); setShowAddRemoveMenu(false); }}
                className="w-full py-2 px-3 rounded bg-orange-500 text-white"
              >
                Add Item
              </button>
              <button
                onClick={() => { setModalMode('remove'); setShowAddItem(true); setShowAddRemoveMenu(false); }}
                className="w-full py-2 px-3 rounded bg-red-600 text-white"
              >
                Remove Item
              </button>
              <button onClick={() => setShowAddRemoveMenu(false)} className="w-full py-2 px-3 rounded bg-gray-100">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showAddItem && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4">
          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <button
              type="button"
              onClick={handleCloseProductModal}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
              aria-label="Close modal"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="px-6 py-6">
              <h3 className="text-lg font-semibold text-gray-900">Manage Products</h3>
              <p className="mt-1 text-sm text-gray-500">Add new menu items or remove existing ones from the product list.</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalMode('add')}
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    modalMode === 'add'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Add Item
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('remove')}
                  disabled={categoryList.length === 0}
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    categoryList.length === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : modalMode === 'remove'
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Remove Item
                </button>
              </div>

              {modalMode === 'add' ? (
                <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); submitAddItem(); }}>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-semibold text-gray-800" htmlFor="modal-add-category">Category</label>
                      <label className="flex items-center gap-2 text-xs text-gray-600" htmlFor="modal-add-new-category">
                        <input
                          id="modal-add-new-category"
                          type="checkbox"
                          checked={addForm.isNewCategory}
                          onChange={(e) => setAddForm((prev) => ({
                            ...prev,
                            isNewCategory: e.target.checked,
                            category: e.target.checked ? "" : (categoryList[0] || prev.category || ""),
                            newCategory: e.target.checked ? prev.newCategory : "",
                          }))}
                          className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                        />
                        Create new category
                      </label>
                    </div>
                    <div className="mt-2">
                      {addForm.isNewCategory ? (
                        <input
                          id="modal-add-category"
                          value={addForm.newCategory}
                          onChange={(e) => setAddForm((prev) => ({ ...prev, newCategory: e.target.value }))}
                          placeholder="Enter new category name"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        />
                      ) : (
                        <select
                          id="modal-add-category"
                          value={addForm.category}
                          onChange={(e) => setAddForm((prev) => ({ ...prev, category: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                        >
                          <option value="">Select category</option>
                          {categoryList.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800" htmlFor="modal-add-name">Product name</label>
                    <input
                      id="modal-add-name"
                      value={addForm.name}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Classic Burger"
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800" htmlFor="modal-add-price">Price (optional)</label>
                    <input
                      id="modal-add-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={addForm.price}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, price: e.target.value }))}
                      placeholder="Enter price"
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={addForm.inStock}
                        onChange={(e) => setAddForm((prev) => ({ ...prev, inStock: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                      />
                      Mark as in stock
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={addForm.isChicken}
                        onChange={(e) => setAddForm((prev) => ({ ...prev, isChicken: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                      />
                      Chicken item
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseProductModal}
                      className="rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addBusy}
                      className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors ${addBusy ? 'bg-orange-300 cursor-not-allowed opacity-70' : 'bg-orange-500 hover:bg-orange-600'}`}
                    >
                      {addBusy ? 'Saving...' : 'Save Item'}
                    </button>
                  </div>
                </form>
              ) : (
                <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); submitRemoveItem(); }}>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800" htmlFor="modal-remove-category">Category</label>
                    <select
                      id="modal-remove-category"
                      value={removeForm.category}
                      onChange={(e) => {
                        const selectedCategory = e.target.value;
                        const items = Array.isArray(menu?.[selectedCategory]) ? menu[selectedCategory] : [];
                        const firstName = items.find((item) => item?.name)?.name || "";
                        setRemoveForm({ category: selectedCategory, productName: firstName });
                      }}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    >
                      <option value="">Select category</option>
                      {categoryList.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800" htmlFor="modal-remove-item">Item</label>
                    {hasRemoveItems ? (
                      <select
                        id="modal-remove-item"
                        value={removeForm.productName}
                        onChange={(e) => setRemoveForm((prev) => ({ ...prev, productName: e.target.value }))}
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                      >
                        <option value="">Select item</option>
                        {removeItemsForCategory.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-2 rounded-lg border border-dashed border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                        No items in this category.
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg bg-red-50 px-3 py-3 text-sm text-red-700">
                    Removing an item deletes it from the offline menu. This action cannot be undone.
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseProductModal}
                      className="rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={removeBusy || !hasRemoveItems || !removeForm.productName}
                      className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors ${removeBusy || !hasRemoveItems || !removeForm.productName ? 'bg-red-300 cursor-not-allowed opacity-70' : 'bg-red-500 hover:bg-red-600'}`}
                    >
                      {removeBusy ? 'Removing...' : 'Remove Item'}
                    </button>
                  </div>
                </form>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
