"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/router";
import * as localData from "@/src/localDataService";
import menuDataJSON from "../data/menuData.json";
import localOrdersJSON from "../data/local-orders.json";

// ✅ Toast Component
function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{ position: "fixed", bottom: 20, right: 20, zIndex: 1000 }}
      className="bg-red-600 text-white px-4 py-2 rounded shadow-lg"
    >
      {message}
    </div>
  );
}

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

// ✅ Status constants
const ACTIVE_STATUSES = ["pending", "confirmed", "accepted", "preparing"];
const READY_BACKEND_STATUSES = ["ready", "delivered"];
const READY_LOCAL_STATUS = "ready";
const PAID_STATUSES = ["paid"];
const ARCHIVED_STATUS = "archived";
const CANCELLED_STATUS = "cancelled";

// ✅ Helper formatters
function formatItems(items) {
  if (!items) return "—";
  if (typeof items === "string") return items;
  if (Array.isArray(items)) {
    return items
      .map((it) => {
        const name = it?.name || "Item";
        const qty = Number(it?.quantity || it?.qty || 1);
        return qty > 1 ? `${name} x${qty}` : name;
      })
      .join(" • ");
  }
  return "—";
}

function getTotal(order) {
  if (!order) return 0;
  const direct = order.total || order.amount;
  if (typeof direct === "number") return direct;
  if (Array.isArray(order.items)) {
    return order.items.reduce((sum, it) => {
      const price = Number(it.price || 0);
      const qty = Number(it.quantity || it.qty || 1);
      return sum + price * qty;
    }, 0);
  }
  return 0;
}

function formatDate(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const hours24 = d.getHours();
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${dd}/${mm}/${yy} ${hours12}:${minutes} ${ampm}`;
}

function formatDuration(startLike, endLike, nowTs = Date.now()) {
  const start = new Date(startLike).getTime();
  const end = endLike ? new Date(endLike).getTime() : nowTs;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "—";
  let secs = Math.floor((end - start) / 1000);
  const h = Math.floor(secs / 3600);
  secs -= h * 3600;
  const m = Math.floor(secs / 60);
  const s = secs - m * 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function getCustomerName(order) {
  return (
    order?.customerName ||
    order?.name ||
    (order?.customer && (order.customer.name || order.customer.fullName)) ||
    ""
  );
}

// Order row component
function OrderRow({ order, tab, now, updateStatus, updateLocalStatus, onToggleExpand }) {
  const isLocal = order?.source === "local";
  const [showCustomerName, setShowCustomerName] = useState(false);
  const durationEnd = order.readyAt || order.paidAt || order.cancelledAt || order.archivedAt;
  const timer = order.acceptedAt ? formatDuration(order.acceptedAt, durationEnd, now) : "—";
  const statusStyle = (() => {
    const s = (order.status || "").toLowerCase();
    const map = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      accepted: "bg-blue-100 text-blue-800",
      preparing: "bg-orange-100 text-orange-800",
      ready: "bg-green-100 text-green-800",
      delivered: "bg-emerald-100 text-emerald-800",
      paid: "bg-emerald-100 text-emerald-800",
      archived: "bg-gray-100 text-gray-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return map[s] || "bg-gray-100 text-gray-700";
  })();
  const onSet = (status) => {
    if (isLocal) return updateLocalStatus(order._id, status);
    return updateStatus(order._id, status);
  };
  const Action = ({ label, title, color, onClick }) => {
    const colorMap = {
      green: "bg-green-100 text-green-800 border border-green-200 hover:bg-green-200 focus:ring-green-300",
      blue: "bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 focus:ring-blue-300",
      emerald: "bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 focus:ring-emerald-300",
      gray: "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 focus:ring-gray-300",
      red: "bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 focus:ring-red-300",
      default: "bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200 focus:ring-gray-300",
    };
    const base =
      "w-[26px] h-[26px] inline-grid place-items-center rounded-full text-[12px] leading-none font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1";
    const tone = colorMap[color] || colorMap.default;
    return (
      <button title={title} aria-label={title} onClick={onClick} className={`${base} ${tone}`}>
        {label === "×" ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : label === "✓" ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          label
        )}
      </button>
    );
  };
  const renderActions = () => {
    const s = (order.status || "").toLowerCase();
    if (tab === "Local") {
      return (
        <>
          <Action label="R" title="Mark Ready" color="green" onClick={() => onSet("ready")} />
          <Action label="P" title="Mark Paid" color="emerald" onClick={() => onSet("paid")} />
          <Action label="A" title="Archive" color="gray" onClick={() => onSet("archived")} />
          <Action label="×" title="Cancel" color="red" onClick={() => onSet("cancelled")} />
        </>
      );
    }
    return (
      <>
        {["pending", "confirmed"].includes(s) && (
          <Action label="✓" title="Accept" color="blue" onClick={() => onSet("accepted")} />
        )}
        {["accepted", "preparing"].includes(s) && (
          <Action label="R" title="Mark Ready" color="green" onClick={() => onSet("ready")} />
        )}
        {["accepted", "ready", "delivered"].includes(s) && (
          <Action label="P" title="Mark Paid" color="emerald" onClick={() => onSet("paid")} />
        )}
        {((s === "paid" || s === "cancelled") || (tab === "Ready" && (s === "ready" || s === "delivered"))) && s !== "archived" && (
          <Action label="A" title="Archive" color="gray" onClick={() => onSet("archived")} />
        )}
        {!["archived", "cancelled"].includes(s) && (
          <Action label="×" title="Cancel" color="red" onClick={() => onSet("cancelled")} />
        )}
      </>
    );
  };
  return (
    <tr className="odd:bg-white even:bg-gray-50 hover:bg-orange-50 transition-colors">
      <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle">
        <div className="relative flex items-center gap-1.5">
          {order.customerNumber ? (
            <a
              href={`tel:${order.customerNumber}`}
              title="Call customer"
              aria-label="Call customer"
              className="w-[26px] h-[26px] inline-grid place-items-center rounded-full bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              onClick={() => setShowCustomerName((v) => !v)}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3.08 5.18 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.72c.12.81.3 1.6.54 2.36a2 2 0 0 1-.45 2.11L9 10a16 16 0 0 0 6 6l.81-1.09a2 2 0 0 1 2.11-.45c.76.24 1.55.42 2.36.54A2 2 0 0 1 22 16.92z" />
              </svg>
            </a>
          ) : (
            <span title="No number" className="w-[26px] h-[26px] inline-grid place-items-center rounded-full bg-gray-100 text-gray-400 border border-gray-200">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3.08 5.18 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.72c.12.81.3 1.6.54 2.36a2 2 0 0 1-.45 2.11L9 10a16 16 0 0 0 6 6l.81-1.09a2 2 0 0 1 2.11-.45c.76.24 1.55.42 2.36.54A2 2 0 0 1 22 16.92z" />
              </svg>
            </span>
          )}
          <span title="Location" aria-label="Location" className="w-[26px] h-[26px] inline-grid place-items-center rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            <svg className="w-3 h-3 transform translate-y-[0.5px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10z" />
              <circle cx="12" cy="11" r="2" />
            </svg>
          </span>
          {showCustomerName && getCustomerName(order) && (
            <div className="absolute left-[60px] top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs whitespace-nowrap shadow-sm pointer-events-none">
              {getCustomerName(order)}
            </div>
          )}
        </div>
      </td>
      <td
        className="px-2.5 py-2.5 border-b border-gray-200 align-middle whitespace-nowrap overflow-hidden cursor-pointer select-none"
        title={formatItems(order.items)}
        onClick={() => onToggleExpand?.(order._id)}
        role="button"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="flex-1 min-w-0 truncate align-middle">{formatItems(order.items)}</span>
          {isLocal && (
            <span className="flex-none w-[18px] h-[18px] inline-grid place-items-center rounded-full bg-black/10 text-neutral-900 border border-black/20 shadow-sm" title="Local order" aria-label="Local order">
              <svg className="w-[8px] h-[8px] transform translate-x-[0.5px] translate-y-[-0.1px]" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3.3 1.5v9h4.4" />
              </svg>
            </span>
          )}
        </span>
      </td>
      <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle font-medium">₹{getTotal(order)}</td>
      <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle">
        <span className="inline-flex items-center gap-2">
          <span className={`h-5 inline-flex items-center px-2 rounded-full text-[10px] font-semibold ${statusStyle}`}>{order.status}</span>
        </span>
      </td>
      <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle">{formatDate(order.createdAt)}</td>
      <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle font-mono tabular-nums">{timer}</td>
      {tab !== "Archived" && (
        <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle">
          <div className="flex items-center gap-1.5 flex-wrap md:flex-nowrap md:justify-end">{renderActions()}</div>
        </td>
      )}
    </tr>
  );
}

export default function AdminPage() {
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
  const [tab, setTab] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('admin:lastTab');
        if (stored && TABS.includes(stored)) return stored;
      } catch (e) {
        console.warn('AdminPage: could not read admin:lastTab', e);
      }
    }
    return "Active";
  });
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const menuDropdownRef = useRef(null);
  const [now, setNow] = useState(Date.now());
  const [shopStatus, setShopStatus] = useState({ isOpen: true });
  const [menu, setMenu] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const fetchingRef = useRef(false);
  const [lazyLoad, setLazyLoad] = useState(false);
  const [toast, setToast] = useState("");
  // Products tab UI state
  const [productSearch, setProductSearch] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showUnavailableOnly, setShowUnavailableOnly] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  // Per-product loading map: key = `${category}::${productName}` => boolean
  const [productBusy, setProductBusy] = useState({});
  const [productMenuKey, setProductMenuKey] = useState(null);
  const productMenuRefs = useRef({});
  const productMenuButtonRefs = useRef({});
  // Per-product offer details toggle state
  const [offerOpen, setOfferOpen] = useState({}); // key: {c, n} => boolean
  // Active bundle/combo rules for products tab
  const [bundleRules, setBundleRules] = useState([]);
  // Add Items modal state
  const [showAddItem, setShowAddItem] = useState(false);
  const [showOffers, setShowOffers] = useState(false);
  const [offersBusy, setOffersBusy] = useState(false);
  const [offerForm, setOfferForm] = useState({
    scope: 'all', // 'all' | 'category' | 'item'
    category: '',
    productName: '',
    type: 'percent', // 'percent' | 'flat'
    amount: ''
  });
  const [offerType, setOfferType] = useState('discount'); // 'discount' | 'bundle' | 'time' | 'loyalty' | 'inventory'
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'remove'
  const [addForm, setAddForm] = useState({
    category: "",
    isNewCategory: false,
    newCategory: "",
    name: "",
    price: "",
    inStock: true,
  });
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
        const all = await localData.getOffersRules();
        setBundleRules((all || []).filter((r) => r && r.active !== false));
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
    try {
      const data = await localData.getMenu();
      setMenu(data);
    } catch (err) {
      console.error("Error fetching menu:", err);
    }
  }, []);

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
      const data = await localData.getMenu();
      setMenu(data);
      setShowAddItem(false);
      setAddForm({ category: "", isNewCategory: false, newCategory: "", name: "", price: "", inStock: true });
      setToast(dup ? "Item updated." : "Item added.");
    } catch (e) {
      setToast(`Failed to add item: ${e.message || e}`);
    } finally {
      setAddBusy(false);
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

      console.log("Backend orders:", backendOrders.length);
      console.log("Local orders:", localOrdersData.length);

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

  const handleEditPrice = async (category, product) => {
    setProductMenuKey(null);
    if (typeof window === 'undefined') return;
    const current = typeof product.price === 'number' ? String(product.price) : '';
    const input = window.prompt(`Update price for ${product.name}`, current);
    if (input === null) return;
    const trimmed = input.trim();
    if (!trimmed) {
      setToast('Price cannot be empty.');
      return;
    }
    const priceValue = Number(trimmed);
    if (Number.isNaN(priceValue) || priceValue < 0) {
      setToast('Enter a valid price.');
      return;
    }
    const key = JSON.stringify({ c: category, n: product.name });
    if (productBusy[key]) return;
    setProductBusy((prev) => ({ ...prev, [key]: true }));
    try {
      await localData.upsertProduct(category, { ...product, name: product.name, price: priceValue });
      await fetchMenu();
      setToast('Price updated.');
    } catch (e) {
      console.error('Edit price error', e);
      setToast(e?.message ? `Failed to update price: ${e.message}` : 'Failed to update price.');
    } finally {
      setProductBusy((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleEditName = async (category, product) => {
    setProductMenuKey(null);
    if (typeof window === 'undefined') return;
    const input = window.prompt(`Rename ${product.name}`, product.name);
    if (input === null) return;
    const trimmed = input.trim();
    if (!trimmed) {
      setToast('Name cannot be empty.');
      return;
    }
    if (trimmed === product.name) {
      return;
    }
    const key = JSON.stringify({ c: category, n: product.name });
    if (productBusy[key]) return;
    setProductBusy((prev) => ({ ...prev, [key]: true }));
    try {
      const menuSnapshot = await localData.getMenu();
      const list = Array.isArray(menuSnapshot?.[category]) ? [...menuSnapshot[category]] : [];
      const dup = list.some((item) => String(item?.name || '').toLowerCase() === trimmed.toLowerCase());
      if (dup) {
        setToast('Another item with that name already exists.');
        return;
      }
      const index = list.findIndex((item) => item?.name === product.name);
      if (index === -1) {
        setToast('Item not found. Refresh and try again.');
        return;
      }
      const updated = { ...list[index], name: trimmed };
      list[index] = updated;
      const updatedMenu = { ...menuSnapshot, [category]: list };
      await localData.saveMenu(updatedMenu);
      await fetchMenu();
      setToast('Name updated.');
    } catch (e) {
      console.error('Edit name error', e);
      setToast(e?.message ? `Failed to update name: ${e.message}` : 'Failed to update name.');
    } finally {
      setProductBusy((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleEditOffer = (category, product) => {
    setProductMenuKey(null);
    router.push({ pathname: '/admin-offers', query: { highlight: product.name, category } });
  };

  const handleRemoveOffer = async (category, product) => {
    setProductMenuKey(null);
    const hasDiscount = typeof product?.originalPrice === 'number' && product.originalPrice > (product.price ?? 0);
    if (!hasDiscount) {
      setToast('No per-item offer detected on this product.');
      return;
    }
    const key = JSON.stringify({ c: category, n: product.name });
    if (productBusy[key]) return;
    setProductBusy((prev) => ({ ...prev, [key]: true }));
    try {
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
    }
  };

  const handleDeleteProduct = async (category, product) => {
    setProductMenuKey(null);
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Delete ${product.name}? This cannot be undone.`);
      if (!confirmed) return;
    }
    const key = JSON.stringify({ c: category, n: product.name });
    if (productBusy[key]) return;
    setProductBusy((prev) => ({ ...prev, [key]: true }));
    try {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, fetchAndFilterOrders]);

  // ✅ Fetch Menu on Products tab
  useEffect(() => {
    if (tab === "Products") {
      fetchMenu();
      // Optionally, auto-enforce bulk chicken OFF respecting overrides:
      // bulkOffChickenWithOverrides({ noConfirm: true, silent: true });
    }
  }, [tab, fetchMenu]);

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
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [tab, orders, localOrders]);

  // ✅ Respect ?tab= in URL on load/navigation
  useEffect(() => {
    const qTab = typeof router?.query?.tab === 'string' ? router.query.tab : undefined;
    if (qTab && TABS.includes(qTab) && qTab !== tab) {
      setTab(qTab);
    }
  }, [router?.query?.tab]);

  // ✅ Tab Change Handler (Updates URL)
  const handleTabChange = (newTab) => {
    if (newTab !== tab) {
      setTab(newTab);
      router.push(
        { query: { ...router.query, tab: newTab } },
        undefined,
        { shallow: true }
      );
    }
  };

  // ✅ Expand/Collapse an order row to show full items
  const toggleExpand = (id) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  };

  // ✅ Logout
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
                  setAddForm((f) => ({
                    category: categoryList[0] || "",
                    isNewCategory: false,
                    newCategory: "",
                    name: "",
                    price: "",
                    inStock: true,
                    isChicken: false,
                  }));
                  setModalMode('add');
                  setShowAddItem(true);
                }}
                className="px-3.5 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
              >
                Add/Remove Items
              </button>
              <button
                onClick={() => {
                  router.push('/admin-offers');
                }}
                className="px-3.5 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
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
                    const bundleMatches = (bundleRules || []).filter(matchesRule);
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
                                onClick={() => typeof window !== 'undefined' && window.open('/admin-offers', '_self')}
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
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Offers Management</h2>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <button
                onClick={() => setShowOffers(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
              >
                Create New Offer
              </button>
            </div>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Current active offers will be displayed here. This feature is under development.
              </div>
            </div>
          </div>
        </div>
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
    </div>
  );
}
