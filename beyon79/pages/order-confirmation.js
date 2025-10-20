"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function OrderConfirmationPage() {
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);
  // Timer for redirecting to menu if no order
  useEffect(() => {
    // Only run once on mount
    const savedOrder = localStorage.getItem("lastOrder");
    if (savedOrder) {
      setOrder(JSON.parse(savedOrder));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Only start countdown if not loading and no order
    if (!loading && !order) {
      setCountdown(5);
      let interval = null;
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            router.replace("/");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [loading, order, router]);
  // Redirect to welcome if user details are missing
  useEffect(() => {
    if (typeof window !== "undefined") {
      const name = localStorage.getItem("userName");
      const phone = localStorage.getItem("userPhone");
      if (!name || !phone) {
        router.replace("/welcome");
      }
    }
  }, [router]);
  // ...existing code...
  const [showMessage, setShowMessage] = useState(false);
  const businessNumber = "917676091371";
  const buttonRef = useRef(null);

  // (Removed duplicate localStorage effect)

  // Hide message after 3 seconds
  useEffect(() => {
    if (showMessage) {
      const timer = setTimeout(() => setShowMessage(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showMessage]);

  return (
    <>
      {/* Floating message at top right */}
        {/* Floating message at top center */}
        <div
          className={`fixed top-4 right-8 bg-green-100 text-green-800 px-6 py-3 rounded-lg font-bold shadow-lg transition-all duration-700 z-50${showMessage ? " show-message" : ""}`}
          style={{
            top: showMessage ? "2em" : "-60px",
            opacity: showMessage ? 1 : 0,
            transition: "top 0.6s cubic-bezier(0.4,0,0.2,1), opacity 0.6s"
          }}
        >
          ✅ Feature coming soon
        </div>
      <div className="flex flex-col min-h-screen p-4 max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-4">Order Confirmation</h1>
        {/* Success Message */}
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center">
            <span className="text-2xl mr-2">✅</span>
            <div>
              <p className="font-bold">Order Placed Successfully!</p>
              <p className="text-sm">Your order has been received and will be processed soon.</p>
            </div>
          </div>
        </div>
        {/* Order Details */}
          {loading ? (
            <div className="flex flex-col min-h-screen items-center justify-center">
              <h2 className="text-2xl font-bold mb-4">Loading...</h2>
            </div>
          ) : order ? (
            <div className="bg-gray-50 p-4 rounded mb-4">
              <p className="mb-2"><strong>Order ID:</strong> {order?._id ?? "-"}</p>
              <p className="mb-2"><strong>Phone:</strong> {order?.customerNumber ?? "-"}</p>
              <p className="mb-2"><strong>Items:</strong></p>
              <ul className="list-disc list-inside mb-4 ml-4">
                {(order?.items ?? []).map((item, idx) => (
                  <li key={idx}>
                    {item.name} x {item.qty || item.quantity} - ₹{item.price * (item.qty || item.quantity)}
                  </li>
                ))}
              </ul>
              <p className="mb-2 font-bold text-lg">Total: ₹{order?.total ?? "-"}</p>
              {order?.note && (
                <p className="mb-2">
                  <strong>Note:</strong> {order.note}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col min-h-screen items-center justify-center">
              <h2 className="text-2xl font-bold mb-4">No order found</h2>
              <p className="mb-4 text-gray-600">Returning to menu in {countdown} seconds...</p>
              <Link href="/" className="bg-black text-white px-4 py-2 rounded">
                Back to Menu
              </Link>
            </div>
          )}
        {/* WhatsApp Button */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <button
            onClick={e => {
              e.preventDefault();
              setShowMessage(true);
            }}
            ref={buttonRef}
            className="whatsapp-btn no-entry-cursor bg-green-500 hover:bg-green-600 text-white px-10 py-2 rounded-xl flex items-center justify-center text-lg font-bold shadow-md transition-all duration-200 hover:cursor-not-allowed w-full max-w-[400px]"
            style={{ minWidth: '260px', minHeight: '38px', letterSpacing: '0.02em' }}
          >
            WhatsApp Order
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-2 rounded-xl flex items-center justify-center text-lg font-bold shadow-md transition-all duration-200 w-full max-w-[400px]"
            style={{ minWidth: '260px', minHeight: '38px', letterSpacing: '0.02em' }}
            onClick={() => {
              router.push('/order-status');
            }}
          >
            <span style={{ marginRight: '0.5em', fontSize: '1.2em' }}>🔎</span>
            Check Order Status Now
          </button>
          <Link href="/" className="bg-black text-white px-10 py-2 rounded-xl flex items-center justify-center text-lg font-bold shadow-md transition-all duration-200 w-full max-w-[400px] text-center" style={{ minWidth: '260px', minHeight: '38px', letterSpacing: '0.02em' }}>
            Back to Menu
          </Link>
        </div>
      </div>
    </>
  );
}
