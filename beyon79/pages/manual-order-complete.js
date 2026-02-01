"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import menuSeed from "../data/menuData.json";
import offersSeed from "../data/offers.json";
import Link from "next/link";
import { useRouter } from "next/router";
import { getMenu, getOffersRules, upsertLocalOrder } from "../src/localDataService";
import ItemsGrid from '../components/manual-order/ItemsGrid';
import CartSheet from '../components/manual-order/CartSheet';
import BillModal from '../components/manual-order/BillModal';
import { getOfferDetails, hasOffer, getActiveDiscountOfferForItem, getRowIndex, isLongOfferText, getOfferItems } from '../utils/manualOrderHelpers';
import { useCartManagement } from '../hooks/useCartManagement';
import { useSearchAndCategory } from '../hooks/useSearchAndCategory';
import { useBillCalculation } from '../hooks/useBillCalculation';

const CART_DRAFT_KEY = "manualOrder:cartDraft";
const CART_META_KEY = "manualOrder:cartMeta";



export default function ManualOrderPage() {
  const [menuData, setMenuData] = useState(menuSeed);
  const [offers, setOffers] = useState(offersSeed);
  const [offersLoaded, setOffersLoaded] = useState(false);
  const [reloadToast, setReloadToast] = useState(null); // transient UI toast when data reloads
  const offersFirstLoadRef = useRef(true);
  const menuFirstLoadRef = useRef(true);
  const reloadToastTimeout = useRef(null);
  const lastMenuHashRef = useRef('');
  const lastOffersHashRef = useRef('');
  // Core UI state hooks stay grouped upfront to avoid temporal dead zones in effects
  const {
    selectedCategory,
    searchMode,
    searchQuery,
    setSelectedCategory,
    setSearchMode,
    setSearchQuery,
    filteredItems,
  } = useSearchAndCategory({ menuData });
  const {
    cart,
    setCart,
    addToCart,
    removeFromCart,
    changeQty,
    changeQtyForReward,
    clearCart,
  } = useCartManagement({ menuData, offers });
  const [customerName, setCustomerName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [resultMsg, setResultMsg] = useState("");
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [focusedItemIdx, setFocusedItemIdx] = useState(null);
  const [billOpen, setBillOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [paperFormat, setPaperFormat] = useState('auto');
  const [expandedOffer, setExpandedOffer] = useState(null);
  const [isPortrait, setIsPortrait] = useState(true);
  const [latestSavedOrder, setLatestSavedOrder] = useState(null);
  const [billSource, setBillSource] = useState('cart'); // 'cart' or 'latest'
  const [dataVersion, setDataVersion] = useState(0); // Force re-render when data changes
  const { totalAmount, billData: currentBillData, computeBillData } = useBillCalculation({ cart, menuData, offers });
  // Selected bill data (either current cart or latest saved order)
  const selectedBillData = useMemo(() => {
    console.log('[selectedBillData] Recalculating bill. Cart items:', cart?.length || 0, 'dataVersion:', dataVersion);
    if (billSource === 'latest' && latestSavedOrder && Array.isArray(latestSavedOrder.fullCart)) {
      return computeBillData(latestSavedOrder.fullCart || []);
    }
    console.log('[selectedBillData] Bill total:', currentBillData.total, 'lines:', currentBillData.lines?.length || 0);
    return currentBillData;
  }, [billSource, latestSavedOrder, currentBillData, computeBillData, dataVersion]);
  const mountedRef = useRef(true);
  const billRef = useRef(null);
  const categoryRefs = useRef({});
  const searchInputRef = useRef(null);
  const touchStart = useRef(null);
  const router = useRouter();

  // Helper: whether the user is typing in an input-like element
  function isTypingInInput() {
    if (typeof document === 'undefined') return false;
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    if (el.isContentEditable) return true;
    return false;
  }

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Keyboard navigation: Shift+C to open cart, arrow keys to navigate cards,
  // Space to cycle category chips. Avoid when typing in inputs.
  useEffect(() => {
    const handleKey = (ev) => {
      try {
        console.log('[manual-order-complete] Key event:', ev.key, 'shift:', ev.shiftKey, 'ctrl:', ev.ctrlKey, 'alt:', ev.altKey, 'meta:', ev.metaKey);
        if (!ev) return;
        // Ignore combos with ctrl/meta/alt
        if (ev.ctrlKey || ev.metaKey || ev.altKey) {
          console.log('[manual-order-complete] Ignoring due to modifier keys');
          return;
        }
        // Allow Shift+C to open cart even when focus is in an input
        const keyLower = (ev.key || '').toLowerCase();
        const isTyping = isTypingInInput();
        console.log('[manual-order-complete] Key:', keyLower, 'isTyping:', isTyping, 'shiftKey:', ev.shiftKey);
        if (!(ev.shiftKey && keyLower === 'c') && isTyping) {
          console.log('[manual-order-complete] Ignoring because typing in input and not Shift+C');
          return;
        }

        // Shift+C -> open cart sheet
        if (ev.shiftKey && (ev.key || '').toLowerCase() === 'c') {
          console.log('[manual-order-complete] Shift+C detected, opening cart sheet');
          ev.preventDefault && ev.preventDefault();
          setCartSheetOpen(true);
          return;
        }

        // Shift+S -> open search and focus input
        if (ev.shiftKey && (ev.key || '').toLowerCase() === 's') {
          ev.preventDefault && ev.preventDefault();
          setSearchMode(true);
          // small delay to ensure input is rendered
          setTimeout(() => {
            try { searchInputRef.current && searchInputRef.current.focus(); } catch (e) {}
          }, 50);
          return;
        }

        // Escape -> exit search mode (when active)
        if ((ev.key || '').toLowerCase() === 'escape') {
          if (searchMode) {
            ev.preventDefault && ev.preventDefault();
            setSearchMode(false);
            setSearchQuery('');
          }
          return;
        }

        // Compute flattened list of visible items (respecting category and search)
        let visibleItems = [];
        if (searchMode && searchQuery) {
          // Search all items across categories
          visibleItems = Object.values(menuData).flat().filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
        } else {
          // Respect selected category
          visibleItems = Object.entries(menuData)
            .filter(([category]) => selectedCategory === 'All' || selectedCategory === category)
            .flatMap(([category, items]) => items);
        }
        visibleItems = visibleItems || [];
        if (!visibleItems || visibleItems.length === 0) return;

        const key = (ev.key || '').toLowerCase();

        // Navigation: arrow keys
        if (key === 'arrowright' || key === 'arrowleft' || key === 'arrowup' || key === 'arrowdown') {
          ev.preventDefault && ev.preventDefault();
          const cardsPerRow = isPortrait ? 2 : 4;
          let idx = typeof focusedItemIdx === 'number' ? focusedItemIdx : 0;
          if (key === 'arrowright') {
            idx = Math.min(visibleItems.length - 1, (idx == null ? 0 : idx) + 1);
          } else if (key === 'arrowleft') {
            idx = Math.max(0, (idx == null ? 0 : idx) - 1);
          } else if (key === 'arrowdown') {
            idx = Math.min(visibleItems.length - 1, (idx == null ? 0 : idx) + cardsPerRow);
          } else if (key === 'arrowup') {
            idx = Math.max(0, (idx == null ? 0 : idx) - cardsPerRow);
          }
          setFocusedItemIdx(idx);
          // focus the corresponding card DOM node
          requestAnimationFrame(() => {
            try {
              const cards = Array.from(document.querySelectorAll('.manual-order-card'));
              const node = cards[idx];
              if (node && typeof node.scrollIntoView === 'function') {
                node.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                // apply focus for accessibility
                node.focus && node.focus();
              }
            } catch (e) {}
          });
          return;
        }

        // Space: move between category chips (cycle forward)
        if (key === ' ' || key === 'spacebar') {
          ev.preventDefault && ev.preventDefault();
          const cats = categories || [];
          if (!cats || cats.length === 0) return;
          const current = cats.indexOf(selectedCategory);
          const next = (current + 1) % cats.length;
          setSelectedCategory(cats[next]);
          // move focus to the category button
          requestAnimationFrame(() => {
            try {
              const el = categoryRefs.current && categoryRefs.current[cats[next]];
              el && el.scrollIntoView && el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              el && el.focus && el.focus();
            } catch (e) {}
          });
          return;
        }
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener('keydown', handleKey, { passive: false });
    return () => window.removeEventListener('keydown', handleKey, { passive: false });
  }, [menuData, selectedCategory, searchMode, searchQuery, focusedItemIdx, isPortrait]);

  const loadMenuData = useCallback(async () => {
    try {
      const storedMenu = await getMenu();
      if (!mountedRef.current) return;
      if (storedMenu && Object.keys(storedMenu).length > 0) {
        setMenuData(storedMenu);
        setDataVersion(v => v + 1); // Force re-render
        // show toast only on subsequent reloads (not initial hydrate)
        if (!menuFirstLoadRef.current) showReloadToast('Menu updated — reloaded');
        menuFirstLoadRef.current = false;
      } else {
        setMenuData(menuSeed);
        if (!menuFirstLoadRef.current) showReloadToast('Menu updated — reloaded');
        menuFirstLoadRef.current = false;
      }
    } catch (err) {
      console.warn("Failed to load menu from local store", err);
      if (mountedRef.current) setMenuData(menuSeed);
      if (!menuFirstLoadRef.current) showReloadToast('Menu updated — reloaded');
      menuFirstLoadRef.current = false;
    }
  }, []);

  const loadOffersData = useCallback(async () => {
    try {
      const storedOffers = await getOffersRules();
      if (!mountedRef.current) return;
      if (Array.isArray(storedOffers)) {
        setOffers(storedOffers);
        setDataVersion(v => v + 1); // Force re-render
        setOffersLoaded(true);
        if (!offersFirstLoadRef.current) showReloadToast('Offers updated — cart recalculated');
        offersFirstLoadRef.current = false;
      } else {
        setOffers(offersSeed);
        setOffersLoaded(true);
        if (!offersFirstLoadRef.current) showReloadToast('Offers updated — cart recalculated');
        offersFirstLoadRef.current = false;
      }
    } catch (err) {
      console.warn("Failed to load offers from local storage", err);
      if (!mountedRef.current) return;
      setOffers(offersSeed);
      setOffersLoaded(true);
      if (!offersFirstLoadRef.current) showReloadToast('Offers updated — cart recalculated');
      offersFirstLoadRef.current = false;
    }
  }, []);

  // Helper to show a small transient reload toast. Clears any previous toast timeout.
  function showReloadToast(msg, ms = 2800) {
    try {
      setReloadToast(msg);
      if (reloadToastTimeout.current) {
        clearTimeout(reloadToastTimeout.current);
        reloadToastTimeout.current = null;
      }
      reloadToastTimeout.current = setTimeout(() => {
        try { setReloadToast(null); } catch (e) { /* noop */ }
        reloadToastTimeout.current = null;
      }, ms);
    } catch (e) {
      // noop
    }
  }

  useEffect(() => {
    loadMenuData();
    loadOffersData();
  }, [loadMenuData, loadOffersData]);

  useEffect(() => {
    const target = categoryRefs.current?.[selectedCategory];
    if (target && typeof target.scrollIntoView === 'function') {
      try {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } catch (e) {
        target.scrollIntoView();
      }
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBroadcast = (event) => {
      const type = event.detail?.type;
      if (type === "menu") loadMenuData();
      if (type === "offers") loadOffersData();
    };

    const handleStorage = (event) => {
      if (event.key === "localData:menu") loadMenuData();
      if (event.key === "localData:offers") loadOffersData();
    };

    const handleFocus = () => {
      loadMenuData();
      loadOffersData();
    };

    // Handle visibility change (when user switches back to this tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[manual-order-complete] Tab became visible, reloading data');
        loadMenuData();
        loadOffersData();
      }
    };

    window.addEventListener("localData:update", handleBroadcast);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // BroadcastChannel fallback for Electron / multi-window reliability
    // (some environments don't reliably deliver storage events across renderer processes)
    let bc;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('localData');
        bc.onmessage = (msg) => {
          try {
            const type = msg?.data?.type;
            console.log('[manual-order-complete] BroadcastChannel message received:', type);
            if (type === 'menu') loadMenuData();
            if (type === 'offers') loadOffersData();
          } catch (e) {
            console.warn('[manual-order-complete] BroadcastChannel error:', e);
          }
        };
      }
    } catch (e) {
      console.warn('[manual-order-complete] BroadcastChannel not available:', e);
    }

    // Initialize refs with current data if not set
    if (!lastMenuHashRef.current) {
      lastMenuHashRef.current = JSON.stringify(menuData);
    }
    if (!lastOffersHashRef.current) {
      lastOffersHashRef.current = JSON.stringify(offers);
    }

    // Polling mechanism: check for actual data changes every 1 second when page is visible
    const pollInterval = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      
      try {
        // Directly check IndexedDB for data changes
        const currentMenu = await getMenu();
        const currentOffers = await getOffersRules();
        
        const currentMenuHash = JSON.stringify(currentMenu);
        const currentOffersHash = JSON.stringify(currentOffers);
        
        if (currentMenuHash !== lastMenuHashRef.current) {
          console.log('[manual-order-complete] Menu data changed (polling detected), reloading');
          lastMenuHashRef.current = currentMenuHash;
          if (mountedRef.current) {
            setMenuData(currentMenu || menuSeed);
            setDataVersion(v => v + 1); // Force re-render
            showReloadToast('Menu updated - prices synced');
          }
        }
        
        if (currentOffersHash !== lastOffersHashRef.current) {
          console.log('[manual-order-complete] Offers data changed (polling detected), reloading');
          lastOffersHashRef.current = currentOffersHash;
          if (mountedRef.current) {
            setOffers(Array.isArray(currentOffers) ? currentOffers : offersSeed);
            setDataVersion(v => v + 1); // Force re-render
            showReloadToast('Offers updated - cart synced');
          }
        }
      } catch (e) {
        console.warn('[manual-order-complete] Polling error:', e);
      }
    }, 1000);

    return () => {
      window.removeEventListener("localData:update", handleBroadcast);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(pollInterval);
      try { bc && bc.close(); } catch (e) {}
    };
  }, [loadMenuData, loadOffersData]);
  // Utility: Get set of item names with active offers (discount/category/item or bundle/combo)
  // Memoize offer items for badge
  const offerItems = useMemo(() => getOfferItems(menuData, offers), [menuData, offers]);
  const categories = useMemo(() => ["All", ...Object.keys(menuData)], [menuData]);

  // Keyboard navigation handler for the items grid. Supports Arrow keys and
  // moves focus among `.manual-order-card` elements. Uses columns = 2 in
  // portrait mode and 4 otherwise to make ArrowUp/Down behave as expected.
  const handleGridKeyDown = useCallback((e) => {
    try {
      const key = e.key;
      if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(key)) return;

      const cards = Array.from(document.querySelectorAll('.manual-order-card')).filter((c) => c && c.tabIndex >= 0);
      if (!cards || cards.length === 0) return;

      const cols = isPortrait ? 2 : 4;
      const active = document.activeElement;
      let idx = cards.indexOf(active);
      // If nothing focused in grid, default to first
      if (idx === -1) idx = 0;

      if (key === 'ArrowRight') idx = Math.min(cards.length - 1, idx + 1);
      if (key === 'ArrowLeft') idx = Math.max(0, idx - 1);
      if (key === 'ArrowDown') idx = Math.min(cards.length - 1, idx + cols);
      if (key === 'ArrowUp') idx = Math.max(0, idx - cols);

      const target = cards[idx];
      if (target) {
        e.preventDefault();
        // Focus and make visually obvious (onFocus handler will also add class)
        try { target.focus(); } catch (err) {}
        try { target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch (err) {}
      }
    } catch (err) {
      console.warn('[manual-order-complete] grid key handler error', err);
    }
  }, [isPortrait]);

  // Touch handlers for swipe gestures
  const handleTouchStart = useCallback((event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((event) => {
    if (!touchStart.current || event.changedTouches.length !== 1) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    const dt = Date.now() - touchStart.current.time;
    const minDistance = 50;
    if (dt > 450 || Math.abs(dx) < minDistance || Math.abs(dx) < Math.abs(dy)) return;
    const currentIndex = categories.indexOf(selectedCategory);
    if (currentIndex === -1) return;
    if (dx < 0 && currentIndex < categories.length - 1) {
      setSelectedCategory(categories[currentIndex + 1]);
    } else if (dx > 0 && currentIndex > 0) {
      setSelectedCategory(categories[currentIndex - 1]);
    }
    touchStart.current = null;
  }, [categories, selectedCategory, setSelectedCategory]);



  useEffect(() => {
    function handleResize() {
      setIsPortrait(window.innerHeight > window.innerWidth);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  const cartItems = useMemo(() => {
    const rewardsByOffer = {};
    for (const it of cart) {
      if (it.isOfferReward) {
        (rewardsByOffer[it.offerId] = rewardsByOffer[it.offerId] || []).push(it);
      }
    }

    const items = [];
    cart
      .filter((it) => !it.isOfferReward)
      .forEach((item, idx) => {
        const discountOffer = getActiveDiscountOfferForItem(item, menuData, offers);
        let discount = 0;
        let discountedPrice = item.price;
        let offerLabel = null;
        if (discountOffer) {
          const { type, amount } = discountOffer;
          if (type === "percent") {
            discount = Math.round((item.price * amount) / 100);
            discountedPrice = item.price - discount;
            offerLabel = `${amount}% off`;
          } else if (type === "flat") {
            discount = amount;
            discountedPrice = item.price - discount;
            offerLabel = `₹${amount} off`;
          }
          if (discountedPrice < 0) discountedPrice = 0;
        }

        const linkedOffers = offers.filter(o => o.active && o.type === 'buy_x_get_y' && o.base?.match?.name === item.name);

        let groupsConsumedTotal = 0;
        const rewardDisplays = [];
        for (const ofr of linkedOffers) {
          const rewardEntries = rewardsByOffer[ofr.id] || [];
          const totalAppliedRewards = rewardEntries.reduce((s, r) => s + (r.quantity || 0), 0);
          const perRewardQty = ofr.reward?.items?.[0]?.quantity || 1;
          const req = ofr.base?.quantity || 1;
          const groupsConsumed = Math.floor(totalAppliedRewards / perRewardQty) * req;
          groupsConsumedTotal += groupsConsumed;
          for (const r of rewardEntries) {
            rewardDisplays.push(`${r.quantity} x ${r.name} @ ₹${r.offerPrice ?? 0}`);
          }
        }

        const consumed = Math.min(item.quantity || 0, groupsConsumedTotal);
        const leftover = Math.max(0, (item.quantity || 0) - consumed);

        const hasItemOffer = hasOffer(item, offers, menuData);

        if (consumed > 0) {
          let rewardUnitPrice = 0;
          let rewardCount = 0;
          for (const ofr of linkedOffers) {
            const rewardEntries = rewardsByOffer[ofr.id] || [];
            const totalAppliedRewards = rewardEntries.reduce((s, r) => s + (r.quantity || 0), 0);
            rewardCount += totalAppliedRewards;
            const rewardDef = ofr.reward?.items?.[0];
            if (!rewardUnitPrice && rewardDef && typeof rewardDef.price === 'number') {
              rewardUnitPrice = rewardDef.price;
            }
          }
          const chargeAmount = (rewardUnitPrice || 0) * (rewardCount || 0);

          items.push({
            key: `group-${idx}`,
            className: `py-2 flex items-center justify-between gap-2 ${hasItemOffer ? 'border-l-4 border-yellow-500 bg-yellow-50' : ''}`,
            name: item.name,
            isConsumed: true,
            isReward: false,
            rewardDisplays,
            discount: 0,
            offerLabel: null,
            originalPrice: item.price,
            discountedPrice,
            quantity: consumed,
            price: discountedPrice,
            chargeAmount,
            onDecrease: () => changeQty(item.name, -1),
            onIncrease: () => changeQty(item.name, 1),
            onRemove: () => changeQty(item.name, -consumed),
          });
        }

        if (leftover > 0) {
          items.push({
            key: `leftover-${idx}`,
            className: `py-2 flex items-center justify-between gap-2 ${hasItemOffer ? '' : ''}`,
            name: item.name,
            isConsumed: false,
            isReward: false,
            rewardDisplays: [],
            discount,
            offerLabel,
            originalPrice: item.price,
            discountedPrice,
            quantity: leftover,
            price: discountedPrice,
            chargeAmount: 0,
            onDecrease: () => changeQty(item.name, -1),
            onIncrease: () => changeQty(item.name, 1),
            onRemove: () => changeQty(item.name, -leftover),
          });
        }

        for (const ofr of linkedOffers) {
          const rewardEntries = rewardsByOffer[ofr.id] || [];
          for (const r of rewardEntries) {
            items.push({
              key: `reward-${ofr.id}-${r.name}-${idx}`,
              className: "py-2 pl-6 flex items-center justify-between gap-2 bg-green-50",
              name: r.name,
              isConsumed: false,
              isReward: true,
              rewardDisplays: [],
              discount: 0,
              offerLabel: null,
              originalPrice: r.price,
              discountedPrice: r.price,
              quantity: r.quantity,
              price: r.price,
              chargeAmount: 0,
              offerPrice: r.offerPrice,
              onDecrease: () => changeQtyForReward(r.name, ofr.id, -1),
              onIncrease: () => changeQtyForReward(r.name, ofr.id, 1),
              onRemove: () => removeFromCart(r),
            });
          }
        }
      });
    return items;
  }, [cart, menuData, offers, changeQty, changeQtyForReward, removeFromCart]);

  // Load latest saved order from localStorage — hydrate cart only after offers have loaded
  useEffect(() => {
    if (!offersLoaded) return; // wait for offers before syncing rewards
    if (typeof window === 'undefined') return;
    try {
      const rawSaved = localStorage.getItem('manual_latest_order');
      if (rawSaved) setLatestSavedOrder(JSON.parse(rawSaved));
    } catch (e) {
      console.warn('ManualOrder: could not load manual_latest_order', e);
    }

    // hydrate cart draft/meta
    try {
      const rawCart = localStorage.getItem(CART_DRAFT_KEY);
      const rawMeta = localStorage.getItem(CART_META_KEY);
      if (rawCart) {
        const parsedCart = JSON.parse(rawCart);
        if (Array.isArray(parsedCart) && parsedCart.length > 0) {
          const sanitized = parsedCart
            .filter((item) => item && typeof item.name === 'string')
            .map((item) => ({
              name: item.name,
              price: Number(item.price ?? 0),
              quantity: Number(item.quantity ?? 0) || 0,
              isOfferReward: !!item.isOfferReward,
              offerPrice: typeof item.offerPrice === 'number' ? item.offerPrice : undefined,
              offerId: item.offerId,
            }))
            .filter((item) => item.quantity > 0);
          if (sanitized.length > 0) {
            setCart(sanitized);
          }
        }
      }
      if (rawMeta) {
        const parsedMeta = JSON.parse(rawMeta);
        if (parsedMeta && typeof parsedMeta === 'object') {
          setCustomerName(parsedMeta.customerName || "");
          setCustomerNumber(parsedMeta.customerNumber || "");
          setNote(parsedMeta.note || "");
          if (parsedMeta.selectedCategory && Object.prototype.hasOwnProperty.call(menuData, parsedMeta.selectedCategory)) {
            setSelectedCategory(parsedMeta.selectedCategory);
          }
        }
      }
    } catch (e) {
      console.warn('ManualOrder: could not hydrate cart draft', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offersLoaded]);




  // Lock background scroll when cart sheet is open (must be after all useState)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (cartSheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      if (typeof window !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [cartSheetOpen]);

  // cleanup reload toast timer on unmount
  useEffect(() => {
    return () => {
      try {
        if (reloadToastTimeout.current) {
          clearTimeout(reloadToastTimeout.current);
          reloadToastTimeout.current = null;
        }
      } catch (e) {}
    };
  }, []);



  const handleDownload = async () => {
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const node = billRef.current || document.querySelector('.printable-bill');
      if (!node) throw new Error('Bill element not found');
      const canvas = await html2canvas(node, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');

      // If thermal 80mm selected, create PDF with mm units and width 80mm
      if (paperFormat === 'thermal-80') {
        const widthMm = 80; // target width
        // convert canvas px height to mm (assume 96 DPI for conversion)
        const pxToMm = (px) => (px * 25.4) / 96;
        const heightMm = Math.max(30, Math.round(pxToMm(canvas.height)));
        const pdf = new jsPDF({ unit: 'mm', format: [widthMm, heightMm] });
        pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
        pdf.save(`bill-${Date.now()}.pdf`);
      } else if (paperFormat === 'a4') {
        // For A4, create PDF at canvas px size (safer) — jsPDF accepts px if unit 'px'
        const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`bill-${Date.now()}.pdf`);
      } else {
        // Auto/default: preserve canvas pixel dimensions
        const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`bill-${Date.now()}.pdf`);
      }
    } catch (e) {
      console.error('Download PDF error', e);
      alert('Could not generate PDF: ' + (e.message || e));
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => { window.print(); };

// ---------------- ORDER HANDLER ----------------
  const placeOrder = async () => {
    if (placing) return; // Prevent double submit
    if (cart.length === 0) {
      setResultMsg("⚠️ Please add items to cart first.");
      return;
    }
    if (customerNumber && !/^[0-9]{10}$/.test(customerNumber)) {
      setResultMsg("⚠️ Invalid phone number. Must be 10 digits.");
      setPlacing(false);
      return;
    }

    setPlacing(true);
    setResultMsg("");

    try {
      const orderPayload = {
        items: cart.map((i) => ({ name: i.name, price: i.price, qty: i.quantity })),
        ...(customerName ? { customerName } : {}),
        ...(customerNumber && /^[0-9]{10}$/.test(customerNumber)
          ? { customerNumber }
          : {}),
        note,
        status: "preparing", // 🔥 KEY: Promote manual orders directly to KOT state
        total: totalAmount,
        createdAt: new Date().toISOString(),
        source: "local",
      };

      // ✅ FIXED: Ensure manual order HAS items (critical for KOT)
      const orderToSave = {
        ...orderPayload,
        items: Array.isArray(orderPayload.items) ? orderPayload.items : cart,
        total: orderPayload.total ?? totalAmount,
        source: 'local',
        status: 'preparing' // 🔥 KEY: Promote manual orders directly to KOT state
      };

      // Save order locally using localDataService
      const savedOrder = await upsertLocalOrder(orderToSave);

      setResultMsg("✅ Order created successfully. Redirecting...");
      setTimeout(() => {
        // Persist latest manual order (snapshot)
        try {
          const snapshot = { fullCart: cart, customerName, customerNumber, note, createdAt: new Date().toISOString(), id: savedOrder._id };
          if (typeof window !== 'undefined') {
            localStorage.setItem('manual_latest_order', JSON.stringify(snapshot));
          }
          setLatestSavedOrder(snapshot);
        } catch (e) {
          console.warn('Could not persist latest order', e);
        }

        clearCart();
        setCustomerName("");
        setCustomerNumber("");
        setNote("");
        try {
          localStorage.removeItem(CART_DRAFT_KEY);
          localStorage.removeItem(CART_META_KEY);
        } catch (e) {
          console.warn('ManualOrder: could not clear cart draft', e);
        }
        router.push("/admin-unified?tab=Local");
      }, 1500);
    } catch (err) {
      console.error("Order creation error:", err);
      setResultMsg(`❌ Error: ${err.message || "Could not create order"}`);
    } finally {
      setPlacing(false);
    }
  };

  // Local Shift+Enter handler to trigger place order directly
  useEffect(() => {
    const handleShiftEnter = async (ev) => {
      if ((ev.key || '').toLowerCase() !== 'enter') return;
      if (!ev.shiftKey || ev.altKey || ev.ctrlKey || ev.metaKey) return;
      if (!cartSheetOpen) return;
      ev.preventDefault();
      try {
        await placeOrder();
        setCartSheetOpen(false);
      } catch (error) {
        console.warn('[manual-order-complete] Shift+Enter place order failed', error);
      }
    };
    window.addEventListener('keydown', handleShiftEnter, { capture: false });
    return () => window.removeEventListener('keydown', handleShiftEnter, { capture: false });
  }, [cartSheetOpen, placeOrder]);

  // Global keyboard shortcut handler (postMessage)
  useEffect(() => {
    const handleMessage = (e) => {
      try {
        const d = e.data;
        if (!d || d.type !== 'beyon:app-shortcut') return;
        const payload = d.payload || {};
        try {
          console.log('[manual-order-complete] received beyon:app-shortcut', {
            payload,
            ts: Date.now(),
            adminLast: window.__admin_lastOpenCart || null,
            adminFlag: window.__admin_openCartPostedFlag || null,
          });
        } catch (e) {}
        const action = payload.action;
        if (!action) return;
        switch (action) {
          case 'open_bill':
            console.log('[manual-order-complete] open_bill -> opening bill');
            router.push('/bill');
            break;
          case 'open_cart':
            console.log('[manual-order-complete] open_cart -> opening cart sheet');
            setCartSheetOpen(true);
            break;
          case 'print_current':
            console.log('[manual-order-complete] print_current -> triggering print');
            if (selectedBillData && selectedBillData.lines && selectedBillData.lines.length > 0) {
              console.log('Printing current bill data:', selectedBillData);
              router.push('/bill?print=true');
            }
            break;
          case 'place_order':
            console.log('[manual-order-complete] place_order shortcut received');
            (async () => {
              try {
                await placeOrder();
                setCartSheetOpen(false);
              } catch (err) {
                console.warn('[manual-order-complete] place_order shortcut failed', err);
              }
            })();
            break;
          default:
            break;
        }
      } catch (err) {
        console.warn('[manual-order-complete] handleMessage error', err);
      }
    };

    try {
      const qs = (typeof window !== 'undefined' && window.location && window.location.search) || '';
      if (qs && qs.indexOf('openCart=1') !== -1) {
        console.log('[manual-order-complete] query openCart=1 detected, opening cart sheet');
        setCartSheetOpen(true);
      }
    } catch (e) {}

    window.addEventListener('message', handleMessage);
    try {
      window.__manual_dev_helpers = window.__manual_dev_helpers || {};
      window.__manual_dev_helpers.simulateOpenCart = function () {
        try {
          console.log('[manual-order-complete] simulateOpenCart() posting test beyon:app-shortcut');
          window.postMessage({ type: 'beyon:app-shortcut', payload: { action: 'open_cart' } }, '*');
        } catch (e) {
          console.warn('simulateOpenCart failed', e);
        }
      };
    } catch (e) {}

    return () => window.removeEventListener('message', handleMessage);
  }, [router, selectedBillData, placeOrder]);

  // ---------------- UI ----------------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (cart.length > 0) {
        const payload = cart.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          isOfferReward: item.isOfferReward,
          offerPrice: item.offerPrice,
          offerId: item.offerId,
        }));
        localStorage.setItem(CART_DRAFT_KEY, JSON.stringify(payload));
      } else {
        localStorage.removeItem(CART_DRAFT_KEY);
      }
    } catch (e) {
      console.warn('ManualOrder: could not persist cart draft', e);
    }
  }, [cart]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const meta = {
        customerName,
        customerNumber,
        note,
        selectedCategory,
      };
      const hasMeta = Object.entries(meta).some(([key, val]) => {
        if (key === 'selectedCategory') return val !== 'All';
        return typeof val === 'string' && val.trim() !== '';
      });
      if (hasMeta) {
        localStorage.setItem(CART_META_KEY, JSON.stringify(meta));
      } else {
        localStorage.removeItem(CART_META_KEY);
      }
    } catch (e) {
      console.warn('ManualOrder: could not persist cart meta', e);
    }
  }, [customerName, customerNumber, note, selectedCategory]);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Reload toast (shows briefly when menu/offers are reloaded) */}
      {reloadToast && (
        <div style={{ position: 'fixed', right: 16, top: 16, zIndex: 80 }} aria-live="polite">
          <div style={{ background: 'rgba(0,0,0,0.85)', color: 'white', padding: '8px 12px', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', fontSize: 14, fontWeight: 600, transition: 'transform .18s ease, opacity .18s ease', transform: 'translateY(0)', opacity: 1 }}>
            {reloadToast}
          </div>
        </div>
      )}

      {/* Keyboard focus styling override: ensure keyboard-focused cards show a black border */}
      <style>{`
        .manual-order-card.keyboard-focused { border-color: #000 !important; }
        .manual-order-card:focus { border-color: #000 !important; outline: none; }
      `}</style>
      <div className="mx-auto w-full max-w-[1280px] px-4 py-4">
        {/* Header: chevron integrated with filter chips */}
  <nav className="flex items-center mb-3">
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="horizontal-scroll pl-3 flex items-center">
              {searchMode ? (
                <>
                  <Link
                    href="/admin-unified"
                    className="inline-flex items-center justify-center px-3.5 py-2 mr-2 mb-2 rounded-full text-[0.95rem] font-medium bg-gray-200 text-black hover:bg-gray-300 border border-black focus:outline-none focus:ring-1 focus:ring-orange-300"
                    title="Back to Admin"
                    aria-label="Back to Admin"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </Link>
                  <div className="flex items-center gap-2 mr-2 mb-2 flex-1 min-w-0">
                    <div className="relative flex-1 min-w-0">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="7"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                      <input
                        value={searchQuery}
                        ref={searchInputRef}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            if (filteredItems.length > 0) {
                              setFocusedItemIdx(0);
                              requestAnimationFrame(() => {
                                const cards = document.querySelectorAll('.manual-order-card');
                                if (cards[0]) {
                                  cards[0].focus();
                                  cards[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              });
                            }
                          } else if (e.key === "Enter") {
                            e.preventDefault();
                            if (focusedItemIdx >= 0 && filteredItems[focusedItemIdx]) {
                              addToCart(filteredItems[focusedItemIdx]);
                            }
                          } else if (e.key === "Escape") {
                            setSearchMode(false);
                            setSearchQuery("");
                          }
                        }}
                        placeholder="Search items..."
                        className="w-full bg-white border border-gray-300 rounded-full pl-9 pr-3 py-2 text-sm outline-none focus:border-orange-400 text-black placeholder:text-gray-400"
                      />
                    </div>
                    <button
                      className="px-3 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300"
                      onClick={() => {
                        setSearchMode(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/admin-unified"
                    className="inline-flex items-center justify-center px-3.5 py-2 mr-2 mb-2 rounded-full text-[0.95rem] font-medium bg-gray-200 text-black hover:bg-gray-300 border border-black focus:outline-none focus:ring-1 focus:ring-orange-300"
                    title="Back to Admin"
                    aria-label="Back to Admin"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </Link>
                  <button
                    onClick={() => setSearchMode(true)}
                    className="inline-flex items-center justify-center px-3.5 py-2 mr-2 mb-2 rounded-full text-[0.95rem] font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300"
                    title="Search"
                    aria-label="Search"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <circle cx="11" cy="11" r="7"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      ref={(el) => {
                        if (el) categoryRefs.current[category] = el;
                      }}
                      className={`px-3.5 py-2 mr-2 mb-2 rounded-full text-[0.95rem] font-medium transition-colors whitespace-nowrap ${
                        selectedCategory === category
                          ? "bg-orange-500 text-white border border-black"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      }`}
                      title={category}
                    >
                      {category}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </nav>

        <div className="grid grid-cols-1 gap-6">
          {/* Items */}
          <div>
            <ItemsGrid
              filteredItems={filteredItems}
              isPortrait={isPortrait}
              offerItems={offerItems}
              expandedOffer={expandedOffer}
              menuData={menuData}
              offers={offers}
              cartSheetOpen={cartSheetOpen}
              onAddToCart={addToCart}
              onExpandOffer={setExpandedOffer}
              onGridKeyDown={handleGridKeyDown}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              cardStyles={filteredItems.map(() => ({}))}
            />
          </div>

          {/* Removed old sidebar cart; cart is now in bottom sheet */}
        </div>
      </div>

      {/* Bottom Navigation (staff footer) */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex justify-around items-center z-50 h-16"
        style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
      >
        {/* History (left) */}
        <Link href="/manual-orders" className="flex flex-col items-center gap-1 text-gray-600" aria-label="History">
          <span className="text-2xl">🕘</span>
          <span className="text-xs font-medium">History</span>
        </Link>

        {/* Bill (center) and Cart (right) */}
        <button
          type="button"
          onClick={() => router.push('/bill')}
          className="flex flex-col items-center gap-1 text-gray-600"
          aria-label="Open bill"
        >
          <span className="text-2xl">🧾</span>
          <span className="text-xs font-medium">Bill</span>
        </button>

        {/* Cart (right) opens in-page sheet */}
        <button
          type="button"
          onClick={() => setCartSheetOpen(true)}
          className="flex flex-col items-center gap-1 relative text-gray-600"
          aria-label="Open cart"
        >
          <span className="text-2xl relative">🛒</span>
          <span className="text-xs font-medium">Cart</span>
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {cart.reduce((s, it) => s + (it.quantity || 0), 0)}
            </span>
          )}
        </button>
      </nav>

      <CartSheet
        open={cartSheetOpen}
        cartItems={cartItems}
        totalAmount={totalAmount}
        customerName={customerName}
        customerNumber={customerNumber}
        note={note}
        placing={placing}
        resultMsg={resultMsg}
        onChangeCustomerName={setCustomerName}
        onChangeCustomerNumber={setCustomerNumber}
        onChangeNote={setNote}
        onClearCart={clearCart}
        onPlaceOrder={placeOrder}
        onClose={() => setCartSheetOpen(false)}
      />

      {/*
      <BillModal
        open={billOpen}
        billRef={billRef}
        billData={selectedBillData}
        billSource={billSource}
        paperFormat={paperFormat}
        downloading={downloading}
        onChangeBillSource={setBillSource}
        onChangePaperFormat={setPaperFormat}
        onDownload={handleDownload}
        onPrint={handlePrint}
        onClose={() => setBillOpen(false)}
      />
      */}
    </div>
  );
  // Keyboard shortcuts for cart when open
  useEffect(() => {
    if (!cartSheetOpen) return;

    const handleCartKey = async (ev) => {
      try {
        console.log('[manual-order-complete] cart key event:', ev.key, 'ctrl:', ev.ctrlKey, 'isTyping:', isTypingInInput());

      const isTyping = isTypingInInput();
      if (isTyping) {
        console.log('[manual-order-complete] Ignoring cart key because typing in input');
        return;
      }

      if (ev.key === 'Enter' && !ev.ctrlKey && !ev.shiftKey && !ev.altKey && !ev.metaKey) {
        console.log('[manual-order-complete] Enter pressed, calling placeOrder');
        ev.preventDefault();
        await placeOrder();
        setCartSheetOpen(false);
      } else if (ev.key === 'Enter' && ev.ctrlKey) {
        console.log('[manual-order-complete] Ctrl+Enter pressed, calling placeOrder');
        ev.preventDefault();
        await placeOrder();
        setCartSheetOpen(false);
      } else if (ev.key === 'Escape') {
          console.log('[manual-order-complete] Escape pressed, closing cart');
          ev.preventDefault();
          setCartSheetOpen(false);
        }
      } catch (e) {
        console.log('[manual-order-complete] handleCartKey error', e);
      }
    };

    console.log('[manual-order-complete] attaching cart key listener');
    window.addEventListener('keydown', handleCartKey, { passive: false });
    return () => {
      console.log('[manual-order-complete] removing cart key listener');
      window.removeEventListener('keydown', handleCartKey, { passive: false });
    };
  }, [cartSheetOpen, placeOrder]);

}
