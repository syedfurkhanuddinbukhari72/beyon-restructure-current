/**
 * Offers Engine for applying discount and buy_x_get_y offers to orders.
 * Handles offer application and total calculation.
 */

/**
 * Applies active offers to an order, returning adjusted order and applied rule IDs.
 * @param {Object} order - { items: [{ name, price, quantity, category }] }
 * @param {Array} rules - Array of offer rules
 * @returns {Object} { order: adjustedOrder, applied: [ruleIds] }
 */
export function applyOffersToOrder(order, rules) {
  if (!order || !order.items || !Array.isArray(rules)) {
    return { order: { ...order }, applied: [] };
  }

  const adjustedOrder = { ...order, items: [...order.items] };
  const appliedRuleIds = [];

  // Filter active rules
  const activeRules = rules.filter(rule => rule.active);

  // Apply discount offers first (adjust item prices)
  activeRules.forEach(rule => {
    if (rule.type === 'discount') {
      const { scope, category, item: offerItem } = rule;
      adjustedOrder.items = adjustedOrder.items.map(item => {
        const applies =
          scope === 'all' ||
          (scope === 'category' && category && item.category === category) ||
          (scope === 'item' && offerItem === item.name);
        if (applies) {
          let adjustedPrice = item.price;
          if (rule.type === 'percent') {
            adjustedPrice = item.price - Math.round((item.price * rule.amount) / 100);
          } else if (rule.type === 'flat') {
            adjustedPrice = item.price - rule.amount;
          }
          adjustedPrice = Math.max(0, adjustedPrice);
          appliedRuleIds.push(rule.id);
          return { ...item, price: adjustedPrice, originalPrice: item.price };
        }
        return item;
      });
    }
  });

  // Apply buy_x_get_y offers (add reward items)
  activeRules.forEach(rule => {
    if (rule.type === 'buy_x_get_y') {
      const baseName = rule.base?.match?.name;
      const rewardDef = rule.reward?.items?.[0];
      if (!baseName || !rewardDef) return;

      const baseCount = adjustedOrder.items.reduce((sum, it) =>
        sum + ((it.name === baseName && !it.isOfferReward) ? (it.quantity || 0) : 0), 0
      );
      const perRewardQty = rewardDef.quantity || 1;
      const req = rule.base?.quantity || 1;
      const possibleRewards = Math.floor(baseCount / req) * perRewardQty;
      const maxRewards = rule.limitPerOrder || possibleRewards;
      const rewardsToApply = Math.min(possibleRewards, maxRewards);

      if (rewardsToApply > 0) {
        // Add reward item
        adjustedOrder.items.push({
          name: rewardDef.name,
          price: 0,
          offerPrice: rewardDef.price ?? 0,
          quantity: rewardsToApply,
          isOfferReward: true,
          offerId: rule.id,
          _offerAdded: true,
          category: 'Offer'
        });
        appliedRuleIds.push(rule.id);
      }
    }
  });

  // Apply fixed_combo_price offers (group items and set combo price)
  // Note: This is a placeholder; implement based on specific logic if needed
  activeRules.forEach(rule => {
    if (rule.type === 'fixed_combo_price') {
      // Implement combo logic here if required
      // For now, skip as no such offers in current data
    }
  });

  return { order: adjustedOrder, applied: appliedRuleIds };
}

/**
 * Calculates the total for an adjusted order.
 * @param {Object} order - Adjusted order with items
 * @returns {number} Total amount
 */
export function getOrderTotal(order) {
  if (!order || !order.items) return 0;

  return order.items.reduce((sum, item) => {
    if (item.isOfferReward) {
      return sum + (item.offerPrice || 0) * (item.quantity || 0);
    } else {
      return sum + (item.price || 0) * (item.quantity || 0);
    }
  }, 0);
}
