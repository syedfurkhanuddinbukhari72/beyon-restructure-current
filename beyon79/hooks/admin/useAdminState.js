import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';

const TABS = [
  "Active",
  "Ready", 
  "Paid",
  "Archived",
  "Cancelled",
  "Local",
  "KOT",
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

export const useAdminState = () => {
  const router = useRouter();
  
  // Tab state
  const [tab, setTab] = useState("Active");
  const [lazyLoad, setLazyLoad] = useState(false);
  
  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const menuDropdownRef = useRef(null);
  
  // Toast state
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const [showToastVisible, setShowToastVisible] = useState(false);
  
  // Order state
  const [orders, setOrders] = useState([]);
  const [localOrders, setLocalOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  
  // Product state
  const [productSearch, setProductSearch] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showUnavailableOnly, setShowUnavailableOnly] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [productMenuKey, setProductMenuKey] = useState(null);
  const [productEditState, setProductEditState] = useState(() => createEmptyProductEditState());
  const [offerOpen, setOfferOpen] = useState({});
  const [showAddRemoveMenu, setShowAddRemoveMenu] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  
  // Forms
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
  const [removeBusy, setRemoveBusy] = useState(false);
  
  // Confirm modal state
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    busy: false,
    onConfirm: null,
  });
  
  // Shop status
  const [shopStatus, setShopStatus] = useState({ isOpen: false, message: '' });
  
  // Chicken specific state
  const [individualOverrides, setIndividualOverrides] = useState({});
  const [chToast, setChToast] = useState({ message: "", type: "success" });
  const [chShowToast, setChShowToast] = useState(false);
  const chLastClickRef = useRef(0);
  
  // Refs for preventing duplicate operations
  const fetchingRef = useRef(false);
  const messageListenerRef = useRef(null);
  
  // Initialize tab from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('admin:lastTab');
      if (stored && TABS.includes(stored)) setTab(stored);
    } catch (e) {
      console.warn('AdminPage: could not read admin:lastTab', e);
    }
  }, []);
  
  // Persist tab to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('admin:lastTab', tab);
      } catch (e) {
        console.warn('AdminPage: could not persist admin:lastTab', e);
      }
    }
  }, [tab]);
  
  // Handle URL tab parameter
  useEffect(() => {
    const qTab = typeof router?.query?.tab === 'string' ? router.query.tab : undefined;
    if (qTab && TABS.includes(qTab) && qTab !== tab) {
      setTab(qTab);
    }
  }, [router?.query?.tab, tab]);
  
  // Tab change handler
  const handleTabChange = useCallback((newTab) => {
    console.log('[admin-unified] handleTabChange called ->', newTab);
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
  
  // Toast handlers
  const showToast = useCallback((message, type = 'success') => {
    setToast(message);
    setToastType(type);
    setShowToastVisible(true);
    setTimeout(() => setShowToastVisible(false), 3000);
  }, []);
  
  const hideToast = useCallback(() => {
    setShowToastVisible(false);
    setToast("");
    setToastType("success");
  }, []);
  
  // Chicken toast handlers
  const showChToast = useCallback((message, type = 'success') => {
    setChToast({ message, type });
    setChShowToast(true);
    setTimeout(() => setChShowToast(false), 3000);
  }, []);
  
  // Order handlers
  const toggleExpand = useCallback((id) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  }, []);
  
  // Menu handlers
  const handleMenuToggle = useCallback(() => {
    setMenuOpen((v) => !v);
  }, []);
  
  // Product handlers
  const handleProductMenuToggle = useCallback((key) => {
    setProductMenuKey((prev) => (prev === key ? null : key));
  }, []);
  
  const handleToggleOfferView = useCallback((key) => {
    setOfferOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);
  
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
  
  // Update now for timers
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  
  return {
    // Tab state
    tab,
    setTab,
    lazyLoad,
    setLazyLoad,
    handleTabChange,
    
    // Menu state
    menuOpen,
    setMenuOpen,
    menuButtonRef,
    menuDropdownRef,
    handleMenuToggle,
    
    // Toast state
    toast,
    toastType,
    showToastVisible,
    showToast,
    hideToast,
    chToast,
    chShowToast,
    showChToast,
    
    // Order state
    orders,
    setOrders,
    localOrders,
    setLocalOrders,
    loading,
    setLoading,
    fetching,
    setFetching,
    now,
    expandedOrderId,
    toggleExpand,
    fetchingRef,
    
    // Product state
    productSearch,
    setProductSearch,
    showSearchBar,
    setShowSearchBar,
    showUnavailableOnly,
    setShowUnavailableOnly,
    bulkBusy,
    setBulkBusy,
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
    handleProductMenuToggle,
    handleToggleOfferView,
    
    // Forms
    addForm,
    setAddForm,
    removeForm,
    setRemoveForm,
    addBusy,
    setAddBusy,
    removeBusy,
    setRemoveBusy,
    resetAddForm,
    
    // Confirm modal
    confirmState,
    setConfirmState,
    
    // Shop status
    shopStatus,
    setShopStatus,
    
    // Chicken state
    individualOverrides,
    setIndividualOverrides,
    chLastClickRef,
    
    // Message handling
    messageListenerRef,
    
    // Constants
    TABS,
    createEmptyProductEditState,
  };
};
