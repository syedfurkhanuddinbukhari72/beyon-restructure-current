import { useState, useEffect, useCallback } from 'react';

const CART_DRAFT_KEY = "manualOrder:cartDraft";
const CART_META_KEY = "manualOrder:cartMeta";

export function useCartManagement({ menuData, offers }) {
  const [cart, setCart] = useState([]);

  const syncOfferRewards = useCallback((cartSnapshot) => {
    let syncedCart = [...cartSnapshot];

    // Remove existing offer rewards first
    syncedCart = syncedCart.filter(item => !item.isOfferReward);

    // Process buy_x_get_y offers
    const buyXGetYOffers = offers.filter(o => o.active && o.type === 'buy_x_get_y');

    buyXGetYOffers.forEach(offer => {
      const baseName = offer.base?.match?.name;
      if (!baseName) return;

      const baseItems = syncedCart.filter(item => item.name === baseName && !item.isOfferReward);
      const totalBaseQty = baseItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

      const req = offer.base?.quantity || 1;
      const rewardQtyPerGroup = offer.reward?.items?.[0]?.quantity || 1;
      const groups = Math.floor(totalBaseQty / req);
      const totalRewardQty = groups * rewardQtyPerGroup;

      if (totalRewardQty > 0) {
        const rewardItem = offer.reward?.items?.[0];
        if (rewardItem) {
          const existingReward = syncedCart.find(item => item.name === rewardItem.name && item.isOfferReward && item.offerId === offer.id);
          if (existingReward) {
            existingReward.quantity = totalRewardQty;
          } else {
            syncedCart.push({
              name: rewardItem.name,
              price: rewardItem.price || 0,
              quantity: totalRewardQty,
              isOfferReward: true,
              offerId: offer.id,
              offerPrice: rewardItem.price || 0,
            });
          }
        }
      }
    });

    return syncedCart;
  }, [offers]);

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
      return syncOfferRewards(next);
    });
  }, [syncOfferRewards]);

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

  const clearCart = useCallback(() => setCart([]), []);

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

  // Cart localStorage persistence
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

  return {
    cart,
    setCart,
    addToCart,
    removeFromCart,
    changeQty,
    changeQtyForReward,
    clearCart,
  };
}
