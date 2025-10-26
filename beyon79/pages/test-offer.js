"use client";

import { useEffect } from "react";

export default function TestOfferPage() {
  useEffect(() => {
    // This is a test script to verify offer application
    // Run this in the browser console to test the offer

    const testOrder = {
      fullCart: [
        {
          name: "Chicken Wrap",
          price: 130,
          quantity: 2,
          isOfferReward: false
        },
        {
          name: "Paneer Burger",
          price: 0,
          quantity: 1,
          isOfferReward: true,
          offerId: "buy2_wrap_get1_paneer"
        }
      ],
      customerName: "Test Customer",
      customerNumber: "9876543210",
      note: "Test order with offer",
      createdAt: new Date().toISOString(),
      id: "test-order-1"
    };

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('manual_latest_order', JSON.stringify(testOrder));
      console.log('Test order saved to localStorage. Refresh the bill page to see the changes.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Test Offer Page</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600">
            This page runs a test script to verify offer application. Check the browser console for logs.
          </p>
          <p className="text-gray-600 mt-4">
            The test order has been saved to localStorage. You can now navigate to the bill page to see the offer applied.
          </p>
        </div>
      </div>
    </div>
  );
}
