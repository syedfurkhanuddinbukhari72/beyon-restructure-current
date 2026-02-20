import React, { useState, useMemo } from "react";

import { formatItems, getTotal, formatDate, formatDuration, getCustomerName } from "../../helpers/adminFormatters";

const OrderRow = React.memo(function OrderRow({ order, tab, now, onUpdateStatus, onUpdateLocalStatus, onToggleExpand, onDeleteLocalOrder }) {

  const isLocal = order?.source === "local";

  const [showCustomerName, setShowCustomerName] = useState(false);

  const durationEnd = order.readyAt || order.paidAt || order.cancelledAt || order.archivedAt;

  const timer = order.acceptedAt ? formatDuration(order.acceptedAt, durationEnd, now) : "—";

  // ✅ OPTIMIZATION: Memoize expensive calculations
  const formattedItems = useMemo(() => formatItems(order.items), [order.items]);
  const orderTotal = useMemo(() => getTotal(order), [order]);

  // ✅ FIX: Add canonical status resolver
  const displayStatus = typeof order.status === 'string' ? order.status : order.status?.status || 'pending';

  const statusStyle = (() => {
    const s = displayStatus.toLowerCase();
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

  // ✅ FIX: Extract canonical id outside onSet - prefer _id to match OrdersTab
  const orderId = order._id || order.id;

  // 🧪 OPTIONAL: Freeze order in development to detect mutations
  if (process.env.NODE_ENV === 'development') {
    Object.freeze(order);
  }

  if (!orderId) {
    console.error('❌ Missing order id', order);
    // Return a safe fallback component
    return (
      <tr className="border-b border-gray-200 hover:bg-gray-50">
        <td colSpan="6" className="px-4 py-3 text-center text-red-600">
          Error: Missing order ID
        </td>
      </tr>
    );
  }

  const onSet = (status) => {
    console.log('🔄 onSet called with status:', status, 'for order:', orderId);
    console.log('🔄 Current order status:', displayStatus);
    console.log('🔄 Order details:', {
      id: order.id,
      _id: order._id,
      orderId: orderId,
      currentStatus: displayStatus,
      isLocal: isLocal,
      kotCompleted: order.kotCompleted,
      kotId: order.kotId
    });

    console.log('onUpdateLocalStatus type:', typeof onUpdateLocalStatus);
    console.log('onUpdateStatus type:', typeof onUpdateStatus);

    if (isLocal) {
      if (!onUpdateLocalStatus) {
        console.error('onUpdateLocalStatus is not defined!');
        return;
      }

      console.log('Calling onUpdateLocalStatus with:', orderId, status);

      const result = onUpdateLocalStatus(orderId, status);

      console.log('onUpdateLocalStatus returned:', result);

      return result;
    }

    if (!onUpdateStatus) {
      console.error('onUpdateStatus is not defined!');
      return;
    }

    console.log('Calling onUpdateStatus with:', orderId, status);

    const result = onUpdateStatus(orderId, status);

    console.log('onUpdateStatus returned:', result);

    return result;
  };

  const Action = ({ label, title, color, onClick, ariaLabel }) => {

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

      <button title={title} aria-label={ariaLabel || title} onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } }} className={`${base} ${tone}`}>

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

  const renderActions = useMemo(() => {
    const s = displayStatus.toLowerCase();

    if (tab === "Local") {

      return (

        <>

          {/* Show R button only for pending/confirmed/accepted/preparing orders */}
          {["pending", "confirmed", "accepted", "preparing"].includes(s) && (
            <Action label="R" title="Mark Ready" color="green" ariaLabel="Mark order as ready" onClick={(e) => {

              e.stopPropagation();

              console.log('Local tab R button clicked - marking ready:', orderId);

              onSet("ready");

            }} />
          )}

          {/* Show P button only for ready orders */}
          {s === "ready" && (
            <Action label="P" title="Mark Paid" color="emerald" ariaLabel="Mark order as paid" onClick={(e) => {

              e.stopPropagation();

              console.log('Local tab P button clicked - marking paid:', orderId);

              onSet("paid");

            }} />
          )}

          {/* Show A button for paid and ready orders (but not cancelled) */}
          {(s === "paid" || s === "ready") && s !== "cancelled" && (
            <Action label="A" title="Archive" color="gray" ariaLabel="Archive order" onClick={(e) => {

              e.stopPropagation();

              console.log('Local tab A button clicked - archiving:', orderId);

              onSet("archived");

            }} />
          )}

          {/* Show X button only for orders that are not already cancelled or archived */}
          {!["cancelled", "archived"].includes(s) && (
            <Action label="×" title="Cancel Order" color="red" ariaLabel="Cancel order" onClick={(e) => {

              e.stopPropagation();

              console.log('Local tab X button clicked - cancelling order:', orderId, 'current status:', s);

              onSet("cancelled");

            }} />
          )}

        </>

      );

    }

    return (

      <>

        {["pending", "confirmed"].includes(s) && (

          <Action label="✓" title="Accept" color="blue" ariaLabel="Accept order" onClick={(e) => {

            e.stopPropagation();

            console.log('Main tab ✓ button clicked - accepting:', orderId);

            onSet("accepted");

          }} />

        )}

        {["accepted", "preparing"].includes(s) && (

          <Action label="R" title="Mark Ready" color="green" ariaLabel="Mark order as ready" onClick={(e) => {

            e.stopPropagation();

            console.log('Main tab R button clicked - marking ready:', orderId);

            onSet("ready");

          }} />

        )}

        {["accepted", "ready", "delivered"].includes(s) && (

          <Action label="P" title="Mark Paid" color="emerald" ariaLabel="Mark order as paid" onClick={(e) => {

            e.stopPropagation();

            console.log('Main tab P button clicked - marking paid:', orderId);

            onSet("paid");

          }} />

        )}

        {((s === "paid" || s === "cancelled") || (tab === "Ready" && (s === "ready" || s === "delivered"))) && s !== "archived" && (

          <Action label="A" title="Archive" color="gray" ariaLabel="Archive order" onClick={(e) => {

            e.stopPropagation();

            console.log('Main tab A button clicked - archiving:', orderId);

            onSet("archived");

          }} />

        )}

        {/* Debug: Show X button condition */}

        {(() => {

          const shouldShowX = !["archived", "cancelled"].includes(s);

          console.log('X button visibility check:', {

            orderId: orderId,

            currentStatus: s,

            tab: tab,

            shouldShowX: shouldShowX,

            isArchived: s === "archived",

            isCancelled: s === "cancelled"

          });

          return shouldShowX;

        })() && (

            <Action label="×" title="Cancel Order" color="red" ariaLabel="Cancel order" onClick={(e) => {

              e.stopPropagation();

              console.log('X button clicked - cancelling order:', orderId, 'current status:', s);

              onSet("cancelled");

            }} />

          )}

        {/* Print button: uses electronAPI.printReceipt when available, otherwise opens print page */}

        <Action

          label="🖨"

          title="Print Receipt"

          color="default"

          ariaLabel="Print receipt"

          onClick={(e) => {
            e.stopPropagation();

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

  }, [tab, order.status]);

  // ======================================================================

  // RENDERING & JSX RETURN

  // ======================================================================

  return (

    <tr
      className="odd:bg-white even:bg-gray-50 hover:bg-orange-50 transition-colors cursor-pointer"
      onClick={() => onToggleExpand?.(orderId)}
    >

      <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle">

        <div className="relative flex items-center gap-1.5">

          {order.customerNumber ? (

            <a

              href={`tel:${order.customerNumber}`}

              title="Call customer"

              aria-label="Call customer"

              className="w-[26px] h-[26px] inline-grid place-items-center rounded-full bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"

              onClick={(e) => {
                e.stopPropagation();
                setShowCustomerName((v) => !v);
              }}

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

        className="px-2.5 py-2.5 border-b border-gray-200 align-middle whitespace-nowrap overflow-hidden select-none"

        title={formattedItems}

      >

        <span className="flex items-center gap-2 min-w-0">

          <span className="flex-1 min-w-0 truncate align-middle">{formattedItems}</span>

          {isLocal && (

            <span className="flex-none w-[18px] h-[18px] inline-grid place-items-center rounded-full bg-black/10 text-neutral-900 border border-black/20 shadow-sm" title="Local order" aria-label="Local order">

              <svg className="w-[8px] h-[8px] transform translate-x-[0.5px] translate-y-[-0.1px]" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">

                <path d="M3.3 1.5v9h4.4" />

              </svg>

            </span>

          )}

        </span>

      </td>

      <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle font-medium">₹{orderTotal}</td>

      <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle">

        <span className="inline-flex items-center gap-2">

          <span className={`h-5 inline-flex items-center px-2 rounded-full text-[10px] font-semibold ${statusStyle}`}>
            {displayStatus}
          </span>

        </span>

      </td>

      <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle">{formatDate(order.createdAt)}</td>

      <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle font-mono tabular-nums">{timer}</td>

      {tab !== "Archived" && (

        <td className="px-2.5 py-2.5 border-b border-gray-200 align-middle">

          <div className="flex items-center gap-1.5 flex-wrap md:flex-nowrap md:justify-end">{renderActions}</div>

        </td>

      )}

    </tr>

  );

});

export default OrderRow;
