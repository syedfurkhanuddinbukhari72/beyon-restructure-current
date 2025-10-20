import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

function timeAgo(dateStr) {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return new Date(dateStr).toLocaleString();
}

export default function OrderStatusPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(6);
  const [redirectPath, setRedirectPath] = useState(null); // where to go
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState("");

  // No need to poll for status updates in offline mode - orders are stored locally
  // (Removed duplicate hook declarations)

  // ✅ Step 1: Check user + order
  useEffect(() => {
    const name = localStorage.getItem("userName");
    const phone = localStorage.getItem("userPhone");
    if (!name || !phone) {
      setRedirectPath("/welcome");
      setError("Redirecting to welcome");
      setLoading(false);
      return;
    }
    let userOrders = [];
    try {
      userOrders = JSON.parse(localStorage.getItem("userOrders") || "[]");
    } catch {
      userOrders = [];
    }
    // Migrate lastOrder if needed
    const lastOrder = localStorage.getItem("lastOrder");
    if (lastOrder && userOrders.length === 0) {
      userOrders.push(JSON.parse(lastOrder));
      localStorage.setItem("userOrders", JSON.stringify(userOrders));
    }
    if (userOrders.length === 0) {
      setRedirectPath("/");
      setError("Please place an order first");
      setLoading(false);
      return;
    }
    // Sort by createdAt, latest first
    userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setOrders(userOrders);
    setSelectedOrder(userOrders[0]); // Default to latest
    setLoading(false);
  }, [router]);

  // ✅ Step 2: Handle countdown + redirect
  useEffect(() => {
    if (redirectPath && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
    if (redirectPath && countdown === 0) {
      router.replace(redirectPath);
    }
  }, [redirectPath, countdown, router]);

  // ================== UI ==================

  // Case: Redirecting screens (user/order missing)
  if (redirectPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="bg-gray-100 p-8 rounded-lg shadow-lg text-center">
          {error === "Please place an order first" ? (
            <>
              <h1 className="text-3xl font-bold text-black mb-4">No order found</h1>
              <p className="text-lg text-gray-700 mb-4">Please place an order first.</p>
              <p className="text-gray-600 mb-2">Redirecting to menu in <span className="font-bold">{countdown}</span> seconds...</p>
              <Link href="/" className="bg-black text-white px-4 py-2 rounded inline-block mt-2">Back to Menu</Link>
            </>
          ) : (
            <h1 className="text-3xl font-bold text-black text-center">{error} in ({countdown})</h1>
          )}
        </div>
      </div>
    );
  }

  // Case: Other error
  if (error && !redirectPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-red-600 font-semibold">{error}</p>
      </div>
    );
  }

  // Case: Still loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-700">Loading...</p>
      </div>
    );
  }

  // Case: Show all orders and details
  return (
    <div className="p-6 max-w-2xl mx-auto relative">
      {/* Back to Menu button */}
      <Link href="/" legacyBehavior>
        <a
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'black',
            color: 'white',
            padding: '8px 18px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            textDecoration: 'none',
            zIndex: 10,
            transition: 'background 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.background = '#222'}
          onMouseOut={e => e.currentTarget.style.background = 'black'}
        >
          Back to Menu
        </a>
      </Link>
      <h1 className="text-2xl font-bold mb-4">Your Orders</h1>
      <div className="mb-6">
        {orders.length > 1 && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">Order History</h2>
            <div className="flex flex-col gap-2">
              {orders.map((order, idx) => (
                <button
                  key={order._id || idx}
                  className={`text-left px-4 py-2 rounded border ${selectedOrder?._id === order._id ? "bg-blue-100 border-blue-400" : "bg-white border-gray-300"}`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <span className="font-bold">Order #{order._id}</span> — {order.status} — <span className="text-xs text-gray-600">{timeAgo(order.createdAt)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {selectedOrder && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <p className="mb-2"><strong>Order ID:</strong> {selectedOrder._id ?? "-"}</p>
          <p className="mb-2"><strong>Phone:</strong> {selectedOrder.customerNumber ?? "-"}</p>
          <p className="mb-2"><strong>Status:</strong> {selectedOrder.status ?? "-"}</p>
          <p className="mb-2"><strong>Items:</strong></p>
          <ul className="list-disc list-inside mb-4 ml-4">
            {(selectedOrder.items ?? []).map((item, idx) => (
              <li key={idx}>
                {item.name} x {item.qty || item.quantity} - ₹{item.price * (item.qty || item.quantity)}
              </li>
            ))}
          </ul>
          <p className="mb-2 font-bold text-lg">Total: ₹{selectedOrder.total ?? "-"}</p>
          {selectedOrder.note && (
            <p className="mb-2">
              <strong>Note:</strong> {selectedOrder.note}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">Created: {selectedOrder.createdAt ? timeAgo(selectedOrder.createdAt) : "-"}</p>
          <p className="text-xs text-gray-500">Updated: {selectedOrder.updatedAt ? timeAgo(selectedOrder.updatedAt) : "-"}</p>
        </div>
      )}
    </div>
  );
}
