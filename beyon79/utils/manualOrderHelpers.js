// beyon79/utils/manualOrderHelpers.js

// ---------------- OFFER HELPERS ----------------

// Helper: get the currently active discount offer for an item
export function getActiveDiscountOfferForItem(item, menuData, offersJson) {
  let activeOffer = null;
  for (const offer of offersJson || []) {
    if (!offer.active) continue;
    if (offer.type === "discount") {
      const { scope, category, item: offerItem } = offer;
      const applies =
        scope === "all" ||
        (scope === "category" &&
          category &&
          menuData[category]?.some((it) => it.name === item.name)) ||
        (scope === "item" && offerItem === item.name);
      if (applies) {
        activeOffer = offer;
        break;
      }
    }
  }
  return activeOffer;
}

// Helper: get offer details string
export function getOfferDetails(item, offersJson, menuData) {
  if (typeof item.originalPrice === 'number' && item.originalPrice > item.price) {
    const discount = item.originalPrice - item.price;
    return `₹${discount} off (₹${item.originalPrice} → ₹${item.price})`;
  }

  const bundleOffers = (offersJson || []).filter((rule) => {
    if (!rule.active) return false;
    const nameEq = (a, b) =>
      String(a || '').toLowerCase() === String(b || '').toLowerCase();

    if (rule.type === 'buy_x_get_y') {
      const baseMatch =
        rule.base?.match?.name &&
        nameEq(rule.base.match.name, item.name);
      const rewardMatch = (rule.reward?.items || []).some((r) =>
        nameEq(r.name, item.name)
      );
      return baseMatch || rewardMatch;
    }

    if (rule.type === 'fixed_combo_price') {
      return (rule.required || []).some((r) =>
        nameEq(r.name, item.name)
      );
    }

    return false;
  });

  if (bundleOffers.length > 0) {
    return bundleOffers
      .map((r) => {
        if (r.type === 'buy_x_get_y') {
          return `Buy ${r.base?.quantity || 0} x ${
            r.base?.match?.name || 'item'
          } → Get ${r.reward?.items?.[0]?.quantity || 1} x ${
            r.reward?.items?.[0]?.name
          } @ ₹${r.reward?.items?.[0]?.price ?? 0}`;
        }
        if (r.type === 'fixed_combo_price') {
          return `Combo: ₹${r.price} — Required: ${(r.required || [])
            .map((x) => x.name || x.category)
            .join(', ')}`;
        }
        return 'Offer applied';
      })
      .join('\n');
  }

  return "Offer details unavailable.";
}

export function hasOffer(item, offersJson, menuData) {
  return getOfferDetails(item, offersJson, menuData) !== "Offer details unavailable.";
}

// ---------------- UI HELPERS ----------------

export function isLongOfferText(text, maxChars = 60) {
  return text && text.length > maxChars;
}

export function getRowIndex(idx, cardsPerRow = 2) {
  return Math.floor(idx / cardsPerRow);
}

// ---------------- BILL HELPERS ----------------

export function computeBillData(cart = []) {
  let subtotal = 0;
  const lines = [];

  for (const item of cart) {
    const qty = item.quantity || 0;
    const unitPrice = item.price || 0;
    const amount = qty * unitPrice;
    subtotal += amount;

    lines.push({
      desc: item.name,
      qty,
      unitPrice,
      amount,
      isOfferReward: !!item.isOfferReward,
      isOfferConsumed: !!item.isOfferConsumed,
      displayAmount: item.displayAmount,
    });
  }

  return {
    subtotal,
    total: subtotal,
    lines,
  };
}

// ---------------- OFFER ITEMS SET ----------------

export function getOfferItems(menuData, offersJson) {
  const offerItems = new Set();

  Object.values(menuData || {}).flat().forEach((item) => {
    if (
      typeof item.originalPrice === 'number' &&
      item.originalPrice > item.price
    ) {
      offerItems.add(item.name);
    }
  });

  (offersJson || []).forEach((rule) => {
    if (!rule.active) return;

    if (rule.type === 'buy_x_get_y') {
      if (rule.base?.match?.name) {
        offerItems.add(rule.base.match.name);
      }
      rule.reward?.items?.forEach((r) => r.name && offerItems.add(r.name));
    }

    if (rule.type === 'fixed_combo_price') {
      rule.required?.forEach((r) => r.name && offerItems.add(r.name));
    }
  });

  return offerItems;
}

