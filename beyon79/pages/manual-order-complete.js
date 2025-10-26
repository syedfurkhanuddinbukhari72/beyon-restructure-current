"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import menuSeed from "../data/menuData.json";
import offersSeed from "../data/offers.json";
import Link from "next/link";
import { useRouter } from "next/router";
import { getMenu, getOffersRules, upsertLocalOrder } from "../src/localDataService";

const CART_DRAFT_KEY = "manualOrder:cartDraft";
const CART_META_KEY = "manualOrder:cartMeta";

// Helper: get the currently active discount offer for an item from current offers (not offer history)
function getActiveDiscountOfferForItem(item, menuData, offersJson) {
  let activeOffer = null;
  for (const offer of offersJson) {
    if (!offer.active) continue;
    if (offer.type === "discount") {
      const { scope, category, item: offerItem } = offer;
      const applies =
        scope === "all" ||
        (scope === "category" && category && menuData[category]?.some((it) => it.name === item.name)) ||
        (scope === "item" && offerItem === item.name);
      if (applies) {
        activeOffer = offer;
        break;
      }
    }
  }
  return activeOffer;
}

// Helper: check if an item has an offer
function hasOffer(item, offersJson, menuData) {
  return getOfferDetails(item, offersJson, menuData) !== "Offer details unavailable.";
}

// Helper: get offer details string for an item
function getOfferDetails(item, offersJson, menuData) {
  // Check for discount offers (items with originalPrice)
  if (typeof item.originalPrice === 'number' && item.originalPrice > item.price) {
    const discount = item.originalPrice - item.price;
    return `₹${discount} off (₹${item.originalPrice} → ₹${item.price})`;
  }

  const bundleOffers = (offersJson || []).filter((rule) => {
    if (!rule.active) return false;
    const nameEq = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
    if (rule.type === 'buy_x_get_y') {
      const baseMatch = rule.base && rule.base.match ? (
        (rule.base.match.name ? nameEq(rule.base.match.name, item.name) : false)
      ) : false;
      const rewardMatch = (rule.reward?.items || []).some((r) => nameEq(r.name, item.name));
      return baseMatch || rewardMatch;
    }
    if (rule.type === 'fixed_combo_price') {
      const reqs = Array.isArray(rule.required) ? rule.required : [];
      return reqs.some((r) => nameEq(r.name, item.name));
    }
    return false;
  });
  if (bundleOffers.length > 0) {
    return bundleOffers.map((r) => {
      if (r.type === 'buy_x_get_y') {
        return `Buy ${r.base?.quantity || 0} x ${r.base?.match?.name || r.base?.match?.category || 'item'} → Get ${r.reward?.items?.[0]?.quantity || 1} x ${r.reward?.items?.[0]?.name} @ ₹${r.reward?.items?.[0]?.price ?? 0}`;
      }
      if (r.type === 'fixed_combo_price') {
        return `Combo: ₹${r.price} — Required: ${(r.required || []).map((x) => x.name || x.category).join(', ')}`;
      }
      return 'Bundle/Combo offer';
    }).join('\n');
  }
  return "Offer details unavailable.";
}

// Helper: check if text is long for the popup (portrait mode)
function isLongOfferText(text, maxChars = 60) {
  return text && text.length > maxChars;
}

function OfferBadge({ item, offersJson, menuData, onExpand, isExpanded, isTall }) {
  const details = getOfferDetails(item, offersJson, menuData);
  return (
    <>
      <div className="absolute left-2 bottom-2 z-10">
        <button
          type="button"
          className="bg-yellow-50 text-yellow-500 border border-yellow-300 rounded-full px-2 py-0.5 text-lg font-bold shadow hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          style={{ minWidth: 28, minHeight: 28, lineHeight: 1 }}
          onClick={(e) => {
            e.stopPropagation();
            onExpand(item.name);
          }}
          title="Offer Applied"
          aria-label="Offer Applied"
        >
          ☆
        </button>
      </div>
      {isExpanded && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center transition-all duration-200 ease-in-out"
          style={{animation: 'fadeInScale 0.18s'}}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full h-full bg-gray-200/80 backdrop-blur-sm border border-gray-300 rounded-lg shadow-lg flex flex-col items-center justify-center px-4 py-3 text-gray-800 text-sm relative transition-all duration-200 ease-in-out" style={{ animation: 'fadeInScale 0.18s', minHeight: 120 }}>
            <div className="bg-gray-100 text-gray-900 rounded px-3 py-2 mb-6 text-center text-sm font-medium shadow-sm border border-gray-300 max-w-xs mx-auto whitespace-pre-line">
              {details}
            </div>
            <button
              className="absolute right-3 bottom-3 bg-gray-100 text-gray-700 border border-gray-300 rounded-full w-7 h-7 flex items-center justify-center shadow hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 text-lg"
              style={{lineHeight:1}}
              onClick={(e) => {
                e.stopPropagation();
                onExpand(null);
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <style jsx>{`
            @keyframes fadeInScale {
              0% { opacity: 0; transform: scale(0.95); }
              100% { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

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
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [resultMsg, setResultMsg] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [focusedItemIdx, setFocusedItemIdx] = useState(null);
  const [billOpen, setBillOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [paperFormat, setPaperFormat] = useState('auto');
  const [expandedOffer, setExpandedOffer] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [isPortrait, setIsPortrait] = useState(true);
  const [latestSavedOrder, setLatestSavedOrder] = useState(null);
  const [billSource, setBillSource] = useState('cart'); // 'cart' or 'latest'
  const [dataVersion, setDataVersion] = useState(0); // Force re-render when data changes
  // Selected bill data (either current cart or latest saved order)
  const selectedBillData = useMemo(() => {
    console.log('[selectedBillData] Recalculating bill. Cart items:', cart?.length || 0, 'dataVersion:', dataVersion);
    if (billSource === 'latest' && latestSavedOrder && Array.isArray(latestSavedOrder.fullCart)) {
      return computeBillData(latestSavedOrder.fullCart || []);
    }
    const billData = computeBillData(cart || []);
    console.log('[selectedBillData] Bill total:', billData.total, 'lines:', billData.lines?.length || 0);
    return billData;
  }, [billSource, latestSavedOrder, cart, menuData, offers, dataVersion]);
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

  // Global keyboard shortcut handler (postMessage)
  useEffect(() => {
    const handleMessage = (e) => {
      try {
        const d = e.data;
        if (!d || d.type !== 'beyon:app-shortcut') return;
        const payload = d.payload || {};
        try { console.log('[manual-order-complete] received beyon:app-shortcut', { payload, ts: Date.now(), adminLast: window.__admin_lastOpenCart || null, adminFlag: window.__admin_openCartPostedFlag || null }); } catch (e) {}
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
            // Trigger print for the current bill
            if (selectedBillData && selectedBillData.lines && selectedBillData.lines.length > 0) {
              // Simulate print action - in a real app, this would call a print function
              console.log('Printing current bill data:', selectedBillData);
            // For now, just open the bill page with print=true to trigger print
            router.push('/bill?print=true');
            }
            break;
          default:
            break;
        }
      } catch (err) {
        console.warn('[manual-order-complete] handleMessage error', err);
      }
    };
    // If the page was opened with ?openCart=1, auto-open the cart sheet.
    try {
      const qs = (typeof window !== 'undefined' && window.location && window.location.search) || '';
      if (qs && qs.indexOf('openCart=1') !== -1) {
        console.log('[manual-order-complete] query openCart=1 detected, opening cart sheet');
        setCartSheetOpen(true);
      }
    } catch (e) {}
    window.addEventListener('message', handleMessage);
    // dev helper: expose a method to simulate an incoming open_cart and log the flow
    try {
      window.__manual_dev_helpers = window.__manual_dev_helpers || {};
      window.__manual_dev_helpers.simulateOpenCart = function () {
        try {
          console.log('[manual-order-complete] simulateOpenCart() posting test beyon:app-shortcut');
          window.postMessage({ type: 'beyon:app-shortcut', payload: { action: 'open_cart' } }, '*');
        } catch (e) { console.warn('simulateOpenCart failed', e); }
      };
    } catch (e) {}
    return () => window.removeEventListener('message', handleMessage);
  }, [router, selectedBillData]);

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
  function getOfferItems(menuData, offersJson) {
    const offerItems = new Set();
    // Add items from active discount offers applied to menu data (items with originalPrice)
    Object.values(menuData).flat().forEach((item) => {
      if (typeof item.originalPrice === 'number' && item.originalPrice > item.price) {
        offerItems.add(item.name);
      }
    });
    // Add items from active bundle/combo offers in offers.json
    if (Array.isArray(offersJson)) {
      offersJson.forEach((rule) => {
        if (!rule.active) return;
        if (rule.type === 'buy_x_get_y') {
          if (rule.base && rule.base.match && rule.base.match.name) {
            offerItems.add(rule.base.match.name);
          }
          if (Array.isArray(rule.reward?.items)) {
            rule.reward.items.forEach((r) => r.name && offerItems.add(r.name));
          }
        }
        if (rule.type === 'fixed_combo_price') {
          if (Array.isArray(rule.required)) {
            rule.required.forEach((r) => r.name && offerItems.add(r.name));
          }
        }
      });
    }
    return offerItems;
  }
  // Memoize offer items for badge
  const offerItems = useMemo(() => getOfferItems(menuData, offers), [menuData, offers]);
  const categories = useMemo(() => ["All", ...Object.keys(menuData)], [menuData]);

  // Helper: get row index for a given item index (for portrait mode, 2 cards per row)
  function getRowIndex(idx, cardsPerRow = 2) {
    return Math.floor(idx / cardsPerRow);
  }

  const filteredItems = useMemo(() => {
    if (searchMode && searchQuery) {
      return Object.values(menuData).flat().filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    } else {
      return Object.entries(menuData)
        .filter(([category]) => selectedCategory === "All" || selectedCategory === category)
        .flatMap(([category, items]) => items);
    }
  }, [menuData, selectedCategory, searchMode, searchQuery]);

  useEffect(() => {
    function handleResize() {
      setIsPortrait(window.innerHeight > window.innerWidth);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const totalAmount = useMemo(() => {
    const rewardsByOffer = {};
    for (const it of cart) {
      if (it.isOfferReward) {
        (rewardsByOffer[it.offerId] = rewardsByOffer[it.offerId] || []).push(it);
      }
    }

    let sum = 0;
    for (const it of cart) {
      if (it.isOfferReward) sum += (it.offerPrice ?? 0) * (it.quantity || 0);
    }

    const baseItems = cart.filter((it) => !it.isOfferReward);
    for (const item of baseItems) {
      const linkedOffers = (offers || []).filter(o => o.active && o.type === 'buy_x_get_y' && o.base?.match?.name === item.name);
      let groupsConsumedTotal = 0;
      for (const ofr of linkedOffers) {
        const rewardEntries = rewardsByOffer[ofr.id] || [];
        const totalAppliedRewards = rewardEntries.reduce((s, r) => s + (r.quantity || 0), 0);
        const perRewardQty = ofr.reward?.items?.[0]?.quantity || 1;
        const req = ofr.base?.quantity || 1;
        const groupsConsumed = Math.floor(totalAppliedRewards / perRewardQty) * req;
        groupsConsumedTotal += groupsConsumed;
      }
      const consumed = Math.min(item.quantity || 0, groupsConsumedTotal);
      const leftover = Math.max(0, (item.quantity || 0) - consumed);

      const discountOffer = getActiveDiscountOfferForItem(item, menuData, offers);
      let discountedPrice = item.price;
      if (discountOffer) {
        const { type, amount } = discountOffer;
        if (type === 'percent') discountedPrice = item.price - Math.round((item.price * amount) / 100);
        else if (type === 'flat') discountedPrice = item.price - amount;
        if (discountedPrice < 0) discountedPrice = 0;
      }
      sum += leftover * discountedPrice;
    }

    return sum;
  }, [cart, menuData, offers]);

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
            setCart(syncOfferRewards(sanitized, offers));
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

  // Helper: compute bill data from an arbitrary cart snapshot
  function computeBillData(cartSnapshot) {
    const rewardsByOffer = {};
    for (const it of (cartSnapshot || [])) {
      if (it.isOfferReward) {
        (rewardsByOffer[it.offerId] = rewardsByOffer[it.offerId] || []).push(it);
      }
    }

    // sumCharge holds the actual charged total for reward lines
    let sumCharge = 0;
    for (const it of (cartSnapshot || [])) {
      if (it.isOfferReward) sumCharge += (it.offerPrice ?? 0) * (it.quantity || 0);
    }

    const lines = [];

    const baseItems = (cartSnapshot || []).filter((i) => !i.isOfferReward);
    for (const item of baseItems) {
      const linkedOffers = (offers || []).filter(o => o.active && o.type === 'buy_x_get_y' && o.base?.match?.name === item.name);
      let groupsConsumedTotal = 0;
      for (const ofr of linkedOffers) {
        const rewardEntries = rewardsByOffer[ofr.id] || [];
        const totalAppliedRewards = rewardEntries.reduce((s, r) => s + (r.quantity || 0), 0);
        const perRewardQty = ofr.reward?.items?.[0]?.quantity || 1;
        const req = ofr.base?.quantity || 1;
        const groupsConsumed = Math.floor(totalAppliedRewards / perRewardQty) * req;
        groupsConsumedTotal += groupsConsumed;
      }
      const consumed = Math.min(item.quantity || 0, groupsConsumedTotal);
      const leftover = Math.max(0, (item.quantity || 0) - consumed);

      if (consumed > 0) {
        // For the bill/order summary only: compute rewardCount for linked offers and
        // show consumed base items at the reward value (presentation-only).
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
        // For display: show the reward unit price (single-value). The actual
        // charged amount (for totals) is rewardCount * rewardUnitPrice and will
        // be aggregated into sumCharge.
        const displayAmount = (rewardUnitPrice || 0);
        const consumedCharge = (rewardUnitPrice || 0) * Math.max(0, rewardCount || 0);
        lines.push({ desc: `${item.name} (consumed by offer)`, qty: consumed, unitPrice: rewardUnitPrice, amount: displayAmount, displayAmount, chargeAmount: consumedCharge, isOfferConsumed: true });
        sumCharge += consumedCharge;
      }
      if (leftover > 0) {
        const discountOffer = getActiveDiscountOfferForItem(item, menuData, offers);
        let unitPrice = item.price;
        if (discountOffer) {
          const { type, amount } = discountOffer;
          if (type === 'percent') unitPrice = item.price - Math.round((item.price * amount) / 100);
          else if (type === 'flat') unitPrice = item.price - amount;
          if (unitPrice < 0) unitPrice = 0;
        }
        lines.push({ desc: item.name, qty: leftover, unitPrice, amount: unitPrice * leftover });
        // Add leftover base charges to the charged subtotal
        sumCharge += unitPrice * leftover;
      }
    }

    // reward lines (show as Offer Reward entries). For the order summary we want these to
    // appear but not add to the billed total (they are already represented on the consumed
    // base lines above). So present them with unitPrice 0 and amount 0 while keeping
    // the offerPrice available in the description if needed.
    for (const r of (cartSnapshot || []).filter(i => i.isOfferReward)) {
      const unitPrice = r.offerPrice ?? 0;
      // Offer Reward lines are reference-only here and zero-charged.
      lines.push({ desc: `${r.name} (Offer Reward)`, qty: r.quantity || 0, unitPrice: 0, amount: 0, chargeAmount: 0, isOfferReward: true, offerPrice: unitPrice });
    }

    const subtotal = sumCharge;
    return { lines, subtotal, total: sumCharge };
  }


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

  // ---------------- CART FUNCTIONS ----------------
  // Sync buy_x_get_y reward items in cart: add/update/remove reward lines with price 0 and offerPrice
  function syncOfferRewards(cartState, currentOffers) {
    console.log('[syncOfferRewards] Called with cart length:', cartState?.length || 0, 'offers:', currentOffers?.length || 0);
    if (!Array.isArray(cartState)) return [];
    const next = [...cartState];
    const activeBuyXGetY = (currentOffers || []).filter(o => o.active && o.type === 'buy_x_get_y');
    console.log('[syncOfferRewards] Active Buy X Get Y offers:', activeBuyXGetY.length);

    for (const offer of activeBuyXGetY) {
      const baseName = offer.base?.match?.name;
      const rewardDef = offer.reward?.items?.[0];
      console.log(`[syncOfferRewards] Processing offer "${offer.name}": base=${baseName}, reward=${rewardDef?.name}`);
      if (!baseName || !rewardDef) {
        console.log('[syncOfferRewards] Skipping - missing base or reward');
        continue;
      }

      const baseCount = next.reduce((s, it) => s + ((it.name === baseName && !it.isOfferReward) ? (it.quantity || 0) : 0), 0);
      const perRewardQty = rewardDef.quantity || 1;
      const possibleRewards = Math.floor(baseCount / (offer.base?.quantity || 1)) * perRewardQty;
      const maxRewards = offer.limitPerOrder || possibleRewards;
      const rewardsToApply = Math.min(possibleRewards, maxRewards);
      console.log(`[syncOfferRewards] baseCount=${baseCount}, rewardsToApply=${rewardsToApply}`);

      // find existing reward entries tied to this offer
      let existingRewardIndex = next.findIndex((it) => it.isOfferReward && it.offerId === offer.id && it.name === rewardDef.name);
      const existingQty = existingRewardIndex >= 0 ? (next[existingRewardIndex].quantity || 0) : 0;

      if (rewardsToApply > 0) {
        if (existingRewardIndex >= 0) {
          // update quantity
          console.log(`[syncOfferRewards] ✅ Updating existing reward: ${rewardDef.name} qty ${existingQty} → ${rewardsToApply}`);
          next[existingRewardIndex] = { ...next[existingRewardIndex], quantity: rewardsToApply };
        } else {
          // add reward entry with price = 0 but keep offerPrice for display/total
          console.log(`[syncOfferRewards] ✅ Adding NEW reward: ${rewardDef.name} qty ${rewardsToApply}`);
          next.push({ name: rewardDef.name, quantity: rewardsToApply, price: 0, offerPrice: rewardDef.price ?? 0, isOfferReward: true, offerId: offer.id });
        }
      } else {
        // remove existing reward entry if present
        if (existingRewardIndex >= 0) {
          console.log(`[syncOfferRewards] ❌ Removing reward: ${rewardDef.name}`);
          next.splice(existingRewardIndex, 1);
        }
      }
    }

    console.log('[syncOfferRewards] Final cart length:', next.length);
    return next;
  }

  // Re-sync offer rewards when offers change (e.g. admin updated offers)
  useEffect(() => {
    console.log('[useEffect:offers] Offers changed, syncing cart rewards. Offers count:', offers?.length || 0);
    try {
      setCart((prev) => {
        console.log('[useEffect:offers] Syncing rewards for cart with', prev?.length || 0, 'items');
        try {
          const updated = syncOfferRewards(prev || [], offers);
          if (updated.length !== prev?.length) {
            console.log('[useEffect:offers] 🎉 Cart updated! Items:', prev?.length, '→', updated.length);
          }
          return updated;
        } catch (e) {
          console.warn('syncOfferRewards failed during offers update', e);
          return prev || [];
        }
      });
    } catch (e) {
      console.warn('Failed to re-sync offers on update', e);
    }
  }, [offers]);

  // Update cart item prices when menuData changes (e.g., when discounts are applied)
  useEffect(() => {
    console.log('[manual-order-complete] Cart price sync effect triggered, menuData keys:', Object.keys(menuData).length);
    if (!menuData || Object.keys(menuData).length === 0) {
      console.log('[manual-order-complete] Skipping cart sync - no menu data');
      return;
    }
    
    setCart((prev) => {
      console.log('[manual-order-complete] Checking cart for price updates, cart length:', prev.length);
      if (!prev || prev.length === 0) return prev;
      
      let hasChanges = false;
      const updated = prev.map((cartItem) => {
        // Skip offer reward items - they have fixed offerPrice
        if (cartItem.isOfferReward) return cartItem;
        
        // Find the current menu item price
        let currentMenuItem = null;
        for (const category in menuData) {
          const found = menuData[category]?.find(item => item.name === cartItem.name);
          if (found) {
            currentMenuItem = found;
            break;
          }
        }
        
        // Debug: Log price comparison for each item
        if (currentMenuItem) {
          console.log(`[cart-sync] ${cartItem.name}:`);
          console.log(`  - Cart price: ₹${cartItem.price}`);
          console.log(`  - Menu price: ₹${currentMenuItem.price}`);
          console.log(`  - Menu originalPrice: ₹${currentMenuItem.originalPrice || 'N/A'}`);
          console.log(`  - Prices match: ${currentMenuItem.price === cartItem.price}`);
        } else {
          console.log(`[cart-sync] ${cartItem.name}: NOT FOUND in menu`);
        }
        
        // If item found in menu and price has changed, update it
        if (currentMenuItem && currentMenuItem.price !== cartItem.price) {
          console.log(`[manual-order-complete] ✅ Updating cart price for ${cartItem.name}: ₹${cartItem.price} → ₹${currentMenuItem.price}`);
          hasChanges = true;
          return { ...cartItem, price: currentMenuItem.price };
        }
        
        return cartItem;
      });
      
      // Only update if there were actual changes to prevent infinite loops
      if (hasChanges) {
        console.log('[manual-order-complete] ✅ Cart prices UPDATED - syncing offers now');
        // Re-sync offers after price update
        return syncOfferRewards(updated, offers);
      }
      
      console.log('[manual-order-complete] No cart price changes detected');
      return prev;
    });
  }, [menuData]);

  const addToCart = useCallback((item) => {
    setCart((prev) => {
      let next = [...prev];
      const existing = next.find((i) => i.name === item.name && !i.isOfferReward);
      if (existing) {
        next = next.map((i) =>
          i.name === item.name && !i.isOfferReward ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        next.push({ ...item, quantity: 1 });
      }
      return syncOfferRewards(next, offers);
    });
  }, [offers]);

  const removeFromCart = useCallback((item) => {
    setCart((prev) => {
      const next = prev.filter((i) => !(i.name === item.name && i.isOfferReward === item.isOfferReward && (item.offerId ? i.offerId === item.offerId : true)));
      return syncOfferRewards(next, offers);
    });
  }, [offers]);

  const clearCart = () => setCart([]);

  const changeQty = useCallback((name, delta) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.name === name && !i.isOfferReward);
      if (!exists) {
        // allow changing reward entries directly as well
        const existsReward = prev.find((i) => i.name === name && i.isOfferReward);
        if (!existsReward) return prev;
        const newQty = (existsReward.quantity || 0) + delta;
        const next = newQty <= 0 ? prev.filter((i) => i !== existsReward) : prev.map((i) => i === existsReward ? { ...i, quantity: newQty } : i);
        return syncOfferRewards(next, offers);
      }
      const nextQty = (exists.quantity || 0) + delta;
      let next;
      if (nextQty <= 0) next = prev.filter((i) => !(i.name === name && !i.isOfferReward));
      else next = prev.map((i) => (i.name === name && !i.isOfferReward ? { ...i, quantity: nextQty } : i));
      return syncOfferRewards(next, offers);
    });
  }, [offers]);

  // Adjust quantity for reward entries (match by name + offerId) safely
  const changeQtyForReward = useCallback((name, offerId, delta) => {
    setCart((prev) => {
      const next = [...prev];
      const idx = next.findIndex(i => i.name === name && i.isOfferReward && (offerId ? i.offerId === offerId : true));
      if (idx === -1) return prev;
      const newQty = (next[idx].quantity || 0) + delta;
      if (newQty <= 0) {
        next.splice(idx, 1);
      } else {
        next[idx] = { ...next[idx], quantity: newQty };
      }
      return syncOfferRewards(next, offers);
    });
  }, [offers]);

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
        status: "pending",
        total: totalAmount,
        createdAt: new Date().toISOString(),
        source: "local",
      };

      // Save order locally using localDataService
      const savedOrder = await upsertLocalOrder(orderPayload);

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
                          ? "bg-orange-500 text-white"
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
            <div
              className={`manual-order-grid grid gap-3 ${isPortrait ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : ''}`}
              style={isPortrait ? undefined : { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
              onTouchStart={(event) => {
                if (event.touches.length !== 1) return;
                const touch = event.touches[0];
                touchStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
              }}
              onTouchEnd={(event) => {
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
              }}
            >
              {filteredItems.map((item, idx, arr) => {
                      const inStock = item.inStock !== false; // default to true
                      // For portrait, 2 cards per row
                      const rowIdx = getRowIndex(idx, 2);
                      const details = getOfferDetails(item, offers, menuData);
                      const longText = isLongOfferText(details);
                      // If expandedOffer is this item and text is long, expand the row
                      const isRowTall = isPortrait && expandedRow === rowIdx && longText;
                      // When star is clicked, set expandedOffer and expandedRow
                      const handleExpand = (name) => {
                        setExpandedOffer(name);
                        if (name === item.name && longText) setExpandedRow(rowIdx);
                        else setExpandedRow(null);
                      };
                      const paddingClass = isPortrait ? 'p-2.5 sm:p-3' : 'p-2 sm:p-2';
                      const heightClass = !isPortrait && !isRowTall ? 'min-h-[118px]' : '';
                      const cardClasses = `manual-order-card rounded-lg bg-white ${paddingClass} shadow-sm hover:shadow transition-shadow flex flex-col transform origin-top-left scale-[0.90] sm:scale-100 border-2 ${inStock ? 'border-orange-400' : 'border-gray-300'} sm:${inStock ? 'border-orange-500' : 'border-gray-400'} relative ${heightClass}`;
                      const cardStyle = isRowTall ? { minHeight: 220 } : undefined;
                      return (
                        <div
                          key={item.name}
                          className={cardClasses}
                          role="button"
                          tabIndex={inStock ? 0 : -1}
                          onClick={(event) => {
                            if (!inStock) return;
                            const target = event.target;
                            if (target instanceof HTMLElement && target.closest('button')) return;
                            addToCart(item);
                          }}
                          onKeyDown={(event) => {
                            if (!inStock) return;
                            // If cart sheet is open, treat Enter as place-order and avoid
                            // adding items via keyboard to prevent conflicts.
                            if (cartSheetOpen) return;
                            if (event.target instanceof HTMLElement && event.target.closest('button')) return;
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              addToCart(item);
                            }
                          }}
                          style={cardStyle}
                        >
                          {/* O/A badge if offer available */}
                          {offerItems.has(item.name) && (
                            <OfferBadge item={item} offersJson={offers} menuData={menuData} onExpand={handleExpand} isExpanded={expandedOffer === item.name} isTall={isRowTall} />
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <h3 className="text-[1.05rem] font-semibold text-black leading-snug sm:text-[1.25rem]">{item.name}</h3>
                              <p className="text-[1.05rem] font-semibold text-gray-800 leading-snug sm:text-[1.25rem]">₹{item.price}</p>
                            </div>
                          </div>
                          <div className="mt-2 pt-1 flex-1 flex items-end justify-between">
                            <span className="text-xs text-gray-500 font-semibold align-bottom">
                              {!inStock ? 'N/A' : ''}
                            </span>
                            <button
                              disabled={!inStock}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (inStock) addToCart(item);
                              }}
                              onKeyDown={(e) => {
                                  if (cartSheetOpen) { e.stopPropagation(); return; }
                                  if (e.key === 'Enter' && inStock) {
                                    e.preventDefault();
                                    addToCart(item);
                                  }
                                  e.stopPropagation();
                                }}
                              className={`inline-flex items-center justify-center rounded-full shadow-sm text-[1.1rem] h-[38px] w-[38px] sm:h-[48px] sm:w-[48px] sm:text-[1.25rem] ${inStock ? 'bg-orange-500 text-white hover:bg-orange-600 focus:ring-2 focus:ring-orange-300' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                              title={inStock ? "Add to Cart" : "Unavailable"}
                              aria-label={inStock ? `Add ${item.name}` : "Unavailable"}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
          })}
            </div>
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

      {/* Manual Cart Bottom Sheet (separate from customer cart) */}
      {cartSheetOpen && (
        <div key={`cart-${dataVersion}`} className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 pt-3" style={{ maxHeight: '85vh' }}>
            {/* <div className="h-1.5 w-10 bg-gray-300 rounded-full mx-auto mb-3" /> */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-lg text-black">Manual Order Cart</h2>
              <button onClick={() => setCartSheetOpen(false)} className="text-gray-500 hover:text-gray-700 p-1" aria-label="Close">✕</button>
            </div>

            {/* Customer Info (moved from old sidebar) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <input
                className="border border-gray-300 focus:border-orange-400 focus:ring-0 outline-none p-2 rounded text-black placeholder:text-gray-400"
                placeholder="Customer Name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <input
                className="border border-gray-300 focus:border-orange-400 focus:ring-0 outline-none p-2 rounded text-black placeholder:text-gray-400"
                placeholder="Phone Number (optional)"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
              />
              <input
                className="sm:col-span-2 border border-gray-300 focus:border-orange-400 focus:ring-0 outline-none p-2 rounded text-black placeholder:text-gray-400"
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* Cart Items in Sheet (scrollable) */}
            <div style={{ maxHeight: '38vh', overflowY: 'auto', marginBottom: '1rem' }} className="hide-scrollbar">
      <style jsx global>{`
        .hide-scrollbar {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE 10+ */
          overscroll-behavior: contain; /* Prevent scroll chaining */
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome/Safari/Webkit */
        }
      `}</style>
              {cart.length === 0 ? (
                <p className="text-gray-500 py-4 text-center">No items added.</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {(() => {
                    // Group rewards by offerId for quick lookup
                    const rewardsByOffer = {};
                    for (const it of cart) {
                      if (it.isOfferReward) {
                        (rewardsByOffer[it.offerId] = rewardsByOffer[it.offerId] || []).push(it);
                      }
                    }

                    // Render only non-reward base items; when offers consume groups, show grouped (consumed) portion with reward info and leftover as a separate normal line
                    return cart
                      .filter((it) => !it.isOfferReward)
                      .flatMap((item, idx) => {
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

                        // Find offers where this item is base
                        const linkedOffers = offers.filter(o => o.active && o.type === 'buy_x_get_y' && o.base?.match?.name === item.name);

                        // compute grouped consumption based on reward entries (so we don't double-charge)
                        let groupsConsumedTotal = 0;
                        const rewardDisplays = [];
                        let rewardTotal = 0;
                        for (const ofr of linkedOffers) {
                          const rewardEntries = rewardsByOffer[ofr.id] || [];
                          const totalAppliedRewards = rewardEntries.reduce((s, r) => s + (r.quantity || 0), 0);
                          const perRewardQty = ofr.reward?.items?.[0]?.quantity || 1;
                          const req = ofr.base?.quantity || 1;
                          const groupsConsumed = Math.floor(totalAppliedRewards / perRewardQty) * req;
                          groupsConsumedTotal += groupsConsumed;
                          for (const r of rewardEntries) {
                            rewardDisplays.push(`${r.quantity} x ${r.name} @ ₹${r.offerPrice ?? 0}`);
                            rewardTotal += (r.offerPrice ?? 0) * (r.quantity || 0);
                          }
                        }

                        const consumed = Math.min(item.quantity || 0, groupsConsumedTotal);
                        const leftover = Math.max(0, (item.quantity || 0) - consumed);

                        const hasItemOffer = hasOffer(item, offers, menuData);

                        const nodes = [];

                        // If some groups were consumed by offers, render a highlighted grouped line showing only the consumed quantity
                          if (consumed > 0) {
                            // Compute how many reward units are applied and the reward unit price.
                            // The charge for the consumed group is rewardUnitPrice * rewardCount.
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

                            nodes.push(
                              <li key={`group-${idx}`} className={`py-2 flex items-center justify-between gap-2 ${hasItemOffer ? 'border-l-4 border-yellow-500 bg-yellow-50' : ''}`}>
                                <div className="min-w-0 flex flex-col gap-0.5">
                                  <span className="text-sm font-medium text-gray-800 truncate flex items-center gap-1">
                                    {item.name}
                                    <span className="ml-2 text-yellow-600 text-xs font-semibold">Offer Applied</span>
                                  </span>
                                  {rewardDisplays.length > 0 && (
                                    <div className="text-xs text-green-700 font-semibold" style={{ maxWidth: 360 }}>
                                      <div style={{ maxHeight: 48, overflow: 'auto', whiteSpace: 'normal', lineHeight: '1.15', paddingRight: 6 }}>
                                        {`Reward: ${rewardDisplays.join(', ')}`}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300"
                                    onClick={() => changeQty(item.name, -1)}
                                    aria-label="Decrease"
                                    title="Decrease"
                                  >
                                    −
                                  </button>
                                  <span className="w-6 text-center text-sm font-semibold text-black">{consumed}</span>
                                  <button
                                    className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-orange-500 text-black hover:bg-orange-600"
                                    onClick={() => changeQty(item.name, 1)}
                                    aria-label="Increase"
                                    title="Increase"
                                  >
                                    +
                                  </button>
                                  <div className="w-36 text-right text-sm text-black">
                                    <div className="text-sm font-semibold">Consumed: {consumed}</div>
                                    <div className="text-sm text-orange-500 font-semibold">Offer charge: ₹{chargeAmount}</div>
                                  </div>
                                  <button className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-300 ml-1" onClick={() => changeQty(item.name, -consumed)} aria-label={`Remove ${item.name}`}>×</button>
                                </div>
                              </li>
                            );
                          }

                        // If there is leftover quantity, render a normal base line for the leftover units
                        if (leftover > 0) {
                          nodes.push(
                            <li key={`leftover-${idx}`} className={`py-2 flex items-center justify-between gap-2 ${hasItemOffer ? '' : ''}`}>
                              <div className="min-w-0 flex flex-col gap-0.5">
                                <span className="text-sm font-medium text-gray-800 truncate flex items-center gap-1">{item.name}</span>
                                {discount > 0 && (
                                  <span className="text-xs text-green-700 font-semibold">{offerLabel}: <span className="line-through text-gray-400">₹{item.price}</span> <span className="ml-1">₹{discountedPrice}</span> <span className="ml-1 text-gray-500">(Saved ₹{discount})</span></span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300"
                                  onClick={() => changeQty(item.name, -1)}
                                  aria-label="Decrease"
                                  title="Decrease"
                                >
                                  −
                                </button>
                                <span className="w-6 text-center text-sm font-semibold text-black">{leftover}</span>
                                <button
                                  className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-orange-500 text-black hover:bg-orange-600"
                                  onClick={() => changeQty(item.name, 1)}
                                  aria-label="Increase"
                                  title="Increase"
                                >
                                  +
                                </button>
                                <span className="w-14 text-right text-sm text-black font-semibold">₹{discountedPrice * leftover}</span>
                                <button
                                  className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-300 ml-1"
                                  onClick={() => changeQty(item.name, -leftover)}
                                  aria-label={`Remove ${item.name}`}
                                  title="Remove"
                                >
                                  ×
                                </button>
                              </div>
                            </li>
                          );
                        }

                        // Append explicit reward rows for any reward entries tied to the offers
                        for (const ofr of linkedOffers) {
                          const rewardEntries = rewardsByOffer[ofr.id] || [];
                          for (const r of rewardEntries) {
                            nodes.push(
                              <li key={`reward-${ofr.id}-${r.name}-${idx}`} className="py-2 pl-6 flex items-center justify-between gap-2 bg-green-50">
                                <div className="min-w-0 flex flex-col gap-0.5">
                                  <span className="text-sm font-medium text-green-800 truncate flex items-center gap-1">
                                    {r.name}
                                    <span className="ml-2 text-green-600 text-xs font-semibold">Free (Offer)</span>
                                  </span>
                                  <span className="text-xs text-green-700">{`Offer price: ₹${r.offerPrice ?? 0}`}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={() => changeQtyForReward(r.name, ofr.id, -1)} aria-label="Decrease">−</button>
                                  <span className="w-6 text-center text-sm font-semibold text-black">{r.quantity}</span>
                                  <button className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-orange-500 text-black hover:bg-orange-600" onClick={() => changeQtyForReward(r.name, ofr.id, 1)} aria-label="Increase">+</button>
                                  <span className="w-14 text-right text-sm text-black font-semibold">₹{(r.offerPrice ?? 0) * (r.quantity || 0)}</span>
                                  <button className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-red-300 text-red-600 hover:bg-red-50 ml-1" onClick={() => removeFromCart(r)} aria-label={`Remove ${r.name}`}>×</button>
                                </div>
                              </li>
                            );
                          }
                        }

                        return nodes;
                      });
                  })()}
                </ul>
              )}
            </div>

            {/* Cart Controls in Sheet (sticky) */}
            <div style={{ position: 'sticky', bottom: 0, background: 'white', paddingTop: 12, paddingBottom: 8, zIndex: 2 }} className="flex justify-between items-center gap-2 border-t border-gray-200">
              <span className="font-bold text-black">Total: ₹{totalAmount}</span>
              <div className="flex gap-2">
                <button
                  className="bg-gray-200 text-gray-800 hover:bg-gray-300 px-3 py-1.5 rounded-md"
                  onClick={clearCart}
                >
                  Clear
                </button>
                <button
                  disabled={placing}
                  className={`px-4 py-1.5 rounded-md text-white ${placing ? 'bg-orange-300' : 'bg-orange-500 hover:bg-orange-600'}`}
                  onClick={async () => { await placeOrder(); setCartSheetOpen(false); }}
                >
                  {placing ? 'Placing...' : 'Place Order'}
                </button>
              </div>
            </div>

            {/* Result/Error Message */}
            {resultMsg && (
              <p
                className={`text-sm mt-2 ${
                  resultMsg.startsWith('✅')
                    ? 'text-green-700'
                    : resultMsg.startsWith('⚠️')
                    ? 'text-yellow-700'
                    : 'text-red-700'
                }`}
              >
                {resultMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bill Preview Modal */}
      {billOpen && (
        <div key={`bill-${dataVersion}-${cart.length}`} className="fixed inset-0 z-[70] flex items-end md:items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBillOpen(false)} />
          <div ref={billRef} className={`printable-bill ${paperFormat === 'thermal-80' ? 'thermal-80' : paperFormat === 'a4' ? 'a4' : ''} relative w-full md:w-[540px] max-h-[90vh] bg-white rounded-t-2xl md:rounded-lg shadow-2xl overflow-auto p-4`} style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg text-orange-500">Bill Preview</h3>
                <div className="text-xs text-gray-500">{new Date().toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="hidden sm:inline">Source:</span>
                  <select value={billSource} onChange={(e) => setBillSource(e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-sm bg-white">
                    <option value="cart">Current Cart</option>
                    <option value="latest">Latest Saved</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="hidden sm:inline">Paper:</span>
                  <select value={paperFormat} onChange={(e) => setPaperFormat(e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-sm bg-white">
                    <option value="auto">Auto</option>
                    <option value="thermal-80">Thermal 80mm</option>
                    <option value="a4">A4</option>
                  </select>
                </label>
                <button className="px-3 py-1 rounded bg-gray-100 text-sm" onClick={() => setBillOpen(false)}>Close</button>
                <button className="px-3 py-1 rounded bg-gray-100 text-sm" onClick={() => { window.print(); }}>Print</button>
                <button className="px-3 py-1 rounded bg-green-600 text-white" onClick={async () => {
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
                }}>{downloading ? 'Working...' : 'Download PDF'}</button>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              <div className="pb-3">
                {selectedBillData.lines.map((l, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{l.desc}</div>
                      <div className="text-xs text-gray-500">{l.isOfferReward ? 'Offer Reward' : l.isOfferConsumed ? 'Consumed by offer' : ''}</div>
                    </div>
                    <div className="text-right ml-2 min-w-[90px]">
                      {l.isOfferConsumed ? (
                        <div className="text-sm text-orange-500 font-semibold">₹{l.displayAmount ?? 0}</div>
                      ) : (
                        <>
                          <div className="text-sm font-semibold">{l.qty} × ₹{l.unitPrice}</div>
                          <div className="text-sm text-orange-500 font-semibold">₹{l.amount}</div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3">
                <div className="flex items-center justify-between py-1"><span className="text-sm text-gray-600">Subtotal</span><span className="font-semibold">₹{selectedBillData.subtotal}</span></div>
                {/* Placeholder: taxes/discounts */}
                <div className="flex items-center justify-between py-1"><span className="text-sm text-orange-500">Total</span><span className="font-bold text-lg text-orange-500">₹{selectedBillData.total}</span></div>
              </div>
            </div>
            <style jsx>{`
              /* Print helpers and format-specific styles */
              .printable-bill.thermal-80 { width: 80mm; max-width: 100%; }
              .printable-bill.a4 { width: 210mm; max-width: 100%; }

              @page thermal80 { size: 80mm auto; margin: 6mm; }
              @page a4 { size: A4; margin: 10mm; }

              @media print {
                body * { visibility: hidden; }
                .printable-bill, .printable-bill * { visibility: visible; }
                .printable-bill { position: absolute; left: 0; top: 0; width: 100%; }
                /* If thermal class present, prefer narrow page size */
                .printable-bill.thermal-80 { box-shadow: none; border-radius: 0; }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
  // Keyboard shortcuts for cart when open
  useEffect(() => {
    if (!cartSheetOpen) return;

    const handleCartKey = (ev) => {
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
          placeOrder();
          setCartSheetOpen(false);
        } else if (ev.key === 'Enter' && ev.ctrlKey) {
          console.log('[manual-order-complete] Ctrl+Enter pressed, calling placeOrder');
          ev.preventDefault();
          placeOrder();
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
