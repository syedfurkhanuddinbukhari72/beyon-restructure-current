"use client";

import { useRouter } from "next/router";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { slugify } from "../../utils/slug";

export default function ItemDetail() {
  const router = useRouter();
  const { slug, category } = router.query || {};
  const [menu, setMenu] = useState({});
  const touchStartRef = useRef({ x: 0, y: 0, t: 0 });

  useEffect(() => {
    // Use local menu data directly
    const loadMenu = async () => {
      try {
        const local = (await import("../../data/menuData.json")).default;
        setMenu(local || {});
      } catch (e) {
        console.error("Failed to load local menu data:", e);
      }
    };
    loadMenu();
  }, []);

  const item = useMemo(() => {
    if (!slug) return null;
    const searchCategories = category && category !== "All" ? [category] : Object.keys(menu || {});
    for (const cat of searchCategories) {
      const list = menu[cat] || [];
      const found = list.find((i) => slugify(i.name) === slug);
      if (found) return { ...found, category: cat };
    }
    return null;
  }, [slug, category, menu]);

  const [qty, setQty] = useState(1);

  const addToCart = () => {
    if (!item || !item.inStock) return;
    try {
      const raw = localStorage.getItem("cart");
      const cart = raw ? JSON.parse(raw) : [];
      const idx = cart.findIndex((c) => c.name === item.name);
      if (idx >= 0) {
        cart[idx].quantity += qty;
      } else {
        cart.push({ ...item, quantity: qty });
      }
      localStorage.setItem("cart", JSON.stringify(cart));
    } catch {}
    router.push("/cart");
  };

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading item...
      </div>
    );
  }

  const price = Number(item.price || 0);
  // Placeholder calories if not provided; could be extended in data
  const calories = item.calories || null;

  const onTouchStart = (e) => {
    const t = e.changedTouches?.[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  const onTouchEnd = (e) => {
    const t0 = touchStartRef.current;
    const t1 = e.changedTouches?.[0];
    if (!t1 || !t0.t) return;
    const dx = t1.clientX - t0.x;
    const dy = t1.clientY - t0.y;
    const dt = Date.now() - t0.t;
    const isHorizontal = Math.abs(dx) > Math.abs(dy);
    const fastEnough = dt < 600; // quick swipe
    const farEnough = dx > 60; // right swipe distance
    if (isHorizontal && fastEnough && farEnough) {
      router.back();
    }
  };

  return (
    <div
      className="min-h-screen bg-white flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="text-orange-500 hover:text-orange-600 p-2 rounded-full -ml-2 active:opacity-80"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="font-semibold text-lg text-gray-800">{item.name}</h1>
      </div>

      {/* Hero Image */}
      <div className="relative w-full h-64 bg-gray-200 flex items-center justify-center">
        <span className="text-xs text-gray-500">320x200</span>
        {!item.inStock && (
          <span className="absolute top-3 right-3 bg-gray-500 text-white text-xs rounded px-2 py-1">Out of Stock</span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1">
        {/* Price and calories */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-orange-500 font-semibold text-2xl">₹{price.toFixed(2)}</div>
            <div className="text-sm text-gray-500">{item.category}</div>
          </div>
          {calories ? (
            <div className="text-sm text-gray-600 bg-gray-100 rounded-full px-3 py-1">{calories} kcal</div>
          ) : (
            <div className="text-sm text-gray-400">Calories info coming soon</div>
          )}
        </div>

        {/* Description placeholder aligned with theme */}
        <p className="text-gray-700 leading-relaxed mb-4">
          Delicious {item.name} prepared fresh. Customize your order and add it to your cart.
        </p>

        {/* Quantity and Add to Cart */}
        <div className="flex items-center gap-4">
          <div className="flex items-center border rounded-full overflow-hidden">
            <button
              className="px-3 py-2 text-lg text-gray-600 disabled:text-gray-300"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <div className="px-4 py-2 text-gray-800 font-medium">{qty}</div>
            <button
              className="px-3 py-2 text-lg text-gray-600"
              onClick={() => setQty((q) => q + 1)}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <button
            onClick={addToCart}
            disabled={!item.inStock}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-white font-semibold shadow-md ${
              item.inStock ? "bg-orange-500 hover:bg-orange-600" : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            <span>🛒</span>
            <span>Add to Order</span>
          </button>
        </div>
      </div>

      {/* Bottom safe-area spacing */}
      <div style={{ height: "calc(16px + env(safe-area-inset-bottom))" }} />
    </div>
  );
}
