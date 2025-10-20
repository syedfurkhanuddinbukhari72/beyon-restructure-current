// Offers engine: apply order-level offers without changing menu prices
// Rule schema examples:
// { id, type: 'buy_x_get_y', active: true, base: { match: { name?: string, category?: string }, quantity: 2 }, reward: { items: [{ name, price: 0, quantity: 1 }] }, limitPerOrder?: 1 }
// { id, type: 'fixed_combo_price', active: true, required: [{ name or category }], price: 250, limitPerOrder?: 1 }

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

export function getOrderTotal(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.quantity || it.qty || 1), 0);
}

function countMatches(items, match) {
  return items.reduce((acc, it) => {
    const nameOk = match.name ? String(it.name).toLowerCase() === String(match.name).toLowerCase() : true;
    const catOk = match.category ? String(it.category).toLowerCase() === String(match.category).toLowerCase() : true;
    return acc + (nameOk && catOk ? Number(it.quantity || it.qty || 1) : 0);
  }, 0);
}

function addRewardItems(orderItems, reward, times) {
  const result = orderItems.slice();
  const t = Math.max(1, times || 1);
  for (let i = 0; i < t; i++) {
    for (const r of reward.items || []) {
      result.push({ name: r.name, price: Number(r.price ?? 0), quantity: Number(r.quantity ?? 1), _offerAdded: true });
    }
  }
  return result;
}

function applyBuyXGetY(order, rule) {
  const baseQ = rule?.base?.quantity || 0;
  if (!baseQ) return order;
  const items = Array.isArray(order.items) ? order.items : [];
  const matches = countMatches(items, rule.base.match || {});
  if (matches < baseQ) return order;
  const limit = rule.limitPerOrder || Infinity;
  const times = Math.min(Math.floor(matches / baseQ), limit);
  const nextItems = addRewardItems(items, rule.reward || {}, times);
  return { ...order, items: nextItems };
}

function applyFixedComboPrice(order, rule) {
  const reqs = Array.isArray(rule.required) ? rule.required : [];
  if (reqs.length === 0) return order;
  const items = Array.isArray(order.items) ? order.items : [];
  // Check if all requirements are present at least once
  const allPresent = reqs.every((r) => countMatches(items, r) > 0);
  if (!allPresent) return order;
  const limit = rule.limitPerOrder || 1;
  // Compute current total for one set by summing the first match per requirement
  let current = 0;
  const usedIndexes = new Set();
  for (const r of reqs) {
    for (let i = 0; i < items.length; i++) {
      if (usedIndexes.has(i)) continue;
      const it = items[i];
      const match = (!r.name || String(it.name).toLowerCase() === String(r.name).toLowerCase()) && (!r.category || String(it.category).toLowerCase() === String(r.category).toLowerCase());
      if (match) { current += Number(it.price || 0); usedIndexes.add(i); break; }
    }
  }
  const desired = Number(rule.price || 0);
  if (!(current > desired)) return order;
  // Add a negative-price adjustment item to bring combo to desired price
  const adj = -(current - desired);
  const t = Math.min(1, limit); // one combo at a time for now
  const nextItems = items.slice();
  for (let i = 0; i < t; i++) {
    nextItems.push({ name: `Combo Adjustment`, price: adj, quantity: 1, _offerAdded: true });
  }
  return { ...order, items: nextItems };
}

export function applyOffersToOrder(order, rules) {
  if (!Array.isArray(rules) || rules.length === 0) return { order: clone(order), applied: [] };
  let out = clone(order);
  const applied = [];
  for (const r of rules) {
    if (!r || r.active === false) continue;
    const beforeTotal = getOrderTotal(out);
    let next = out;
    if (r.type === 'buy_x_get_y') next = applyBuyXGetY(out, r);
    else if (r.type === 'fixed_combo_price') next = applyFixedComboPrice(out, r);
    const afterTotal = getOrderTotal(next);
    const changed = JSON.stringify(next.items) !== JSON.stringify(out.items) || afterTotal !== beforeTotal;
    if (changed) {
      out = next;
      applied.push(r.id || r.name || r.type);
    }
  }
  return { order: out, applied };
}
