export function formatItems(items) {
  console.log('🔍 formatItems called with:', {
    items,
    itemsType: typeof items,
    isArray: Array.isArray(items),
    itemsLength: items?.length
  });

  if (!items) {
    console.log('🔍 formatItems returning: — (no items)');
    return "—";
  }
  if (typeof items === "string") {
    console.log('🔍 formatItems returning:', items, '(string)');
    return items;
  }
  if (Array.isArray(items)) {
    const result = items
      .map((it) => {
        const name = it?.name || "Item";
        const qty = Number(it?.quantity || it?.qty || 1);
        return qty > 1 ? `${name} x${qty}` : name;
      })
      .join(" • ");
    console.log('🔍 formatItems returning:', result, '(array processed)');
    return result;
  }

  console.log('🔍 formatItems returning: — (fallback)');
  return "—";
}

export function getTotal(order) {
  console.log('🔍 getTotal called with:', {
    order,
    orderType: typeof order,
    hasTotal: 'total' in order,
    hasAmount: 'amount' in order,
    total: order.total,
    amount: order.amount,
    hasItems: Array.isArray(order.items),
    itemsLength: order.items?.length
  });

  if (!order) {
    console.log('🔍 getTotal returning: 0 (no order)');
    return 0;
  }

  // Check all possible total fields
  const direct = order.totalAmount || order.total || order.amount;

  // Handle both number and string number valid values
  if (direct !== undefined && direct !== null && !isNaN(Number(direct))) {
    const val = Number(direct);
    if (val > 0) {
      console.log('🔍 getTotal returning:', val, '(direct value)');
      return val;
    }
  }
  if (Array.isArray(order.items)) {
    const result = order.items.reduce((sum, it) => {
      // Handle unitPrice (KOT) or price (Order)
      const price = Number(it.unitPrice || it.price || 0);
      const qty = Number(it.quantity || it.qty || 1);
      return sum + (price * qty);
    }, 0);
    console.log('🔍 getTotal returning:', result, '(calculated from items)');
    return result;
  }

  console.log('🔍 getTotal returning: 0 (fallback)');
  return 0;
}

export function formatDate(dateLike) {
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

export function formatDuration(startLike, endLike, nowTs = Date.now()) {
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

export function getCustomerName(order) {
  return (
    order?.customerName ||
    order?.name ||
    (order?.customer && (order.customer.name || order.customer.fullName)) ||
    order?._id ||
    ""
  );
}
