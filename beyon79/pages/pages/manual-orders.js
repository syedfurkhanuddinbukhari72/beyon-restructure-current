"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLocalOrders } from "../src/localDataService";

export default function ManualOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
                <Link href={`/admin-unified?tab=Local`} className="px-3 py-1.5 rounded bg-orange-500 text-white text-sm hover:bg-orange-600">Go to Admin</Link>
                {/* Bill button: save order to localStorage and open /bill */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      // Normalize items so the bill page can compute prices/quantities reliably
                      const normalized = (o.items || []).map(i => ({
                        name: i.name,
                        // price may be stored under different keys depending on source
                        price: Number(i.price ?? i.unitPrice ?? i.rate ?? 0),
                        // quantity may be under quantity or qty
                        quantity: Number(i.quantity ?? i.qty ?? i.qtyOrdered ?? 1),
                        // preserve offer metadata if present
                        isOfferReward: !!i.isOfferReward,
                        offerPrice: i.offerPrice ?? (i.offer?.price ?? undefined),
                        offerId: i.offerId ?? i.offer?._id ?? undefined,
                      }));
                      const toSave = { fullCart: normalized, total: o.total, createdAt: o.createdAt, id: o._id };
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('manual_latest_order', JSON.stringify(toSave));
                        // navigate to bill viewer
                        window.location.href = '/bill';
                      }
                    } catch (e) {
                      console.warn('Could not save manual_latest_order', e);
                      try { window.location.href = '/bill'; } catch (e2) {/* ignore */}
                    }
                  }}
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
