// Extracted tab and item action tab filtration logic from admin-unified.js

// ✅ Tabs and status constants
export const TABS = [
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
export const ACTIVE_STATUSES = ["pending", "confirmed", "accepted", "preparing"];
export const READY_BACKEND_STATUSES = ["ready", "delivered"];
export const READY_LOCAL_STATUS = "ready";
export const PAID_STATUSES = ["paid"];
export const ARCHIVED_STATUS = "archived";
export const CANCELLED_STATUS = "cancelled";

// Helper function for filtering orders by tab
export function filterOrdersByTab(tab, orders, localOrders) {
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
}

// Action component for order actions
function Action({ label, title, color, onClick }) {
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
}

// Function to render actions based on tab
export function renderOrderActions(order, tab, onSet) {
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
      {/* Print button: uses electronAPI.printReceipt when available, otherwise opens print page */}
      <Action
        label="🖨"
        title="Print Receipt"
        color="default"
        onClick={() => {
          try {
            if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.printReceipt === 'function') {
              // Electron: send order to main process to print
              window.electronAPI.printReceipt(order).then((res) => {
                if (!res || !res.success) console.warn('Print failed', res && res.failureReason);
              });
            } else {
              // Web: open print page with order in query string
              const q = encodeURIComponent(JSON.stringify(order || {}));
              const url = `/print-receipt?order=${q}`;
              window.open(url, '_blank');
            }
          } catch (e) {
            console.error('Print action failed', e);
          }
        }}
      />
    </>
  );
}
