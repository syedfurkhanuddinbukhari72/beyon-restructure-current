"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { getLocalOrders } from "../src/localDataService";

const ADMIN_TABS = ["Active", "Ready", "Paid", "Archived", "Cancelled", "Local", "Products"];
const ACTIVE_STATUSES = ["pending", "confirmed", "accepted", "preparing"];
const READY_STATUSES = ["ready", "delivered"];
const PAID_STATUSES = ["paid"];

export default function ManualOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminTab, setAdminTab] = useState("Products");
  const router = useRouter();

  const resolveAdminTab = useCallback((order) => {
    if (!order) return adminTab || "Active";
    const status = String(order.status || '').toLowerCase();
    const source = order.source || 'local';

    if (source === 'local') {
      if (status === 'ready') return 'Ready';
      if (status === 'paid') return 'Paid';
      if (status === 'archived') return 'Archived';
      if (status === 'cancelled') return 'Cancelled';
      if (status === 'pending' || ACTIVE_STATUSES.includes(status)) return 'Local';
    } else {
      if (ACTIVE_STATUSES.includes(status)) return 'Active';
      if (READY_STATUSES.includes(status)) return 'Ready';
      if (PAID_STATUSES.includes(status)) return 'Paid';
      if (status === 'archived') return 'Archived';
      if (status === 'cancelled') return 'Cancelled';
    }

    return adminTab || 'Active';
  }, [adminTab]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const localOrders = await getLocalOrders();
        const sortedOrders = localOrders.sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        if (mounted) setOrders(sortedOrders);
      } catch (e) {
        if (mounted) setError(e?.message || "Could not load manual orders");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("admin:lastTab");
      if (stored && ADMIN_TABS.includes(stored)) {
        setAdminTab(stored === "Local" ? "Products" : stored);
      }
    } catch (e) {
      console.warn("ManualOrdersPage: could not read admin:lastTab", e);
    }
  }, []);

  // Global keyboard shortcut handler for go_back
  useEffect(() => {
    const handleCustom = (e) => {
      try {
        const payload = e?.detail || {};
        console.log('[manual-orders] handleCustom received payload', payload);
        const action = payload.action;
        if (action === 'go_back') {
          console.log('[manual-orders] going back');
          router.back();
        } else if (action === 'open_bill') {
          console.log('[manual-orders] open_bill -> opening bill');
          router.push('/bill');
        } else if (action === 'print_current') {
          console.log('[manual-orders] print_current -> triggering print');
          // Trigger print for the current bill
          if (orders && orders.length > 0) {
            // Simulate print action - in a real app, this would call a print function
            console.log('Printing current bill data:', orders[0]);
            // For now, just open the bill page with print=true to trigger print
            router.push('/bill?print=true');
          }
        }
      } catch (err) { /* ignore */ }
    };

    // Keyboard shortcut: Shift+C to go to manual order creation page
    const handleKey = (ev) => {
      if (ev.shiftKey && ev.key.toLowerCase() === 'c') {
        ev.preventDefault();
        router.push('/manual-order-complete');
      }
    };

    window.addEventListener('beyon:app-shortcut', handleCustom);
    window.addEventListener('keydown', handleKey);
    // also support the simple global function hook if present
    const origHook = window.onBeyonAppShortcut;
    window.onBeyonAppShortcut = (p) => handleCustom({ detail: p });

    return () => {
      window.removeEventListener('beyon:app-shortcut', handleCustom);
      window.removeEventListener('keydown', handleKey);
      window.onBeyonAppShortcut = origHook;
    };
  }, [router, orders]);

  const handleOpenBill = useCallback((order) => {
    try {
      const normalized = (order.items || []).map((i) => ({
        name: i.name,
        price: Number(i.price ?? i.unitPrice ?? i.rate ?? 0),
        quantity: Number(i.quantity ?? i.qty ?? i.qtyOrdered ?? 1),
        isOfferReward: !!i.isOfferReward,
        offerPrice: i.offerPrice ?? (i.offer?.price ?? undefined),
        offerId: i.offerId ?? i.offer?._id ?? undefined,
      }));

      const rawPhone = order.customerNumber || order.phone || (order.customer && (order.customer.phone || order.customer.number || order.customer.mobile)) || "";

      const toSave = {
        fullCart: normalized,
        total: Number(order.total || 0),
        createdAt: order.createdAt,
        id: order._id,
        customerName: order.customerName || (order.customer && (order.customer.name || order.customer.fullName)) || order.name || "",
        customerNumber: rawPhone,
        note: order.note || order.customerNote || "",
        customer: order.customer || null,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("manual_latest_order", JSON.stringify(toSave));
      }

      void router.push({
        pathname: "/bill",
        query: { cart: JSON.stringify(toSave) },
      });
    } catch (e) {
      console.warn("Could not save manual_latest_order", e);
      void router.push("/bill");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white p-4">
      {/* Header: chevron chip back + title */}
      <nav className="flex items-center mb-3">
        <Link
          href="/manual-order-complete"
          className="inline-flex items-center justify-center px-3.5 py-2 mr-2 rounded-full text-[0.95rem] font-medium bg-gray-200 text-black hover:bg-gray-300 border border-black focus:outline-none focus:ring-1 focus:ring-orange-300"
          title="Back to Manual Order"
          aria-label="Back to Manual Order"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-semibold text-gray-800">Manual Orders</h1>
      </nav>

      {loading ? (
        <div className="text-center text-gray-500 mt-10">Loading…</div>
      ) : error ? (
        <div className="text-center text-red-600 mt-10">{error}</div>
      ) : orders.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">No manual orders yet.</div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o._id} className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">#{o._id?.substring(0,6) || "local"}</div>
                <div className="text-[1.05rem] font-semibold text-black">₹{Number(o.total || 0)}</div>
              </div>
              <div className="text-sm text-gray-800 mt-1">
                {(o.items||[]).map(i => `${i.name}×${i.quantity ?? i.qty ?? 1}`).join(", ")}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {o.createdAt ? new Date(o.createdAt).toLocaleString() : ""}
              </div>
              <div className="flex gap-2 mt-3">
                <Link
                  href={{ pathname: "/admin-unified", query: { tab: resolveAdminTab(o) } }}
                  className="px-3 py-1.5 rounded bg-orange-500 text-white text-sm hover:bg-orange-600"
                >
                  Go to Admin
                </Link>
                {/* Bill button: save order to localStorage and open /bill */}
                <button
                  type="button"
                  onClick={() => handleOpenBill(o)}
                  className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 text-sm hover:bg-gray-300"
                >
                  Bill
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
