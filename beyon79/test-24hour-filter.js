/**
 * Test script to verify 24-hour filtering logic
 * This can be run in the browser console or Node.js
 */

// Mock KOTHelpers for testing
const KOTHelpers = {
  isKOTRecent: (kot, hours = 24) => {
    if (!kot || !kot.createdAt) return false;
    const kotDate = new Date(kot.createdAt);
    const timeWindow = new Date(Date.now() - hours * 60 * 60 * 1000);
    return kotDate >= timeWindow;
  },
  
  filterKOTsByTime: (kotData, hours = 24) => {
    if (!kotData || !Array.isArray(kotData)) return [];
    return kotData.filter(kot => KOTHelpers.isKOTRecent(kot, hours));
  },
  
  getKOTAge: (createdAt) => {
    const now = Date.now();
    const created = new Date(createdAt).getTime();
    const elapsed = Math.floor((now - created) / 1000 / 60); // minutes
    
    if (elapsed < 1) return 'Just now';
    if (elapsed < 60) return `${elapsed} minutes ago`;
    
    const hours = Math.floor(elapsed / 60);
    const minutes = elapsed % 60;
    if (hours < 24) {
      return minutes > 0 ? `${hours}h ${minutes}m ago` : `${hours}h ago`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h ago` : `${days}d ago`;
  }
};

// Test data
const testOrders = [
  {
    id: 'KOT-1',
    orderId: 'order-1',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    status: 'pending'
  },
  {
    id: 'KOT-2', 
    orderId: 'order-2',
    createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
    status: 'completed'
  },
  {
    id: 'KOT-3',
    orderId: 'order-3', 
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    status: 'preparing'
  },
  {
    id: 'KOT-4',
    orderId: 'order-4',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours ago
    status: 'completed'
  },
  {
    id: 'KOT-5',
    orderId: 'order-5',
    createdAt: new Date().toISOString(), // Just now
    status: 'pending'
  }
];

// Run tests
console.log('🧪 Testing 24-hour filter logic');
console.log('📊 Original orders:', testOrders.length);

// Test 1: Filter recent orders (within 24 hours)
const recentOrders = KOTHelpers.filterKOTsByTime(testOrders, 24);
console.log('✅ Recent orders (within 24h):', recentOrders.length);
recentOrders.forEach(order => {
  console.log(`  - ${order.id}: ${KOTHelpers.getKOTAge(order.createdAt)}`);
});

// Test 2: Filter orders within 12 hours
const twelveHourOrders = KOTHelpers.filterKOTsByTime(testOrders, 12);
console.log('✅ Orders within 12h:', twelveHourOrders.length);
twelveHourOrders.forEach(order => {
  console.log(`  - ${order.id}: ${KOTHelpers.getKOTAge(order.createdAt)}`);
});

// Test 3: Test individual order checking
console.log('✅ Individual order checks:');
testOrders.forEach(order => {
  const isRecent = KOTHelpers.isKOTRecent(order, 24);
  const age = KOTHelpers.getKOTAge(order.createdAt);
  console.log(`  - ${order.id}: ${age} -> ${isRecent ? 'RECENT' : 'OLD'}`);
});

// Test 4: Edge cases
console.log('✅ Edge case tests:');
const now = new Date().toISOString();
const future = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour in future
const exactly24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Exactly 24 hours ago

const edgeCases = [
  { id: 'NOW', createdAt: now },
  { id: 'FUTURE', createdAt: future },
  { id: 'EXACTLY-24H', createdAt: exactly24h }
];

edgeCases.forEach(testCase => {
  const isRecent = KOTHelpers.isKOTRecent(testCase, 24);
  const age = KOTHelpers.getKOTAge(testCase.createdAt);
  console.log(`  - ${testCase.id}: ${age} -> ${isRecent ? 'RECENT' : 'OLD'}`);
});

console.log('🎉 24-hour filter logic test completed!');

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KOTHelpers, testOrders };
}
