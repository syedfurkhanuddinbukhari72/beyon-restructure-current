"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { createOrder } from "@/utils/api";
import { applyOffersToOrder, getOrderTotal } from "@/utils/offersEngine";
// Temporary: use the cleaned component while the original CartScreen.jsx is being repaired
import CartScreen from '@/components/CartScreen';

const businessNumber = "917676091371"; // Your WhatsApp number

// Helper to normalize phone number to E.164 format (India)
function normalizePhone(number) {
  let n = String(number).replace(/\D/g, "");
  if (n.startsWith("91") && n.length === 12) return "+" + n;
  if (n.length === 10) return "+91" + n;
  if (n.startsWith("+91") && n.length === 13) return n;
  return n;
}

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [note, setNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [phone, setPhone] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [rules, setRules] = useState([]);
  const router = useRouter();

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadFromStorage = () => {
      try {
        const savedCart = localStorage.getItem("cart");
        console.log("[cart] load localStorage cart:", savedCart);
        setCart(savedCart ? JSON.parse(savedCart) : []);
      } catch {
        setCart([]);
      }
      const savedNote = localStorage.getItem("note");
      console.log("[cart] load localStorage note:", savedNote);
      if (savedNote) {
        setNote(savedNote);
        setShowNoteInput(true);
      }
      // Auto-fill phone from userPhone if available
      const savedUserPhone = localStorage.getItem("userPhone");
      if (savedUserPhone) {
        setPhone(savedUserPhone);
      } else {
        const savedPhone = localStorage.getItem("phone");
        console.log("[cart] load localStorage phone:", savedPhone);
        if (savedPhone) {
          setPhone(savedPhone);
        }
      }
    };

    loadFromStorage();
    setMounted(true);

    const onVisibility = () => {
      if (document.visibilityState === "visible") loadFromStorage();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Load offers rules from local data
  useEffect(() => {
    const loadRules = async () => {
      try {
        const offersData = (await import("../data/offers.json")).default;
        setRules((offersData || []).filter(r => r && r.active !== false));
      } catch (e) {
        console.warn("Failed to load offers rules:", e);
      }
    };
    loadRules();
  }, []);

  // Save cart to localStorage whenever it changes (after initial load)
  useEffect(() => {
    if (!mounted) return;
    const serialized = JSON.stringify(cart);
    console.log("[cart] save localStorage cart:", serialized);
    localStorage.setItem("cart", serialized);
  }, [cart, mounted]);

  // Save note and phone to localStorage
  useEffect(() => {
    localStorage.setItem("note", note);
  }, [note]);

  useEffect(() => {
    localStorage.setItem("phone", phone);
  }, [phone]);

  // Apply offers to the current cart to compute adjusted items and total
  const { adjustedItems, adjustedTotal, appliedRuleIds } = useMemo(() => {
    try {
      const order = { items: cart.map(it => ({ name: it.name, price: Number(it.price)||0, quantity: Number(it.quantity)||0, category: it.category })) };
      const { order: adjusted, applied } = applyOffersToOrder(order, rules || []);
      return {
        adjustedItems: adjusted.items || [],
        adjustedTotal: getOrderTotal(adjusted),
        appliedRuleIds: applied || []
      };
    } catch {
      const baseTotal = cart.reduce((sum, it) => sum + Number(it.price||0) * Number(it.quantity||0), 0);
      return { adjustedItems: cart, adjustedTotal: baseTotal, appliedRuleIds: [] };
    }
  }, [cart, rules]);

  const cartTotal = adjustedTotal;
  const cartItemCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const removeFromCart = (itemName) => {
    setCart((prevCart) => prevCart.filter((item) => item.name !== itemName));
  };

  const updateQuantity = (itemName, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) =>
          item.name === itemName
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
    setNote("");
    setPhone("");
    setShowNoteInput(false);
    localStorage.removeItem("cart");
    localStorage.removeItem("note");
    localStorage.removeItem("phone");
  };

  const openWhatsAppForOrder = () => {
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }
    // Use adjusted items for message; show offer-added items explicitly
    const itemsList = adjustedItems.map(item => {
      const lineTotal = Number(item.price||0) * Number(item.quantity||0);
      const tag = item._offerAdded ? ' (offer)' : '';
      return `• ${item.name}${tag} x${item.quantity} - ₹${lineTotal}`;
    }).join('\n');
    
    const message = `Hi! I'd like to place an order.

Phone: ${phone || 'Not provided'}

Items:
${itemsList}

Total: ₹${cartTotal}

${note ? `Note: ${note}` : ''}

Please confirm my order. Thank you!`;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const normalizedBusinessNumber = normalizePhone(businessNumber);
    
    if (isMobile) {
      window.location.href = `whatsapp://send?phone=${normalizedBusinessNumber}&text=${encodeURIComponent(message)}`;
    } else {
      window.open(`https://wa.me/${normalizedBusinessNumber}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const placeOrder = async () => {
    if (!phone) {
      alert("Please enter your phone number");
      return;
    }
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    try {
      const orderPayload = {
        customerNumber: phone,
        // Send adjusted items so backend receives the offers-applied view
        items: adjustedItems.map(item => ({ 
          name: item.name, 
          price: Number(item.price), 
          quantity: Number(item.quantity) 
        })),
        total: Number(cartTotal),
        note,
      };
      
      console.log("Sending order payload:", orderPayload);
      console.log("Cart items:", cart);
      
      const orderData = await createOrder(orderPayload);
      // Multi-order mechanism: store all orders in userOrders array
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
      }
      // Add new order, keep only last 20
      userOrders.push(orderData);
      if (userOrders.length > 20) userOrders = userOrders.slice(-20);
      localStorage.setItem("userOrders", JSON.stringify(userOrders));
      localStorage.setItem("lastOrder", JSON.stringify(orderData));

      // Show success notification
      setShowSuccess(true);
      setTimeout(() => {
        clearCart();
        router.push("/order-confirmation");
      }, 2000);
    } catch (error) {
      console.error("Order creation failed:", error);
      alert("❌ " + error.message);
    }
  };

  if (!mounted) {
    return null;
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">

  <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-lg shadow px-6 py-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">Your Cart is Empty</h2>
            <p className="text-gray-600 mb-6 text-center">Add items from the menu to place an order.</p>
            <div className="text-center">
              <Link href="/" className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-md font-medium">
                Back to Menu
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md mx-4">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Order Successful!</h2>
            <p className="text-gray-600 mb-4">Your order has been placed and will be processed soon.</p>
            <p className="text-sm text-gray-500">Redirecting to confirmation page...</p>
          </div>
        </div>
      )}

      {/* header removed — using internal card title */}

      {/* Use CartScreen component for the main cart UI */}
        <CartScreen
        items={cart}
        onRemove={removeFromCart}
        onUpdateQuantity={updateQuantity}
        note={note}
        setNote={setNote}
        showNoteInput={showNoteInput}
        setShowNoteInput={setShowNoteInput}
        phone={phone}
        setPhone={setPhone}
        onPlaceOrder={placeOrder}
        onWhatsApp={openWhatsAppForOrder}
        subtotal={cartTotal}
        itemCount={cartItemCount}
      />
    </>
  );
}
