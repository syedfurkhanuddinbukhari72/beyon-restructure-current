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
localStorage.setItem('manual_latest_order', JSON.stringify(testOrder));
console.log('Test order saved to localStorage. Refresh the bill page to see the changes.');
